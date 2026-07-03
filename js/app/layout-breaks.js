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
}
window.copyVerseLayoutFields = copyVerseLayoutFields;

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
  updateVisualBreakToolbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualBreakControls);
} else {
  initVisualBreakControls();
}
