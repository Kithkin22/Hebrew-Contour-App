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
    contentLines.push({ text: String(line).trim(), spacingAfter: 'default' });
  });
  return contentLines;
}
window.parseLayoutPasteLines = parseLayoutPasteLines;

function layoutTextFromWordHtml(html) {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks = doc.body ? Array.from(doc.body.querySelectorAll('p, div, li')) : [];
    if (!blocks.length) return '';
    const hasHebrew = /[\u0590-\u05FF]/.test(doc.body.textContent || '');
    if (!hasHebrew) return '';
    const out = [];
    blocks.forEach(el => {
      const txt = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
      const style = (el.getAttribute('style') || '').toLowerCase();
      let extraBlanks = 0;
      const marginMatch = style.match(/margin-top:\s*([0-9.]+)pt/);
      if (marginMatch) {
        const pt = parseFloat(marginMatch[1]) || 0;
        if (pt >= 18) extraBlanks = 2;
        else if (pt >= 8) extraBlanks = 1;
      }
      while (extraBlanks-- > 0) out.push('');
      out.push(txt);
    });
    return out.join('\n');
  } catch (e) {
    return '';
  }
}
window.layoutTextFromWordHtml = layoutTextFromWordHtml;

function buildVersesFromLayoutPaste(text, ref, language, refs) {
  const contentLines = parseLayoutPasteLines(text);
  if (!contentLines.length) return [];
  const generated = Array.isArray(refs) ? refs : [];
  const usePerLineVerses = generated.length === contentLines.length && generated.length > 1;

  function clauseFromLine(line) {
    const words = tokenizeClauseWords(line.text.split(/\s+/).filter(Boolean), language);
    if (!words.length) return null;
    const clause = { indent: 0, words, ann: {} };
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
    + '.clause.layout-break-sm{margin-bottom:14px!important}'
    + '.clause.layout-break-md{margin-bottom:28px!important}'
    + '.clause.layout-break-lg{margin-bottom:48px!important}'
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

function contourVerseRefHtml(verse, vi, opts) {
  opts = opts || {};
  if (verseRefHidden(verse)) return '';
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
