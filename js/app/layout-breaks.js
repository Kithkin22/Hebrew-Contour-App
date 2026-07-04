/* Visual discourse breaks — clause/verse layout metadata (spacingAfter) */
const SPACING_AFTER_LEVELS = ['default', 'small', 'medium', 'large'];
const VERSE_SPACING_LEVELS = ['default', 'single', 'oneHalf', 'double'];

function normalizeSpacingAfter(value) {
  const s = String(value || 'default').toLowerCase();
  return SPACING_AFTER_LEVELS.includes(s) ? s : 'default';
}
window.normalizeSpacingAfter = normalizeSpacingAfter;

function normalizeVerseSpacingAfter(value) {
  const s = String(value || 'default');
  if (s === 'onehalf' || s === '1.5') return 'oneHalf';
  return VERSE_SPACING_LEVELS.includes(s) ? s : 'default';
}
window.normalizeVerseSpacingAfter = normalizeVerseSpacingAfter;

function clauseSpacingAfterClass(clause) {
  const level = normalizeSpacingAfter(clause && clause.spacingAfter);
  if (level === 'small') return 'layout-break-sm';
  if (level === 'medium') return 'layout-break-md';
  if (level === 'large') return 'layout-break-lg';
  return '';
}
window.clauseSpacingAfterClass = clauseSpacingAfterClass;

function clauseLayoutClassNames(clause, selected) {
  let cls = 'clause';
  if (selected) cls += ' selected';
  const br = clauseSpacingAfterClass(clause);
  if (br) cls += ' ' + br;
  return cls;
}
window.clauseLayoutClassNames = clauseLayoutClassNames;

function spacingAfterDocxTwips(clause) {
  const level = normalizeSpacingAfter(clause && clause.spacingAfter);
  if (level === 'small') return 240;
  if (level === 'medium') return 480;
  if (level === 'large') return 960;
  return 0;
}
window.spacingAfterDocxTwips = spacingAfterDocxTwips;

function spacingAfterFromBlankLineCount(blankCount) {
  if (blankCount >= 2) return 'large';
  if (blankCount === 1) return 'medium';
  return 'default';
}
window.spacingAfterFromBlankLineCount = spacingAfterFromBlankLineCount;

const WORD_CONTOUR_INDENT_PX = 36;
/** Editor/export pixel width per stored indent level (presentation calibration). */
const CONTOUR_DISPLAY_INDENT_PX = 30;
window.contourDisplayIndentPx = function contourDisplayIndentPx() {
  return CONTOUR_DISPLAY_INDENT_PX;
};
const WORD_IMPORT_INDENT_STEP_PX = 48;
const WORD_INDENT_IMPORT_PREF_KEY = 'hc-import-word-indent';
const WORD_INDENT_MIN_PX = 18;
const WORD_INDENT_GRID_TOLERANCE_PX = 15;

let lastWordLayoutPasteMeta = null;

function parseCssLengthToPx(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'auto' || s === 'inherit') return 0;
  const m = s.match(/^(-?[0-9.]+)\s*(pt|px|in|cm|mm|pc|em|rem|%)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]) || 0;
  const u = m[2] || 'px';
  if (u === 'pt') return n * (96 / 72);
  if (u === 'in') return n * 96;
  if (u === 'cm') return n * (96 / 2.54);
  if (u === 'mm') return n * (96 / 25.4);
  if (u === 'pc') return n * 16;
  if (u === 'em' || u === 'rem') return n * 16;
  return n;
}
window.parseCssLengthToPx = parseCssLengthToPx;

function readStyleLength(style, prop) {
  const re = new RegExp('(?:^|;)\\s*' + prop.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+)', 'i');
  const m = String(style || '').match(re);
  return m ? parseCssLengthToPx(m[1].trim()) : 0;
}

function readMarginTopBlankCount(style) {
  const pt = readStyleLength(style, 'margin-top');
  if (pt >= 18) return 2;
  if (pt >= 8) return 1;
  const mb = readStyleLength(style, 'margin-bottom');
  if (mb >= 18) return 2;
  if (mb >= 8) return 1;
  return 0;
}

function paragraphIsRtl(el, docRtl) {
  const dir = String(el.getAttribute('dir') || '').toLowerCase();
  if (dir === 'rtl') return true;
  if (dir === 'ltr') return false;
  const style = el.getAttribute('style') || '';
  const m = style.match(/direction\s*:\s*(rtl|ltr)/i);
  if (m) return m[1].toLowerCase() === 'rtl';
  return !!docRtl;
}

function extractParagraphIndentPx(el, isRtl) {
  const style = el.getAttribute('style') || '';
  const marginRight = readStyleLength(style, 'margin-right');
  const marginLeft = readStyleLength(style, 'margin-left');
  const paddingRight = readStyleLength(style, 'padding-right');
  const paddingLeft = readStyleLength(style, 'padding-left');
  let textIndent = readStyleLength(style, 'text-indent');
  if (textIndent < 0) textIndent = Math.abs(textIndent);

  const msoRight = readStyleLength(style, 'mso-para-margin-right');
  const msoLeft = readStyleLength(style, 'mso-para-margin-left');

  if (isRtl) {
    return Math.max(
      marginRight + paddingRight + msoRight,
      marginLeft + paddingLeft + msoLeft,
      textIndent
    );
  }
  return Math.max(
    marginLeft + paddingLeft + msoLeft,
    marginRight + paddingRight + msoRight,
    textIndent
  );
}
window.extractParagraphIndentPx = extractParagraphIndentPx;

function normalizePasteLineKey(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseLayoutPasteLines(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const contentLines = [];
  let blankRun = 0;
  lines.forEach(line => {
    if (!String(line).trim()) {
      blankRun++;
      return;
    }
    if (contentLines.length) {
      contentLines[contentLines.length - 1].spacingAfter = spacingAfterFromBlankLineCount(blankRun);
    }
    blankRun = 0;
    contentLines.push({ text: String(line).trim(), spacingAfter: 'default', indent: 0 });
  });
  return contentLines;
}
window.parseLayoutPasteLines = parseLayoutPasteLines;

function wordLayoutLinesToPlainText(lines) {
  const out = [];
  (lines || []).forEach(line => {
    out.push(line.text);
    const sp = normalizeSpacingAfter(line.spacingAfter);
    if (sp === 'medium') out.push('');
    else if (sp === 'large') {
      out.push('');
      out.push('');
    }
  });
  return out.join('\n');
}
window.wordLayoutLinesToPlainText = wordLayoutLinesToPlainText;

function applyWordIndentLevels(contentLines, importIndent) {
  if (!contentLines || !contentLines.length) return;
  if (importIndent === false) {
    contentLines.forEach(l => { l.indent = 0; });
    return;
  }
  const pxVals = contentLines.map(l => l.indentPx || 0);
  const minPx = Math.min(...pxVals);
  contentLines.forEach(l => {
    const rel = Math.max(0, (l.indentPx || 0) - minPx);
    l.indent = rel < WORD_INDENT_MIN_PX ? 0 : Math.round(rel / WORD_IMPORT_INDENT_STEP_PX);
  });
}

function assessWordIndentImport(contentLines) {
  if (!contentLines || !contentLines.length) {
    return { hasIndent: false, ambiguous: false };
  }
  const pxVals = contentLines.map(l => l.indentPx || 0);
  const minPx = Math.min(...pxVals);
  const rel = pxVals.map(v => Math.max(0, v - minPx));
  const hasIndent = rel.some(v => v >= WORD_INDENT_MIN_PX);
  if (!hasIndent) return { hasIndent: false, ambiguous: false };

  let offGrid = 0;
  let indentedCount = 0;
  rel.forEach(v => {
    if (v < WORD_INDENT_MIN_PX) return;
    indentedCount++;
    const rem = v % WORD_IMPORT_INDENT_STEP_PX;
    const dist = Math.min(rem, WORD_IMPORT_INDENT_STEP_PX - rem);
    if (dist > WORD_INDENT_GRID_TOLERANCE_PX) offGrid++;
  });
  const ambiguous = offGrid > 0 && offGrid >= Math.max(1, Math.ceil(indentedCount / 2));
  return { hasIndent: true, ambiguous };
}

function getWordIndentImportPreference() {
  try {
    const v = localStorage.getItem(WORD_INDENT_IMPORT_PREF_KEY);
    if (v === 'yes' || v === 'ignore') return v;
  } catch (e) { /* ignore */ }
  return null;
}
window.getWordIndentImportPreference = getWordIndentImportPreference;

function setWordIndentImportPreference(value) {
  try {
    localStorage.setItem(WORD_INDENT_IMPORT_PREF_KEY, value === 'ignore' ? 'ignore' : 'yes');
  } catch (e) { /* ignore */ }
}
window.setWordIndentImportPreference = setWordIndentImportPreference;

function resolveWordIndentImport(meta, cb) {
  const pref = getWordIndentImportPreference();
  if (pref === 'yes') {
    cb(true);
    return;
  }
  if (pref === 'ignore') {
    cb(false);
    return;
  }
  if (!meta || !meta.hasIndent) {
    cb(false);
    return;
  }
  if (!meta.ambiguous) {
    cb(true);
    return;
  }
  const yes = confirm(
    'Import contour indentation from Word?\n\n'
    + 'Some paragraph indents could not be mapped cleanly to Aleph contour levels.\n'
    + 'Choose OK to import the nearest contour levels, or Cancel to ignore indentation.'
  );
  setWordIndentImportPreference(yes ? 'yes' : 'ignore');
  cb(yes);
}
window.resolveWordIndentImport = resolveWordIndentImport;

function setLastWordLayoutPasteMeta(meta) {
  lastWordLayoutPasteMeta = meta || null;
}
window.setLastWordLayoutPasteMeta = setLastWordLayoutPasteMeta;

function getLastWordLayoutPasteMeta() {
  return lastWordLayoutPasteMeta;
}
window.getLastWordLayoutPasteMeta = getLastWordLayoutPasteMeta;

function clearLastWordLayoutPasteMeta() {
  lastWordLayoutPasteMeta = null;
}
window.clearLastWordLayoutPasteMeta = clearLastWordLayoutPasteMeta;

function mergeWordIndentIntoLines(textLines, meta, importIndent) {
  if (!importIndent || !meta || !Array.isArray(meta.lines) || !meta.lines.length) {
    return textLines;
  }
  if (textLines.length === meta.lines.length) {
    return textLines.map((tl, i) => Object.assign({}, tl, { indent: meta.lines[i].indent || 0 }));
  }
  const byText = new Map();
  meta.lines.forEach(l => {
    const key = normalizePasteLineKey(l.text);
    if (key && !byText.has(key)) byText.set(key, l);
  });
  return textLines.map(tl => {
    const match = byText.get(normalizePasteLineKey(tl.text));
    return match ? Object.assign({}, tl, { indent: match.indent || 0 }) : tl;
  });
}
window.mergeWordIndentIntoLines = mergeWordIndentIntoLines;

function collectWordHtmlBlocks(doc) {
  let blocks = Array.from(doc.body.querySelectorAll('p'));
  if (!blocks.length) {
    blocks = Array.from(doc.body.querySelectorAll('div, li')).filter(el => {
      const txt = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
      return txt && !el.querySelector('p');
    });
  }
  return blocks;
}

function parseWordHtmlLayoutLines(html, opts) {
  opts = opts || {};
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.body) return null;
    const bodyText = doc.body.textContent || '';
    const hasHebrew = /[\u0590-\u05FF]/.test(bodyText);
    const hasGreek = /[\u0370-\u03FF]/.test(bodyText);
    if (!hasHebrew && !hasGreek) return null;

    const bodyDir = String(doc.body.getAttribute('dir') || '').toLowerCase();
    const bodyStyleRtl = /direction\s*:\s*rtl/i.test(doc.body.getAttribute('style') || '');
    const docRtl = opts.isRtl != null ? !!opts.isRtl : (hasHebrew || bodyDir === 'rtl' || bodyStyleRtl);

    const blocks = collectWordHtmlBlocks(doc);
    if (!blocks.length) return null;

    const rawItems = [];
    blocks.forEach(el => {
      const txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const style = el.getAttribute('style') || '';
      if (!txt) {
        rawItems.push({ blank: true });
        return;
      }
      const leadingBlanks = readMarginTopBlankCount(style);
      for (let i = 0; i < leadingBlanks; i++) rawItems.push({ blank: true });
      rawItems.push({
        text: txt,
        indentPx: extractParagraphIndentPx(el, paragraphIsRtl(el, docRtl)),
      });
    });

    const contentLines = [];
    let blankRun = 0;
    rawItems.forEach(item => {
      if (item.blank) {
        blankRun++;
        return;
      }
      if (contentLines.length) {
        contentLines[contentLines.length - 1].spacingAfter = spacingAfterFromBlankLineCount(blankRun);
      }
      blankRun = 0;
      contentLines.push({
        text: item.text,
        spacingAfter: 'default',
        indentPx: item.indentPx || 0,
        indent: 0,
      });
    });

    if (!contentLines.length) return null;

    applyWordIndentLevels(contentLines, true);
    const assessment = assessWordIndentImport(contentLines);

    return {
      lines: contentLines,
      text: wordLayoutLinesToPlainText(contentLines),
      hasIndent: assessment.hasIndent,
      ambiguous: assessment.ambiguous,
    };
  } catch (e) {
    return null;
  }
}
window.parseWordHtmlLayoutLines = parseWordHtmlLayoutLines;

function layoutTextFromWordHtml(html) {
  const parsed = parseWordHtmlLayoutLines(html);
  return parsed ? parsed.text : '';
}
window.layoutTextFromWordHtml = layoutTextFromWordHtml;

function buildVersesFromLayoutPaste(text, ref, language, refs, layoutLines) {
  const contentLines = (layoutLines && layoutLines.length)
    ? layoutLines
    : parseLayoutPasteLines(text);
  if (!contentLines.length) return [];
  const generated = Array.isArray(refs) ? refs : [];
  const usePerLineVerses = generated.length === contentLines.length && generated.length > 1;

  function clauseFromLine(line) {
    const words = tokenizeClauseWords(line.text.split(/\s+/).filter(Boolean), language);
    if (!words.length) return null;
    const clause = { indent: Math.max(0, Math.round(line.indent || 0)), words, ann: {} };
    const level = normalizeSpacingAfter(line.spacingAfter);
    if (level !== 'default') clause.spacingAfter = level;
    return clause;
  }

  if (usePerLineVerses) {
    return contentLines.map((line, i) => {
      const clause = clauseFromLine(line);
      if (!clause) return null;
      return { ref: generated[i], clauses: [clause] };
    }).filter(Boolean);
  }

  const normRef = ref ? normalizePassageRangeRef(ref) : '';
  const verseRef = generated[0] || normRef || 'Pasted passage';
  const clauses = contentLines.map(clauseFromLine).filter(Boolean);
  if (!clauses.length) return [];
  return [{ ref: verseRef, clauses }];
}
window.buildVersesFromLayoutPaste = buildVersesFromLayoutPaste;

function exportLayoutBreakCss() {
  return '.clause{display:block;border-radius:6px;padding:2px 8px;margin:2px 0}'
    + '.clause.layout-break-sm{margin-bottom:18px!important}'
    + '.clause.layout-break-md{margin-bottom:40px!important}'
    + '.clause.layout-break-lg{margin-bottom:72px!important}'
    + '.verse-block{margin-bottom:0}'
    + '.verse-block.verse-spacing-single{margin-bottom:2.1em!important}'
    + '.verse-block.verse-spacing-oneHalf{margin-bottom:3.15em!important}'
    + '.verse-block.verse-spacing-double{margin-bottom:4.2em!important}';
}
window.exportLayoutBreakCss = exportLayoutBreakCss;

function verseSpacingAfterClass(verse) {
  const level = normalizeVerseSpacingAfter(verse && verse.spacingAfter);
  if (level === 'single') return 'verse-spacing-single';
  if (level === 'oneHalf') return 'verse-spacing-oneHalf';
  if (level === 'double') return 'verse-spacing-double';
  return '';
}
window.verseSpacingAfterClass = verseSpacingAfterClass;

function verseBlockClassNames(verse) {
  let cls = 'verse-block';
  const sp = verseSpacingAfterClass(verse);
  if (sp) cls += ' ' + sp;
  return cls;
}
window.verseBlockClassNames = verseBlockClassNames;

function verseSpacingAfterDocxTwips(verse) {
  const level = normalizeVerseSpacingAfter(verse && verse.spacingAfter);
  if (level === 'single') return 480;
  if (level === 'oneHalf') return 720;
  if (level === 'double') return 960;
  return 0;
}
window.verseSpacingAfterDocxTwips = verseSpacingAfterDocxTwips;

function copyVerseLayoutFields(fromVerse, toVerse) {
  if (!fromVerse || !toVerse) return;
  const level = normalizeVerseSpacingAfter(fromVerse.spacingAfter);
  if (level === 'default') delete toVerse.spacingAfter;
  else toVerse.spacingAfter = level;
  if (fromVerse.hideRef) toVerse.hideRef = true;
  else delete toVerse.hideRef;
}
window.copyVerseLayoutFields = copyVerseLayoutFields;

function verseRefHidden(verse) {
  return !!(verse && verse.hideRef);
}
window.verseRefHidden = verseRefHidden;

function formatPassageTitleDisplay(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return '';
  const suffixMatch = raw.match(/\s(\([^)]+\))\s*$/);
  const suffix = suffixMatch ? ' ' + suffixMatch[1] : '';
  const core = suffix ? raw.slice(0, suffixMatch.index).trim() : raw;
  let text = typeof normalizePassageRangeRef === 'function'
    ? normalizePassageRangeRef(core)
    : core;
  if (!text || text === core) text = core;
  text = text.replace(/(\d)\s*-\s*(\d)/g, '$1\u2013$2');
  return text + suffix;
}
window.formatPassageTitleDisplay = formatPassageTitleDisplay;

function passageRefForDisplay() {
  if (state && state.ref && String(state.ref).trim()) return String(state.ref).trim();
  if (state && state.verses && state.verses.length === 1 && state.verses[0].ref) {
    return String(state.verses[0].ref).trim();
  }
  return '';
}
window.passageRefForDisplay = passageRefForDisplay;

function syncContourPassageTitle() {
  const el = document.getElementById('contourPassageTitle');
  const sheet = document.querySelector('.contour-document-sheet');
  if (!el) return;
  const ref = passageRefForDisplay();
  const singleVerse = !!(state && state.verses && state.verses.length === 1);
  if (!state || !state.verses || !state.verses.length || !ref) {
    el.hidden = true;
    el.replaceChildren();
    if (sheet) {
      sheet.classList.remove('contour-document-sheet--titled', 'contour-document-sheet--single-verse');
    }
    return;
  }
  const text = formatPassageTitleDisplay(ref);
  el.replaceChildren();
  const bdi = document.createElement('bdi');
  bdi.className = 'contour-passage-title-text';
  bdi.dir = 'ltr';
  bdi.textContent = text;
  el.appendChild(bdi);
  el.hidden = false;
  if (typeof applyLtrAnnotationInput === 'function') applyLtrAnnotationInput(el);
  if (sheet) {
    sheet.classList.add('contour-document-sheet--titled');
    sheet.classList.toggle('contour-document-sheet--single-verse', singleVerse);
  }
}
window.syncContourPassageTitle = syncContourPassageTitle;

function finalizeDocumentPagePresentation() {
  const ed = document.getElementById('editor');
  if (!ed || !ed.classList.contains('contour-document-page') || !state.verses.length) return;
  const layout = typeof getLanguageLayout === 'function' ? getLanguageLayout() : null;
  if (typeof applyDocumentPageEditorTypography === 'function') {
    applyDocumentPageEditorTypography(ed, layout);
  }
  if (typeof syncContourPassageTitle === 'function') syncContourPassageTitle();
  ed.querySelectorAll('.contour-passage-title').forEach((node) => node.remove());
  if (state.verses.length === 1 && typeof passageRefForDisplay === 'function' && passageRefForDisplay()) {
    ed.querySelectorAll('.verse-ref').forEach((node) => node.remove());
  }
  if (typeof applyPageZoom === 'function') applyPageZoom({ skipPersist: true });
}
window.finalizeDocumentPagePresentation = finalizeDocumentPagePresentation;

function contourPassageTitleHtml(ref) {
  if (!ref || !String(ref).trim()) return '';
  const text = formatPassageTitleDisplay(ref);
  return `<div class="contour-passage-title" dir="ltr">${esc(text)}</div>`;
}
window.contourPassageTitleHtml = contourPassageTitleHtml;

function contourVerseRefHtml(verse, vi, opts) {
  opts = opts || {};
  if (verseRefHidden(verse)) return '';
  if (!opts.parallel && vi === 0 && state && state.verses && state.verses.length === 1 && passageRefForDisplay()) {
    return '';
  }
  const ref = esc(verse.ref || '');
  if (opts.parallel) {
    const picked = !!opts.picked;
    const pane = opts.pane != null ? opts.pane : 0;
    return `<span class="muted parallel-verse-ref parallel-verse-pick${picked ? ' parallel-verse-picked' : ''}" data-pane="${pane}" data-vi="${vi}" title="Click this label, then click a verse label in the other column to line them up on one row">${ref}</span>`;
  }
  return `<div class="muted verse-ref" dir="ltr">${ref}</div>`;
}
window.contourVerseRefHtml = contourVerseRefHtml;

function parallelVerseRefBarHtml(verse, vi, pane, row, picked) {
  const ri = row != null ? row : 0;
  const refPart = verseRefHidden(verse)
    ? `<span class="parallel-verse-ref parallel-verse-pick parallel-verse-ref-compact${picked ? ' parallel-verse-picked' : ''}" data-pane="${pane}" data-vi="${vi}" title="Verse ${vi + 1} (reference hidden) — click to pair with the other column">•</span>`
    : contourVerseRefHtml(verse, vi, { parallel: true, pane, picked });
  return `<div class="parallel-verse-ref-bar${verseRefHidden(verse) ? ' parallel-verse-ref-bar-compact' : ''}" dir="ltr">${pane === 1 ? `<button type="button" class="parallel-nudge-btn" data-row="${ri}" data-gap="${pane}" data-dir="up" title="Move this verse up one row">↑</button>` : ''}${refPart}${pane === 1 ? `<button type="button" class="parallel-nudge-btn" data-row="${ri}" data-gap="${pane}" title="Move this verse down one row">↓</button>` : ''}<button type="button" class="parallel-verse-remove" data-pane="${pane}" data-vi="${vi}" title="Remove this verse from this pane">×</button></div>`;
}
window.parallelVerseRefBarHtml = parallelVerseRefBarHtml;

function copyClauseLayoutFields(fromClause, toClause) {
  if (!fromClause || !toClause) return;
  toClause.indent = fromClause.indent || 0;
  const level = normalizeSpacingAfter(fromClause.spacingAfter);
  if (level === 'default') delete toClause.spacingAfter;
  else toClause.spacingAfter = level;
}
window.copyClauseLayoutFields = copyClauseLayoutFields;

function selectedClauseLoc() {
  if (!state || !state.selected || state.selected.v == null || state.selected.c == null) return null;
  const v = state.selected.v;
  const c = state.selected.c;
  if (!state.verses[v] || !state.verses[v].clauses[c]) return null;
  return { v, c };
}

function setSelectedClauseSpacingAfter(level) {
  const loc = selectedClauseLoc();
  if (!loc) {
    alert('Select a word on the contour line you want to adjust.');
    return;
  }
  markUndo();
  const clause = state.verses[loc.v].clauses[loc.c];
  const norm = normalizeSpacingAfter(level);
  if (norm === 'default') delete clause.spacingAfter;
  else clause.spacingAfter = norm;
  syncStateBundle();
  if (autosaveReady) autoSaveProject();
  render();
}
window.setSelectedClauseSpacingAfter = setSelectedClauseSpacingAfter;

function selectedVerseIndex() {
  if (!state || !state.selected || state.selected.v == null) return null;
  const v = state.selected.v;
  if (!state.verses[v]) return null;
  return v;
}

function setSelectedVerseSpacingAfter(level) {
  const vi = selectedVerseIndex();
  if (vi == null) {
    alert('Select a word in the verse you want to adjust.');
    return;
  }
  markUndo();
  const verse = state.verses[vi];
  const norm = normalizeVerseSpacingAfter(level);
  if (norm === 'default') delete verse.spacingAfter;
  else verse.spacingAfter = norm;
  syncStateBundle();
  if (autosaveReady) autoSaveProject();
  render();
}
window.setSelectedVerseSpacingAfter = setSelectedVerseSpacingAfter;

function toggleSelectedVerseRefHidden() {
  const vi = selectedVerseIndex();
  if (vi == null) {
    alert('Select a word in the verse whose label you want to hide or show.');
    return;
  }
  markUndo();
  const verse = state.verses[vi];
  if (verse.hideRef) delete verse.hideRef;
  else verse.hideRef = true;
  if (typeof syncHideVerseRefsPref === 'function') {
    const allHidden = state.verses.every(v => verseRefHidden(v));
    const noneHidden = state.verses.every(v => !verseRefHidden(v));
    if (allHidden) syncHideVerseRefsPref(true);
    else if (noneHidden) syncHideVerseRefsPref(false);
  }
  syncStateBundle();
  if (autosaveReady) autoSaveProject();
  render();
}
window.toggleSelectedVerseRefHidden = toggleSelectedVerseRefHidden;

function setAllVerseRefsHidden(hidden) {
  if (!state || !state.verses.length) {
    alert('Load text first.');
    return;
  }
  markUndo();
  state.verses.forEach(v => {
    if (hidden) v.hideRef = true;
    else delete v.hideRef;
  });
  if (typeof syncHideVerseRefsPref === 'function') syncHideVerseRefsPref(hidden);
  syncStateBundle();
  if (autosaveReady) autoSaveProject();
  render();
}
window.setAllVerseRefsHidden = setAllVerseRefsHidden;

function updateVisualBreakToolbar() {
  const loc = selectedClauseLoc();
  const level = loc
    ? normalizeSpacingAfter(state.verses[loc.v].clauses[loc.c].spacingAfter)
    : 'default';
  document.querySelectorAll('[data-spacing-after]').forEach(btn => {
    btn.classList.toggle('primary', btn.dataset.spacingAfter === level);
    btn.setAttribute('aria-pressed', btn.dataset.spacingAfter === level ? 'true' : 'false');
  });
  const vi = selectedVerseIndex();
  const verseLevel = vi != null
    ? normalizeVerseSpacingAfter(state.verses[vi].spacingAfter)
    : 'default';
  document.querySelectorAll('[data-verse-spacing-after]').forEach(btn => {
    btn.classList.toggle('primary', btn.dataset.verseSpacingAfter === verseLevel);
    btn.setAttribute('aria-pressed', btn.dataset.verseSpacingAfter === verseLevel ? 'true' : 'false');
  });
  const hideBtn = document.getElementById('toggleVerseRefHidden');
  if (hideBtn) {
    const hidden = vi != null && verseRefHidden(state.verses[vi]);
    hideBtn.classList.toggle('primary', hidden);
    hideBtn.textContent = hidden ? 'Show verse label' : 'Hide verse label';
    hideBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
  }
}
window.updateVisualBreakToolbar = updateVisualBreakToolbar;

function initVisualBreakControls() {
  document.querySelectorAll('[data-spacing-after]').forEach(btn => {
    if (btn.dataset.spacingBound) return;
    btn.dataset.spacingBound = '1';
    btn.onclick = () => setSelectedClauseSpacingAfter(btn.dataset.spacingAfter);
  });
  document.querySelectorAll('[data-verse-spacing-after]').forEach(btn => {
    if (btn.dataset.verseSpacingBound) return;
    btn.dataset.verseSpacingBound = '1';
    btn.onclick = () => setSelectedVerseSpacingAfter(btn.dataset.verseSpacingAfter);
  });
  const hideBtn = document.getElementById('toggleVerseRefHidden');
  if (hideBtn && !hideBtn.dataset.bound) {
    hideBtn.dataset.bound = '1';
    hideBtn.onclick = () => toggleSelectedVerseRefHidden();
  }
  const hideAllBtn = document.getElementById('hideAllVerseRefs');
  if (hideAllBtn && !hideAllBtn.dataset.bound) {
    hideAllBtn.dataset.bound = '1';
    hideAllBtn.onclick = () => setAllVerseRefsHidden(true);
  }
  const showAllBtn = document.getElementById('showAllVerseRefs');
  if (showAllBtn && !showAllBtn.dataset.bound) {
    showAllBtn.dataset.bound = '1';
    showAllBtn.onclick = () => setAllVerseRefsHidden(false);
  }
  updateVisualBreakToolbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualBreakControls);
} else {
  initVisualBreakControls();
}
