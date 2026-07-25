/**
 * Print Layout — publication workspace for Side-by-Side DOCX.
 * Presentation only: edits publicationLayout plain text; never mutates imported Aleph .text or Hebrew.
 *
 * Future-ready: publication.settings may later hold margins, fonts, column widths, verse-number visibility.
 */
(function () {
  'use strict';

  var boundRoot = null;
  var saveFlashTimer = null;
  var lastPersistedByVerse = Object.create(null);

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeText(value) {
    if (typeof normalizePublicationLayoutText === 'function') {
      return normalizePublicationLayoutText(value);
    }
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  function isPrintLayoutView() {
    var tab = document.getElementById('printLayoutTab');
    return !!(tab && !tab.classList.contains('hidden'));
  }

  function publicationSettings() {
    if (typeof ensureAlephPublicationBag === 'function') {
      var pub = ensureAlephPublicationBag();
      return pub && pub.settings ? pub.settings : {};
    }
    return {};
  }

  function verseNumberFromRef(ref) {
    var m = String(ref || '').match(/(\d+)\s*:\s*(\d+)/);
    if (m) return String(+m[2]);
    var bare = String(ref || '').match(/(\d+)\s*$/);
    return bare ? String(+bare[1]) : '';
  }

  function englishTextForPreview(v) {
    if (typeof getSideBySideEnglishForVerse === 'function') {
      return getSideBySideEnglishForVerse(v).text || '';
    }
    if (typeof getAlephTranslationForVerse === 'function') {
      return getAlephTranslationForVerse(v) || '';
    }
    return '';
  }

  function englishToEditableHtml(text) {
    var normalized = normalizeText(text);
    if (!normalized.length) return '<br>';
    return normalized
      .split('\n')
      .map(function (line) {
        return line.length ? esc(line) : '<br>';
      })
      .join('<br>');
  }

  function readPublicationLayoutPlainText(element) {
    if (!element) return '';
    var out = '';
    var BLOCK = { DIV: 1, P: 1, LI: 1, TR: 1, BLOCKQUOTE: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 };

    function walk(node, isRoot) {
      if (!node) return;
      if (node.nodeType === 3) {
        out += (node.nodeValue || '').replace(/\u00a0/g, ' ');
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (tag === 'BR') {
        out += '\n';
        return;
      }
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      var isBlock = !!BLOCK[tag];
      if (isBlock && !isRoot && out.length && !out.endsWith('\n')) out += '\n';
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], false);
      if (isBlock && !isRoot && out.length && !out.endsWith('\n')) out += '\n';
    }

    walk(element, true);
    return normalizeText(out);
  }

  function hebrewClauseHtml(c) {
    var indent = Math.max(0, c.indent || 0);
    var wordsHtml = '';
    (c.words || []).forEach(function (w) {
      if (typeof isMaqafConnector === 'function' && isMaqafConnector(w)) {
        wordsHtml +=
          '<span class="pl-heb-maqaf">' +
          esc(w.text || (typeof MAQAF_CHAR !== 'undefined' ? MAQAF_CHAR : '־')) +
          '</span>';
        return;
      }
      var f = w.format || {};
      var cls = ['pl-heb-word'];
      if (f.bold) cls.push('fmt-bold');
      if (f.italic) cls.push('fmt-italic');
      if (f.underline) cls.push('fmt-underline');
      if (f.doubleUnderline) cls.push('fmt-double-underline');
      if (w.deleted) cls.push('deleted');
      if (w.specials && w.specials.includes('predicate')) cls.push('pred');
      if (w.specials && w.specials.includes('subject')) cls.push('subj');
      var style = '';
      if (w.color) style += 'color:' + esc(w.color) + ';';
      if (f.highlight) style += 'background-color:' + esc(f.highlight) + ';';
      wordsHtml +=
        '<span class="' +
        cls.join(' ') +
        '"' +
        (style ? ' style="' + style + '"' : '') +
        '>' +
        esc(w.text || '') +
        '</span> ';
    });
    return (
      '<div class="pl-heb-line" dir="rtl" style="padding-right:' +
      indent * 1.2 +
      'em">' +
      wordsHtml +
      '</div>'
    );
  }

  function hebrewVerseHtml(v) {
    if (!v || !v.clauses || !v.clauses.length) {
      return '<div class="pl-heb-line" dir="rtl"></div>';
    }
    return v.clauses.map(hebrewClauseHtml).join('');
  }

  function passageTitle() {
    if (typeof contourPassageTitleForExport === 'function') {
      return contourPassageTitleForExport() || (state && state.ref) || '';
    }
    return (state && state.ref) || '';
  }

  function flashSaved() {
    var el = document.getElementById('printLayoutSaveStatus');
    if (!el) return;
    el.textContent = 'Saved';
    el.classList.add('is-visible');
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 1200);
  }

  function insertPlainAtCaret(el, plain) {
    var text = normalizeText(plain);
    el.focus();
    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
      return;
    }
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      el.textContent = (el.textContent || '') + text;
      return;
    }
    var range = sel.getRangeAt(0);
    range.deleteContents();
    var node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertLineBreak(el) {
    el.focus();
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      el.appendChild(document.createElement('br'));
      return;
    }
    var range = sel.getRangeAt(0);
    range.deleteContents();
    var br = document.createElement('br');
    range.insertNode(br);
    if (!br.nextSibling) {
      el.appendChild(document.createElement('br'));
    }
    range.setStartAfter(br);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Persist one verse only — never rebuilds the page. */
  function persistEnglishEditor(el) {
    if (!el || !state || !state.verses) return;
    var vi = +el.dataset.v;
    var v = state.verses[vi];
    if (!v) return;
    var text = readPublicationLayoutPlainText(el);
    if (lastPersistedByVerse[vi] === text) return;
    lastPersistedByVerse[vi] = text;
    if (typeof setPublicationLayoutForVerse === 'function') {
      setPublicationLayoutForVerse(v, text);
    }
    if (typeof syncStateBundle === 'function') syncStateBundle();
    if (typeof autosaveReady !== 'undefined' && autosaveReady && typeof autoSaveProject === 'function') {
      autoSaveProject();
    }
    flashSaved();
  }

  function engTarget(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    return t.closest('.pl-eng[contenteditable="true"]');
  }

  function onRootKeydown(e) {
    var el = engTarget(e);
    if (!el) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      insertLineBreak(el);
      persistEnglishEditor(el);
    }
  }

  function onRootInput(e) {
    var el = engTarget(e);
    if (!el) return;
    persistEnglishEditor(el);
  }

  function onRootBlur(e) {
    var el = engTarget(e);
    if (!el) return;
    persistEnglishEditor(el);
  }

  function onRootPaste(e) {
    var el = engTarget(e);
    if (!el) return;
    e.preventDefault();
    var raw = '';
    try {
      raw = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    } catch (err) {
      raw = '';
    }
    if (!raw && e.clipboardData) {
      try {
        var html = e.clipboardData.getData('text/html') || '';
        if (html && typeof publicationLayoutPlainTextFromHtml === 'function') {
          raw = publicationLayoutPlainTextFromHtml(html);
        }
      } catch (err2) {
        raw = '';
      }
    }
    insertPlainAtCaret(el, raw);
    persistEnglishEditor(el);
  }

  function ensureRootDelegation(root) {
    if (!root || boundRoot === root) return;
    if (boundRoot) {
      boundRoot.removeEventListener('keydown', onRootKeydown);
      boundRoot.removeEventListener('input', onRootInput);
      boundRoot.removeEventListener('focusout', onRootBlur);
      boundRoot.removeEventListener('paste', onRootPaste);
    }
    boundRoot = root;
    // Single delegated listeners — survive sheet rebuilds without stacking.
    root.addEventListener('keydown', onRootKeydown);
    root.addEventListener('input', onRootInput);
    root.addEventListener('focusout', onRootBlur);
    root.addEventListener('paste', onRootPaste);
  }

  function buildVerseRowHtml(v, vi) {
    var eng = englishTextForPreview(v);
    var num = verseNumberFromRef(v.ref);
    var canon = typeof canonicalAlephVerseKey === 'function' ? canonicalAlephVerseKey(v.ref) : v.ref;
    var emptyImported = !(typeof getAlephTranslationForVerse === 'function' && getAlephTranslationForVerse(v).trim());
    var emptyNote = emptyImported
      ? '<div class="pl-eng-empty muted small" dir="ltr">No imported translation for this verse.</div>'
      : '';
    return (
      '<div class="pl-verse-row" data-v="' +
      vi +
      '">' +
      '<div class="pl-eng-col">' +
      emptyNote +
      '<div class="pl-eng" contenteditable="true" spellcheck="true" dir="ltr" data-v="' +
      vi +
      '" data-verse-key="' +
      esc(canon || '') +
      '" aria-label="Publication English for ' +
      esc(v.ref) +
      '">' +
      englishToEditableHtml(eng) +
      '</div></div>' +
      '<div class="pl-num" contenteditable="false" aria-hidden="true">' +
      esc(num) +
      '</div>' +
      '<div class="pl-heb" dir="rtl" contenteditable="false" aria-readonly="true">' +
      hebrewVerseHtml(v) +
      '</div>' +
      '</div>'
    );
  }

  /**
   * Full page rebuild — only on entering Print Layout (or empty-state changes).
   * Never called on keystroke.
   */
  function renderPrintLayout() {
    var root = document.getElementById('printLayoutPage');
    if (!root) return;
    ensureRootDelegation(root);

    var ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('pl-eng') && root.contains(ae)) {
      return;
    }

    lastPersistedByVerse = Object.create(null);

    if (!state || !state.verses || !state.verses.length) {
      root.innerHTML =
        '<div class="pl-empty" dir="ltr"><p><strong>No Contour text loaded.</strong></p>' +
        '<p class="muted">Generate or open a passage, then import an Aleph translation.</p></div>';
      return;
    }
    if (!state.alephTranslations) {
      root.innerHTML =
        '<div class="pl-empty" dir="ltr"><p><strong>No Aleph translation imported.</strong></p>' +
        '<p class="muted">Use File → Import Aleph Translation, then return to Print Layout.</p></div>';
      return;
    }

    // Touch settings bag so future options have a stable home (no UI yet).
    publicationSettings();

    var title = passageTitle();
    var rows = state.verses.map(buildVerseRowHtml).join('');

    root.innerHTML =
      '<div class="pl-sheet" data-pl-engine="side-by-side-docx-v1">' +
      (title ? '<div class="pl-title" dir="ltr">' + esc(title) + '</div>' : '') +
      '<div class="pl-col-legend" dir="ltr" aria-hidden="true">' +
      '<span>English</span><span>Verse</span><span>Hebrew</span>' +
      '</div>' +
      '<div class="pl-table" role="table" aria-label="Publication page">' +
      rows +
      '</div>' +
      '</div>';
  }

  function enterPrintLayoutMode() {
    if (typeof seedPublicationLayoutsFromImport === 'function') {
      seedPublicationLayoutsFromImport();
      if (typeof syncStateBundle === 'function') syncStateBundle();
      if (typeof autosaveReady !== 'undefined' && autosaveReady && typeof autoSaveProject === 'function') {
        autoSaveProject();
      }
    }
    renderPrintLayout();
  }

  function setPrintLayoutActive(on) {
    document.body.classList.toggle('workspace-print-layout', !!on);
    var banner = document.getElementById('printLayoutBanner');
    if (banner) banner.classList.toggle('hidden', !on);
    if (on) enterPrintLayoutMode();
  }

  window.isPrintLayoutView = isPrintLayoutView;
  window.renderPrintLayout = renderPrintLayout;
  window.setPrintLayoutActive = setPrintLayoutActive;
  window.enterPrintLayoutMode = enterPrintLayoutMode;
  window.readPublicationLayoutPlainText = readPublicationLayoutPlainText;
})();
