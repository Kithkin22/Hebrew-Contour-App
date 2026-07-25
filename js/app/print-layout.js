/**
 * Side-by-Side Print Preview — natural-height verse rows (Hebrew | # | English).
 * Consumes composePublicationLayout(); Contour canvas spacing is not used.
 */
(function () {
  'use strict';

  var boundRoot = null;
  var saveFlashTimer = null;
  var lastPersistedByVerse = Object.create(null);
  var lastFocusReturn = null;
  var focusTrapHandler = null;
  var escapeHandler = null;
  var lastComposed = null;

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

  function overlayEl() {
    return document.getElementById('sideBySidePrintPreview');
  }

  function isPrintPreviewOpen() {
    var el = overlayEl();
    return !!(el && !el.classList.contains('hidden') && el.getAttribute('aria-hidden') !== 'true');
  }

  function publicationSettings() {
    if (typeof ensureAlephPublicationBag === 'function') {
      var pub = ensureAlephPublicationBag();
      return pub && pub.settings ? pub.settings : {};
    }
    return {};
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
    var indentPx =
      typeof publicationIndentPx === 'function' ? publicationIndentPx(c) : Math.max(0, (c.indent || 0) * 14);
    var style = indentPx ? 'padding-right:' + indentPx + 'px' : '';
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
      var wcls = ['pl-heb-word'];
      if (f.bold) wcls.push('fmt-bold');
      if (f.italic) wcls.push('fmt-italic');
      if (f.underline) wcls.push('fmt-underline');
      if (f.doubleUnderline) wcls.push('fmt-double-underline');
      if (w.deleted) wcls.push('deleted');
      if (w.specials && w.specials.includes('predicate')) wcls.push('pred');
      if (w.specials && w.specials.includes('subject')) wcls.push('subj');
      var wstyle = '';
      if (w.color) wstyle += 'color:' + esc(w.color) + ';';
      if (f.highlight) wstyle += 'background-color:' + esc(f.highlight) + ';';
      wordsHtml +=
        '<span class="' +
        wcls.join(' ') +
        '"' +
        (wstyle ? ' style="' + wstyle + '"' : '') +
        '>' +
        esc(w.text || '') +
        '</span> ';
    });
    return (
      '<div class="pl-heb-line" dir="rtl"' +
      (style ? ' style="' + esc(style) + '"' : '') +
      '>' +
      wordsHtml +
      '</div>'
    );
  }

  function hebrewRowHtml(row) {
    var clauses = (row.hebrew && (row.hebrew.units || row.hebrew.lines)) || row.hebrewClauses || [];
    if (!clauses.length) return '<div class="pl-heb-line" dir="rtl"></div>';
    return clauses.map(hebrewClauseHtml).join('');
  }

  function passageTitle() {
    if (typeof contourPassageTitleForExport === 'function') {
      return contourPassageTitleForExport() || (state && state.ref) || '';
    }
    return (state && state.ref) || '';
  }

  function flashSaved() {
    var el = document.getElementById('printPreviewSaveStatus');
    if (!el) return;
    el.textContent = 'Saved';
    el.classList.add('is-visible');
    if (saveFlashTimer) clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 1200);
  }

  function updatePageMeta(pageCount) {
    var el = document.getElementById('printPreviewPageMeta');
    if (!el) return;
    var n = pageCount || 0;
    el.textContent = n === 1 ? '1 page' : n + ' pages';
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
    if (!br.nextSibling) el.appendChild(document.createElement('br'));
    range.setStartAfter(br);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function persistEnglishEditor(el) {
    if (!el || !state || !state.verses) return;
    var vi = +el.dataset.v;
    var v = state.verses[vi];
    if (!v) return;
    var text = readPublicationLayoutPlainText(el);
    if (lastPersistedByVerse[vi] === text) return;
    lastPersistedByVerse[vi] = text;
    if (typeof setPublicationLayoutForVerse === 'function') setPublicationLayoutForVerse(v, text);
    if (typeof syncStateBundle === 'function') syncStateBundle();
    if (typeof autosaveReady !== 'undefined' && autosaveReady && typeof autoSaveProject === 'function') {
      autoSaveProject();
    }
    flashSaved();
    recomposeAfterEdit(vi);
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
    root.addEventListener('keydown', onRootKeydown);
    root.addEventListener('input', onRootInput);
    root.addEventListener('focusout', onRootBlur);
    root.addEventListener('paste', onRootPaste);
  }

  function getEnglishForCompose(v) {
    if (typeof getSideBySideEnglishForVerse === 'function') return getSideBySideEnglishForVerse(v);
    return { text: '', preserveLineBreaks: false };
  }

  function composeNow() {
    if (typeof composePublicationLayout !== 'function') {
      return { rows: [], pages: [], metrics: {}, pairing: { ok: true, errors: [], report: [] } };
    }
    return composePublicationLayout({
      verses: (state && state.verses) || [],
      getEnglishForVerse: getEnglishForCompose,
    });
  }

  function pageRows(page) {
    return page.rows || page.blocks || page.segments || [];
  }

  function buildVerseRowHtml(row, editable) {
    var vi = row.verseIndex;
    var eng = row.english && row.english.text != null ? row.english.text : '';
    var num = row.verseNumber || row.verseNumberText || '';
    var verseKey = row.verseKey || row.ref || '';
    var canon =
      typeof canonicalAlephVerseKey === 'function' ? canonicalAlephVerseKey(verseKey) : verseKey;
    var emptyImported = !(
      typeof getAlephTranslationForVerse === 'function' &&
      state &&
      state.verses &&
      state.verses[vi] &&
      getAlephTranslationForVerse(state.verses[vi]).trim()
    );
    var emptyNote =
      emptyImported && editable
        ? '<div class="pl-eng-empty muted small" dir="ltr">No imported translation for this verse.</div>'
        : '';
    var gap = Math.max(0, Math.round(row.spacingAfter || 0));
    var engInner;
    if (editable) {
      engInner =
        emptyNote +
        '<div class="pl-eng" contenteditable="true" spellcheck="true" dir="ltr" data-v="' +
        vi +
        '" data-verse-key="' +
        esc(canon || '') +
        '" aria-label="Publication English for ' +
        esc(verseKey) +
        '">' +
        englishToEditableHtml(eng) +
        '</div>';
    } else {
      engInner = eng
        ? '<div class="pl-eng pl-eng-readonly" dir="ltr">' + englishToEditableHtml(eng) + '</div>'
        : '<div class="pl-eng pl-eng-readonly" dir="ltr"></div>';
    }

    // Hebrew | Verse | English — natural-height invisible row
    return (
      '<div class="pl-verse-row" data-v="' +
      vi +
      '" data-verse-key="' +
      esc(verseKey) +
      '" data-split="' +
      (row.splitPart != null ? row.splitPart : '') +
      '" style="margin-bottom:' +
      gap +
      'px">' +
      '<div class="pl-heb" dir="rtl" contenteditable="false" aria-readonly="true">' +
      hebrewRowHtml(row) +
      '</div>' +
      '<div class="pl-num" contenteditable="false" aria-hidden="true">' +
      esc(num) +
      '</div>' +
      '<div class="pl-eng-col">' +
      engInner +
      '</div>' +
      '</div>'
    );
  }

  function buildPagesHtml(composed) {
    var title = passageTitle();
    var pages = composed.pages || [];
    if (!pages.length) {
      return (
        '<div class="pl-empty" dir="ltr"><p><strong>No Contour text loaded.</strong></p>' +
        '<p class="muted">Generate or open a passage, then import an Aleph translation.</p></div>'
      );
    }
    var editableSeen = Object.create(null);
    return pages
      .map(function (page, pi) {
        var rows = pageRows(page)
          .map(function (row) {
            var editable = false;
            if (row.splitPart == null || row.splitPart === 0) {
              if (!editableSeen[row.verseIndex]) {
                editable = true;
                editableSeen[row.verseIndex] = true;
              }
            }
            return buildVerseRowHtml(row, editable);
          })
          .join('');
        return (
          '<div class="pl-sheet" data-page="' +
          pi +
          '" data-pl-engine="verse-row-heb-num-eng-v1">' +
          (pi === 0 && title
            ? '<div class="pl-title" dir="ltr">' + esc(title) + '</div>'
            : '') +
          '<div class="pl-table" role="table" aria-label="Publication page ' +
          (pi + 1) +
          '">' +
          rows +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderPrintPreview(opts) {
    opts = opts || {};
    var root = document.getElementById('printPreviewPages');
    if (!root) return lastComposed;
    ensureRootDelegation(root);

    var ae = document.activeElement;
    if (
      !opts.force &&
      ae &&
      ae.classList &&
      ae.classList.contains('pl-eng') &&
      root.contains(ae)
    ) {
      return lastComposed;
    }

    lastPersistedByVerse = Object.create(null);

    if (!state || !state.verses || !state.verses.length) {
      root.innerHTML =
        '<div class="pl-empty" dir="ltr"><p><strong>No Contour text loaded.</strong></p>' +
        '<p class="muted">Generate or open a passage, then import an Aleph translation.</p></div>';
      updatePageMeta(0);
      lastComposed = { rows: [], pages: [], metrics: {} };
      return lastComposed;
    }

    publicationSettings();
    lastComposed = composeNow();
    if (lastComposed.pairing && !lastComposed.pairing.ok && lastComposed.pairing.errors.length) {
      console.warn('Side-by-side pairing warnings:', lastComposed.pairing.errors);
    }
    root.innerHTML = buildPagesHtml(lastComposed);
    updatePageMeta((lastComposed.pages && lastComposed.pages.length) || 0);
    return lastComposed;
  }

  function recomposeAfterEdit(focusedVerseIndex) {
    var root = document.getElementById('printPreviewPages');
    if (!root || typeof composePublicationLayout !== 'function') return;
    lastComposed = composeNow();
    updatePageMeta((lastComposed.pages && lastComposed.pages.length) || 0);

    var ae = document.activeElement;
    var focused =
      ae && ae.classList && ae.classList.contains('pl-eng') && root.contains(ae) ? ae : null;
    var focusVi = focused ? +focused.dataset.v : focusedVerseIndex;

    var sheets = root.querySelectorAll('.pl-sheet');
    var pages = lastComposed.pages || [];
    if (sheets.length !== pages.length) return;

    var editableSeen = Object.create(null);
    for (var pi = 0; pi < pages.length; pi++) {
      var sheet = sheets[pi];
      if (!sheet) continue;
      var rows = pageRows(pages[pi]);
      var touchesFocus = rows.some(function (r) {
        return r.verseIndex === focusVi && (r.splitPart == null || r.splitPart === 0);
      });
      if (touchesFocus && focused) continue;

      var html = rows
        .map(function (row) {
          var editable = false;
          if (row.splitPart == null || row.splitPart === 0) {
            if (!editableSeen[row.verseIndex]) {
              editable = true;
              editableSeen[row.verseIndex] = true;
            }
          }
          return buildVerseRowHtml(row, editable);
        })
        .join('');
      var table = sheet.querySelector('.pl-table');
      if (table) table.innerHTML = html;
    }
  }

  function getFocusableInOverlay(dialog) {
    if (!dialog) return [];
    return Array.prototype.slice
      .call(
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"]',
        ),
      )
      .filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
  }

  function installFocusTrap(dialog) {
    removeFocusTrap();
    focusTrapHandler = function (e) {
      if (e.key !== 'Tab' || !isPrintPreviewOpen()) return;
      var nodes = getFocusableInOverlay(dialog);
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    escapeHandler = function (e) {
      if (e.key === 'Escape' && isPrintPreviewOpen()) {
        e.preventDefault();
        closeSideBySidePrintPreview();
      }
    };
    document.addEventListener('keydown', focusTrapHandler, true);
    document.addEventListener('keydown', escapeHandler, true);
  }

  function removeFocusTrap() {
    if (focusTrapHandler) {
      document.removeEventListener('keydown', focusTrapHandler, true);
      focusTrapHandler = null;
    }
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler, true);
      escapeHandler = null;
    }
  }

  function openSideBySidePrintPreview(opts) {
    opts = opts || {};
    var dialog = overlayEl();
    if (!dialog) return null;

    if (typeof seedPublicationLayoutsFromImport === 'function') {
      seedPublicationLayoutsFromImport();
      if (typeof syncStateBundle === 'function') syncStateBundle();
      if (typeof autosaveReady !== 'undefined' && autosaveReady && typeof autoSaveProject === 'function') {
        autoSaveProject();
      }
    }

    lastFocusReturn = opts.focusReturn || document.activeElement;
    dialog.classList.remove('hidden');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('print-preview-open');
    renderPrintPreview({ force: true });
    installFocusTrap(dialog);
    var closeBtn = document.getElementById('printPreviewCloseBtn');
    if (closeBtn) closeBtn.focus();
    else dialog.focus();
    return lastComposed;
  }

  function closeSideBySidePrintPreview() {
    var dialog = overlayEl();
    if (!dialog) return;
    removeFocusTrap();
    dialog.classList.add('hidden');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('print-preview-open');
    var restore = lastFocusReturn;
    lastFocusReturn = null;
    if (restore && typeof restore.focus === 'function') {
      try {
        restore.focus();
      } catch (e) {}
    }
  }

  function exportFromPrintPreview() {
    if (typeof downloadSideBySideDocxFromComposer === 'function') {
      downloadSideBySideDocxFromComposer();
      return;
    }
    if (typeof exportContourSideBySideDocx === 'function') {
      exportContourSideBySideDocx({ fromPreview: true, skipPreview: true });
    }
  }

  function bindPreviewChrome() {
    var closeBtn = document.getElementById('printPreviewCloseBtn');
    var exportBtn = document.getElementById('printPreviewExportBtn');
    if (closeBtn && !closeBtn._plBound) {
      closeBtn._plBound = true;
      closeBtn.addEventListener('click', closeSideBySidePrintPreview);
    }
    if (exportBtn && !exportBtn._plBound) {
      exportBtn._plBound = true;
      exportBtn.addEventListener('click', exportFromPrintPreview);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPreviewChrome);
  } else {
    bindPreviewChrome();
  }

  window.isPrintPreviewOpen = isPrintPreviewOpen;
  window.openSideBySidePrintPreview = openSideBySidePrintPreview;
  window.closeSideBySidePrintPreview = closeSideBySidePrintPreview;
  window.renderPrintPreview = renderPrintPreview;
  window.getLastComposedPublicationLayout = function () {
    return lastComposed;
  };
  window.readPublicationLayoutPlainText = readPublicationLayoutPlainText;
  window.isPrintLayoutView = isPrintPreviewOpen;
  window.renderPrintLayout = function () {
    return renderPrintPreview({ force: true });
  };
  window.setPrintLayoutActive = function (on) {
    if (on) openSideBySidePrintPreview();
    else closeSideBySidePrintPreview();
  };
  window.enterPrintLayoutMode = openSideBySidePrintPreview;
})();
