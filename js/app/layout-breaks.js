/* Visual discourse breaks — clause/verse layout metadata (spacingAfter) */
const SPACING_AFTER_LEVELS = ['compact', 'default', 'small', 'medium', 'large'];
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
  if (level === 'compact') return 'layout-break-compact';
  if (level === 'small') return 'layout-break-sm';
  if (level === 'medium') return 'layout-break-md';
  if (level === 'large') return 'layout-break-lg';
  return '';
}
window.clauseSpacingAfterClass = clauseSpacingAfterClass;

function clauseLayoutClassNames(clause, selected) {
  let cls = 'clause';
  if (selected) cls += ' selected';
  const px = clauseSpacingAfterPx(clause);
  if (typeof (clause && clause.spacingAfterPx) === 'number'
    && px !== -8 && px !== 18 && px !== 40 && px !== 72 && px !== 0) {
    return cls;
  }
  if (px < 0 || normalizeSpacingAfter(clause && clause.spacingAfter) === 'compact') {
    cls += ' layout-break-compact';
  } else if (px === 18 || normalizeSpacingAfter(clause && clause.spacingAfter) === 'small') {
    cls += ' layout-break-sm';
  } else if (px === 40 || normalizeSpacingAfter(clause && clause.spacingAfter) === 'medium') {
    cls += ' layout-break-md';
  } else if (px === 72 || normalizeSpacingAfter(clause && clause.spacingAfter) === 'large') {
    cls += ' layout-break-lg';
  } else {
    const br = clauseSpacingAfterClass(clause);
    if (br) cls += ' ' + br;
  }
  return cls;
}
window.clauseLayoutClassNames = clauseLayoutClassNames;

function contourTabIndentStepPx() {
  return (window.CONTOUR_PAGE && window.CONTOUR_PAGE.displayIndentPx)
    || (typeof contourDisplayIndentPx === 'function' ? contourDisplayIndentPx() : 30);
}
window.contourTabIndentStepPx = contourTabIndentStepPx;

function spacingAfterPxFromLevel(level) {
  const norm = normalizeSpacingAfter(level);
  if (norm === 'default') return 0;
  if (typeof contourBreakDocxTwips === 'function') {
    return contourBreakDocxTwips(norm) / 15;
  }
  const px = window.CONTOUR_PAGE && window.CONTOUR_PAGE.breakPx && window.CONTOUR_PAGE.breakPx[norm];
  if (px) return px;
  if (norm === 'small') return 18;
  if (norm === 'medium') return 40;
  if (norm === 'large') return 72;
  return 0;
}
window.spacingAfterPxFromLevel = spacingAfterPxFromLevel;

function clauseIndentPx(clause) {
  if (!clause) return 0;
  if (typeof clause.indentPx === 'number' && !Number.isNaN(clause.indentPx)) {
    return Math.max(0, Math.round(clause.indentPx));
  }
  return Math.max(0, (clause.indent || 0) * contourTabIndentStepPx());
}
window.clauseIndentPx = clauseIndentPx;

function setClauseIndentPx(clause, px) {
  if (!clause) return;
  const rounded = Math.max(0, Math.round(px));
  clause.indentPx = rounded;
  const step = contourTabIndentStepPx();
  clause.indent = step > 0 ? Math.round(rounded / step) : 0;
}
window.setClauseIndentPx = setClauseIndentPx;

function clauseSpacingAfterPx(clause) {
  if (!clause) return 0;
  if (typeof clause.spacingAfterPx === 'number') {
    return Math.round(clause.spacingAfterPx);
  }
  return spacingAfterPxFromLevel(clause && clause.spacingAfter);
}
window.clauseSpacingAfterPx = clauseSpacingAfterPx;

function setClauseSpacingAfterPx(clause, px) {
  if (!clause) return;
  const rounded = Math.round(px);
  if (rounded === 0) {
    delete clause.spacingAfterPx;
    delete clause.spacingAfter;
    return;
  }
  clause.spacingAfterPx = rounded;
  const presets = [
    ['compact', -8],
    ['small', 18],
    ['medium', 40],
    ['large', 72],
  ];
  const match = presets.find(([, v]) => Math.abs(v - rounded) < 1);
  if (match) clause.spacingAfter = match[0];
  else delete clause.spacingAfter;
}
window.setClauseSpacingAfterPx = setClauseSpacingAfterPx;

/** Word-like Enter: default/small → medium → large → large */
function stepClauseSpacingAfterUp(clause) {
  if (!clause) return;
  const px = clauseSpacingAfterPx(clause);
  if (px >= 72) setClauseSpacingAfterPx(clause, 72);
  else if (px >= 40) setClauseSpacingAfterPx(clause, 72);
  else setClauseSpacingAfterPx(clause, 40);
}
window.stepClauseSpacingAfterUp = stepClauseSpacingAfterUp;

/** Word-like Backspace: large → medium → default; small/custom → default */
function stepClauseSpacingAfterDown(clause) {
  if (!clause) return false;
  const px = clauseSpacingAfterPx(clause);
  if (px <= 0) return false;
  if (px >= 72) setClauseSpacingAfterPx(clause, 40);
  else setClauseSpacingAfterPx(clause, 0);
  return true;
}
window.stepClauseSpacingAfterDown = stepClauseSpacingAfterDown;

function stepVerseSpacingAfterUp(verse) {
  if (!verse) return;
  const norm = normalizeVerseSpacingAfter(verse.spacingAfter);
  const idx = VERSE_SPACING_LEVELS.indexOf(norm);
  const next = VERSE_SPACING_LEVELS[Math.min(idx + 1, VERSE_SPACING_LEVELS.length - 1)];
  if (next === 'default') delete verse.spacingAfter;
  else verse.spacingAfter = next;
}
window.stepVerseSpacingAfterUp = stepVerseSpacingAfterUp;

function stepVerseSpacingAfterDown(verse) {
  if (!verse) return false;
  const norm = normalizeVerseSpacingAfter(verse.spacingAfter);
  const idx = VERSE_SPACING_LEVELS.indexOf(norm);
  if (idx <= 0) return false;
  const prev = VERSE_SPACING_LEVELS[idx - 1];
  if (prev === 'default') delete verse.spacingAfter;
  else verse.spacingAfter = prev;
  return true;
}
window.stepVerseSpacingAfterDown = stepVerseSpacingAfterDown;

function clauseLayoutDir(clause, layout) {
  if (clause && clause.alignment === 'rtl') return 'rtl';
  if (clause && clause.alignment === 'ltr') return 'ltr';
  return layout && layout.dir ? layout.dir : 'rtl';
}
window.clauseLayoutDir = clauseLayoutDir;

function clauseLayoutStyle(clause, layout) {
  const dir = clauseLayoutDir(clause, layout);
  const align = dir === 'rtl' ? 'right' : 'left';
  const side = layout.indentSide === 'left' ? 'margin-left' : 'margin-right';
  let style = `${side}:${clauseIndentPx(clause)}px`;
  const spPx = clauseSpacingAfterPx(clause);
  const presetPx = [-8, 18, 40, 72];
  const useClass = typeof clause.spacingAfterPx !== 'number'
    || presetPx.includes(spPx);
  if (spPx !== 0 && !useClass) style += `;margin-bottom:${spPx}px`;
  style += `;direction:${dir};text-align:${align};font-family:${layout.fontFamily}`;
  return style;
}
window.clauseLayoutStyle = clauseLayoutStyle;

function spacingAfterDocxTwips(clause) {
  const px = clauseSpacingAfterPx(clause);
  if (px === 0) return 0;
  if (typeof contourPxToDocxTwips === 'function') return contourPxToDocxTwips(px);
  return Math.round(px * 15);
}
window.spacingAfterDocxTwips = spacingAfterDocxTwips;

function contourIndentDocxTwipsForClause(clause) {
  const px = clauseIndentPx(clause);
  if (typeof contourPxToDocxTwips === 'function') return contourPxToDocxTwips(px);
  return Math.round(px * 15);
}
window.contourIndentDocxTwipsForClause = contourIndentDocxTwipsForClause;

function spacingAfterFromBlankLineCount(blankCount) {
  if (blankCount >= 2) return 'large';
  if (blankCount === 1) return 'medium';
  return 'default';
}
window.spacingAfterFromBlankLineCount = spacingAfterFromBlankLineCount;

const WORD_CONTOUR_INDENT_PX = 36;
/** Editor/export pixel width per stored indent level (presentation calibration). */
/* display indent px: see js/app/contour-page-renderer.js (contourDisplayIndentPx) */
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

  let indent;
  if (isRtl) {
    indent = Math.max(
      marginRight + paddingRight + msoRight,
      marginLeft + paddingLeft + msoLeft,
      textIndent
    );
  } else {
    indent = Math.max(
      marginLeft + paddingLeft + msoLeft,
      marginRight + paddingRight + msoRight,
      textIndent
    );
  }
  if (indent > 0 || !el || typeof getComputedStyle !== 'function') return indent;
  const cs = getComputedStyle(el);
  const csMarginRight = parseCssLengthToPx(cs.marginRight);
  const csMarginLeft = parseCssLengthToPx(cs.marginLeft);
  const csPaddingRight = parseCssLengthToPx(cs.paddingRight);
  const csPaddingLeft = parseCssLengthToPx(cs.paddingLeft);
  let csTextIndent = parseCssLengthToPx(cs.textIndent);
  if (csTextIndent < 0) csTextIndent = Math.abs(csTextIndent);
  if (isRtl) {
    return Math.max(
      csMarginRight + csPaddingRight,
      csMarginLeft + csPaddingLeft,
      csTextIndent
    );
  }
  return Math.max(
    csMarginLeft + csPaddingLeft,
    csMarginRight + csPaddingRight,
    csTextIndent
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
      const level = spacingAfterFromBlankLineCount(blankRun);
      contentLines[contentLines.length - 1].spacingAfter = level;
      const spPx = spacingAfterPxFromLevel(level);
      if (spPx > 0) contentLines[contentLines.length - 1].spacingAfterPx = spPx;
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

function extractParagraphSpacingPx(style) {
  const mb = readStyleLength(style, 'margin-bottom');
  const mt = readStyleLength(style, 'margin-top');
  const msoMb = readStyleLength(style, 'mso-margin-bottom-alt');
  const lh = readStyleLength(style, 'line-height');
  return Math.max(mb + mt, msoMb, lh > 0 ? lh : 0);
}

function blankRunSpacingPx(blankRun, blankItems) {
  const preset = spacingAfterPxFromLevel(spacingAfterFromBlankLineCount(blankRun));
  if (blankRun <= 0) return 0;
  let measured = 0;
  (blankItems || []).forEach(item => { measured += item.spacingPx || 0; });
  if (measured > preset) return Math.round(measured);
  return preset;
}

function preserveWordIndentPx(contentLines, importIndent) {
  if (!contentLines || !contentLines.length) return;
  if (importIndent === false) {
    contentLines.forEach(l => {
      l.indentPx = 0;
      l.indent = 0;
    });
    return;
  }
  const pxVals = contentLines.map(l => l.indentPx || 0);
  const minPx = Math.min(...pxVals);
  contentLines.forEach(l => {
    const rel = Math.max(0, (l.indentPx || 0) - minPx);
    l.indentPx = rel < WORD_INDENT_MIN_PX ? 0 : Math.round(rel);
    l.indent = 0;
  });
}

function applyWordIndentLevels(contentLines, importIndent) {
  preserveWordIndentPx(contentLines, importIndent);
}

function assessWordIndentImport(contentLines) {
  if (!contentLines || !contentLines.length) {
    return { hasIndent: false, ambiguous: false };
  }
  const pxVals = contentLines.map(l => l.indentPx || 0);
  const minPx = Math.min(...pxVals);
  const hasIndent = pxVals.some(v => Math.max(0, v - minPx) >= WORD_INDENT_MIN_PX);
  return { hasIndent, ambiguous: false };
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
    + 'Choose OK to preserve Word paragraph indents as pixel layout, or Cancel to ignore indentation.'
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

let pendingPasteClipboardHtml = '';
let pasteBoxProgrammaticUpdate = false;

function setPasteBoxProgrammaticUpdate(flag) {
  pasteBoxProgrammaticUpdate = !!flag;
}
window.setPasteBoxProgrammaticUpdate = setPasteBoxProgrammaticUpdate;

function inspectPasteClipboard(html, plain, isRtl) {
  const hasHtml = !!(html && String(html).trim());
  const hasPlain = !!(plain && String(plain).trim());
  let parsed = null;
  if (hasHtml) parsed = parseWordHtmlLayoutLines(html, { isRtl });
  const hasWordLayout = !!(parsed && parsed.hasIndent);
  const hasWordSpacing = !!(parsed && parsed.lines && parsed.lines.some(l => {
    const sp = l.spacingAfter || 'default';
    return sp === 'medium' || sp === 'large' || (l.spacingAfterPx || 0) > 0;
  }));
  let statusKind = 'empty';
  let statusMessage = '';
  if (hasWordLayout) {
    statusKind = 'word-layout';
    statusMessage = 'Word layout detected';
  } else if (hasHtml && parsed) {
    statusKind = 'html-no-layout';
    statusMessage = 'HTML detected but no Word layout';
  } else if (hasPlain) {
    statusKind = 'plain-only';
    statusMessage = 'Plain text only — exact indentation cannot be imported';
  }
  return {
    hasHtml,
    hasPlain,
    parsed,
    hasWordLayout,
    hasWordSpacing,
    statusKind,
    statusMessage,
  };
}
window.inspectPasteClipboard = inspectPasteClipboard;

function updatePasteLayoutStatus(message, kind) {
  const el = document.getElementById('pasteLayoutStatus');
  if (el) {
    el.textContent = message || '';
    el.dataset.status = kind || '';
    el.classList.toggle('hidden', !message);
  }
}
window.updatePasteLayoutStatus = updatePasteLayoutStatus;

function capturePasteFromClipboard(html, plain, options) {
  options = options || {};
  const isRtl = options.isRtl !== false;
  pendingPasteClipboardHtml = html || '';
  const diag = inspectPasteClipboard(html, plain, isRtl);
  if (diag.parsed && diag.parsed.text) setLastWordLayoutPasteMeta(diag.parsed);
  else clearLastWordLayoutPasteMeta();
  updatePasteLayoutStatus(diag.statusMessage, diag.statusKind);
  return diag;
}
window.capturePasteFromClipboard = capturePasteFromClipboard;

function markPasteBoxEditedByUser() {
  if (pasteBoxProgrammaticUpdate) return;
  if (!pendingPasteClipboardHtml && !lastWordLayoutPasteMeta) return;
  pendingPasteClipboardHtml = '';
  clearLastWordLayoutPasteMeta();
  updatePasteLayoutStatus(
    'Layout metadata cleared because pasted text was edited.',
    'cleared'
  );
}
window.markPasteBoxEditedByUser = markPasteBoxEditedByUser;

function clearPendingPasteClipboard() {
  pendingPasteClipboardHtml = '';
  clearLastWordLayoutPasteMeta();
  updatePasteLayoutStatus('', '');
}
window.clearPendingPasteClipboard = clearPendingPasteClipboard;

function getStoredPasteClipboardHtml() {
  return pendingPasteClipboardHtml;
}
window.getStoredPasteClipboardHtml = getStoredPasteClipboardHtml;

function ensurePendingPasteLayoutMeta(isRtl) {
  if (lastWordLayoutPasteMeta) return lastWordLayoutPasteMeta;
  if (!pendingPasteClipboardHtml) return null;
  const parsed = parseWordHtmlLayoutLines(pendingPasteClipboardHtml, { isRtl });
  if (parsed && parsed.text) {
    setLastWordLayoutPasteMeta(parsed);
    return parsed;
  }
  return null;
}
window.ensurePendingPasteLayoutMeta = ensurePendingPasteLayoutMeta;

function getPendingPasteLayoutLines(importIndent, isRtl) {
  if (!pendingPasteClipboardHtml) return null;
  const meta = ensurePendingPasteLayoutMeta(isRtl);
  if (!meta || !meta.lines || !meta.lines.length) return null;
  if (importIndent) return meta.lines.map(l => Object.assign({}, l));
  return meta.lines.map(l => Object.assign({}, l, { indentPx: 0, indent: 0 }));
}
window.getPendingPasteLayoutLines = getPendingPasteLayoutLines;

function formatPasteWithLayoutSummary(verseCount, meta, importIndent, usedStoredHtml) {
  const parts = ['Imported ' + verseCount + ' line' + (verseCount === 1 ? '' : 's')];
  if (usedStoredHtml && meta) {
    parts.push('Word layout: detected');
    parts.push('Imported indents: ' + (importIndent && meta.hasIndent ? 'yes' : 'no'));
    const hasSpacing = meta.lines && meta.lines.some(l => {
      const sp = l.spacingAfter || 'default';
      return sp === 'medium' || sp === 'large' || (l.spacingAfterPx || 0) > 0;
    });
    parts.push('Imported spacing: ' + (hasSpacing ? 'yes' : 'no'));
  } else {
    parts.push('Word layout: not available');
    parts.push('Imported indents: no');
    parts.push('Imported spacing: no');
  }
  return parts.join(' · ');
}
window.formatPasteWithLayoutSummary = formatPasteWithLayoutSummary;

function mergeLayoutFieldsIntoLine(tl, src) {
  const out = Object.assign({}, tl);
  if (src.indentPx != null) out.indentPx = src.indentPx;
  if (src.spacingAfterPx != null) out.spacingAfterPx = src.spacingAfterPx;
  if (src.alignment) out.alignment = src.alignment;
  if (src.spacingAfter) out.spacingAfter = src.spacingAfter;
  if (src.indent != null) out.indent = src.indent;
  return out;
}

function mergeWordIndentIntoLines(textLines, meta, importIndent) {
  if (!importIndent || !meta || !Array.isArray(meta.lines) || !meta.lines.length) {
    return textLines;
  }
  if (textLines.length === meta.lines.length) {
    return textLines.map((tl, i) => mergeLayoutFieldsIntoLine(tl, meta.lines[i]));
  }
  const byText = new Map();
  meta.lines.forEach(l => {
    const key = normalizePasteLineKey(l.text);
    if (key && !byText.has(key)) byText.set(key, l);
  });
  return textLines.map(tl => {
    const match = byText.get(normalizePasteLineKey(tl.text));
    return match ? mergeLayoutFieldsIntoLine(tl, match) : tl;
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

function mountWordHtmlForParsing(html) {
  if (typeof document === 'undefined' || !html) return null;
  const host = document.createElement('div');
  host.className = 'hc-word-paste-mount';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:816px;visibility:hidden;pointer-events:none;overflow:hidden;height:0';
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

function unmountWordHtml(host) {
  if (host && host.parentNode) host.parentNode.removeChild(host);
}

function parseWordHtmlLayoutLines(html, opts) {
  opts = opts || {};
  if (!html) return null;
  let mount = null;
  try {
    mount = mountWordHtmlForParsing(html);
    const doc = mount
      ? { body: mount.querySelector('body') || mount }
      : new DOMParser().parseFromString(html, 'text/html');
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
      const rtl = paragraphIsRtl(el, docRtl);
      if (!txt) {
        rawItems.push({ blank: true, spacingPx: extractParagraphSpacingPx(style) || 22 });
        return;
      }
      const leadingBlanks = readMarginTopBlankCount(style);
      for (let i = 0; i < leadingBlanks; i++) {
        rawItems.push({ blank: true, spacingPx: extractParagraphSpacingPx(style) || 22 });
      }
      rawItems.push({
        text: txt,
        indentPx: extractParagraphIndentPx(el, rtl),
        alignment: rtl ? 'rtl' : 'ltr',
        trailingSpacingPx: extractParagraphSpacingPx(style),
      });
    });

    const contentLines = [];
    let blankRun = 0;
    let blankItems = [];
    rawItems.forEach(item => {
      if (item.blank) {
        blankRun++;
        blankItems.push(item);
        return;
      }
      if (contentLines.length) {
        const prev = contentLines[contentLines.length - 1];
        const spPx = blankRunSpacingPx(blankRun, blankItems);
        if (spPx > 0) {
          prev.spacingAfterPx = spPx;
          const presets = [[18, 'small'], [40, 'medium'], [72, 'large']];
          const match = presets.find(([v]) => Math.abs(v - spPx) < 2);
          prev.spacingAfter = match ? match[1] : 'default';
        }
      }
      blankRun = 0;
      blankItems = [];
      contentLines.push({
        text: item.text,
        spacingAfter: 'default',
        indentPx: item.indentPx || 0,
        indent: 0,
        alignment: item.alignment || (docRtl ? 'rtl' : 'ltr'),
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
  } finally {
    unmountWordHtml(mount);
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
    const clause = { words, ann: {} };
    if (typeof line.indentPx === 'number' && !Number.isNaN(line.indentPx)) {
      setClauseIndentPx(clause, line.indentPx);
    } else {
      clause.indent = Math.max(0, Math.round(line.indent || 0));
    }
    if (typeof line.spacingAfterPx === 'number' && line.spacingAfterPx !== 0) {
      setClauseSpacingAfterPx(clause, line.spacingAfterPx);
    } else {
      const level = normalizeSpacingAfter(line.spacingAfter);
      if (level !== 'default') clause.spacingAfter = level;
    }
    if (line.alignment === 'rtl' || line.alignment === 'ltr') clause.alignment = line.alignment;
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
  const verseRef = generated[0] || normRef || '';
  const clauses = contentLines.map(clauseFromLine).filter(Boolean);
  if (!clauses.length) return [];
  return [{ ref: verseRef, clauses }];
}
window.buildVersesFromLayoutPaste = buildVersesFromLayoutPaste;

/* exportLayoutBreakCss: see js/app/contour-page-renderer.js */

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
  if (level === 'default') return 0;
  if (typeof contourVerseSpacingDocxTwips === 'function') return contourVerseSpacingDocxTwips(level);
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

function isPlaceholderPassageRef(ref) {
  const s = String(ref || '').trim().toLowerCase();
  return !s || s === 'pasted passage';
}
window.isPlaceholderPassageRef = isPlaceholderPassageRef;

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
  if (state && state.ref && String(state.ref).trim()) {
    const r = String(state.ref).trim();
    if (!isPlaceholderPassageRef(r)) return r;
  }
  if (state && state.verses && state.verses.length === 1 && state.verses[0].ref) {
    const r = String(state.verses[0].ref).trim();
    if (!isPlaceholderPassageRef(r)) return r;
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
  if (typeof syncPageZoomAfterContentChange === 'function') syncPageZoomAfterContentChange();
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
  if (typeof isPlaceholderPassageRef === 'function' && isPlaceholderPassageRef(verse && verse.ref)) return '';
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
  if (typeof fromClause.indentPx === 'number') {
    setClauseIndentPx(toClause, fromClause.indentPx);
  } else {
    toClause.indent = fromClause.indent || 0;
    delete toClause.indentPx;
  }
  if (typeof fromClause.spacingAfterPx === 'number') {
    setClauseSpacingAfterPx(toClause, fromClause.spacingAfterPx);
  } else {
    const level = normalizeSpacingAfter(fromClause.spacingAfter);
    if (level === 'default') {
      delete toClause.spacingAfter;
      delete toClause.spacingAfterPx;
    } else {
      toClause.spacingAfter = level;
      delete toClause.spacingAfterPx;
    }
  }
  if (fromClause.alignment === 'rtl' || fromClause.alignment === 'ltr') {
    toClause.alignment = fromClause.alignment;
  } else {
    delete toClause.alignment;
  }
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
  if (norm === 'default') {
    delete clause.spacingAfter;
    delete clause.spacingAfterPx;
  } else {
    clause.spacingAfter = norm;
    setClauseSpacingAfterPx(clause, spacingAfterPxFromLevel(norm));
  }
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
