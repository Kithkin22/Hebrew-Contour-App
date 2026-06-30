/* text-cleanup-mode-v1 — Phase 0 precise verse text cleanup */
let textCleanupMode = false;

function isTextCleanupMode() { return !!textCleanupMode; }
window.isTextCleanupMode = isTextCleanupMode;

function freshWordToken(text) {
  return freshWordFromText(text);
}

function updateTextCleanupUi() {
  document.body.classList.toggle('text-cleanup-mode', textCleanupMode);
  const banner = document.getElementById('textCleanupBanner');
  const btn = document.getElementById('textCleanupModeBtn');
  if (banner) banner.classList.toggle('hidden', !textCleanupMode);
  if (btn) {
    btn.classList.toggle('warn', textCleanupMode);
    btn.textContent = textCleanupMode ? 'Exit Text Cleanup' : 'Text Cleanup';
  }
}

function setTextCleanupMode(on) {
  textCleanupMode = !!on;
  updateTextCleanupUi();
  if (typeof render === 'function') render();
}
window.setTextCleanupMode = setTextCleanupMode;

function removeWordAtLoc(loc) {
  if (!locOK(loc)) return false;
  const v = loc.v, c = loc.c, w = loc.w;
  const clause = state.verses[v].clauses[c];
  if (!clause || !clause.words[w]) return false;

  if (clause.words.length === 1) {
    state.verses[v].clauses.splice(c, 1);
    if (!state.verses[v].clauses.length) {
      state.verses[v].clauses.push({ indent: 0, words: [], specials: [], ann: {} });
    }
    applyStructureRemap((l) => {
      let r = mapWordRemoved(v, c, w)(l);
      if (!r) return null;
      return mapClauseRemoved(v, c)(r);
    });
  } else {
    clause.words.splice(w, 1);
    pruneOrphanMaqafConnectors(clause);
    applyStructureRemap(mapWordRemoved(v, c, w));
  }

  if (state.selected && state.selected.v === v && state.selected.c === c) {
    const cl = state.verses[v].clauses[Math.min(c, state.verses[v].clauses.length - 1)];
    if (cl && cl.words.length) {
      state.selected = { v, c: Math.min(c, state.verses[v].clauses.length - 1), w: Math.min(w, cl.words.length - 1) };
    } else {
      state.selected = null;
    }
  }
  return true;
}
window.removeWordAtLoc = removeWordAtLoc;

function deleteSelectedWordPermanent() {
  if (!locOK(state.selected)) {
    alert('Select a word to delete.');
    return;
  }
  const w = state.verses[state.selected.v].clauses[state.selected.c].words[state.selected.w];
  if (!confirm('Permanently delete “' + (w.text || '') + '” from this verse? Annotations on this word will be removed.')) return;
  markUndo();
  removeWordAtLoc(cloneLoc(state.selected));
  if (autosaveReady) autoSaveProject();
  render();
}

function openWordTextEditModal() {
  if (!locOK(state.selected)) {
    alert('Select a word first.');
    return;
  }
  const l = cloneLoc(state.selected);
  const w = state.verses[l.v].clauses[l.c].words[l.w];
  promptModal(
    'Edit Word Text',
    'Edit the selected word (character-level cleanup). Leave empty to delete the word.',
    w.text,
    (newText) => {
      const trimmed = String(newText || '').trim();
      markUndo();
      if (!trimmed) {
        removeWordAtLoc(l);
      } else if (MAQAF_SPLIT_RE.test(trimmed)) {
        const clause = state.verses[l.v].clauses[l.c];
        const expanded = tokenizeClauseWords([trimmed], state.language);
        clause.words.splice(l.w, 1, ...expanded);
        pruneOrphanMaqafConnectors(clause);
      } else {
        w.text = trimmed;
      }
      if (autosaveReady) autoSaveProject();
      render();
    }
  );
}

function applyClauseTextCleanup(v, c, newText) {
  const clause = state.verses[v].clauses[c];
  if (!clause) return;
  const oldWords = clause.words.slice();
  const oldSelectable = oldWords.filter(isSelectableWord);
  const tokens = String(newText || '').trim().split(/\s+/).filter(Boolean);
  const newWords = tokenizeClauseWords(tokens, state.language);
  const newSelectable = newWords.filter(isSelectableWord);
  let oi = 0;
  for (let ni = 0; ni < newSelectable.length; ni++) {
    const ntxt = normalizeHebrewWord(newSelectable[ni].text);
    while (oi < oldSelectable.length && normalizeHebrewWord(oldSelectable[oi].text) !== ntxt) oi++;
    if (oi < oldSelectable.length) {
      copyWordAnnotations(oldSelectable[oi], newSelectable[ni]);
      oi++;
    }
  }
  clause.words = newWords;
  pruneOrphanMaqafConnectors(clause);
  applyStructureRemap((loc) => {
    if (loc.v !== v || loc.c !== c) return loc;
    const ow = oldWords[loc.w];
    if (!ow || isMaqafConnector(ow)) return null;
    const ntxt = normalizeHebrewWord(ow.text);
    for (let wi = 0; wi < newWords.length; wi++) {
      if (!isSelectableWord(newWords[wi])) continue;
      if (normalizeHebrewWord(newWords[wi].text) === ntxt) return { v, c, w: wi };
    }
    return null;
  });
  if (state.selected && state.selected.v === v && state.selected.c === c) {
    const max = Math.max(0, newWords.length - 1);
    state.selected.w = Math.min(state.selected.w, max);
    if (!isSelectableWord(newWords[state.selected.w])) {
      state.selected.w = firstSelectableWordIndex(newWords);
    }
  }
}

function openClauseTextEditModal() {
  if (!locOK(state.selected)) {
    alert('Select a word in the clause you want to edit.');
    return;
  }
  const v = state.selected.v, c = state.selected.c;
  const clause = state.verses[v].clauses[c];
  const current = joinWordsForDisplay(clause.words);
  const layout = getLanguageLayout();
  promptModal(
    'Edit Clause Text',
    'Edit clause text (space-separated words). Removed tokens are deleted; new tokens are added without annotations.',
    current,
    (txt) => {
      markUndo();
      applyClauseTextCleanup(v, c, txt);
      if (autosaveReady) autoSaveProject();
      render();
    }
  );
  const inp = document.getElementById('modalInput');
  if (inp) {
    inp.dir = layout.dir;
    inp.classList.remove('heb', 'greek');
    inp.classList.add(layout.dir === 'rtl' ? 'heb' : 'greek');
  }
}

function initTextCleanupMode() {
  const btn = document.getElementById('textCleanupModeBtn');
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.onclick = () => setTextCleanupMode(!textCleanupMode);
  }
  const editWord = document.getElementById('textCleanupEditWordBtn');
  if (editWord && !editWord.dataset.bound) {
    editWord.dataset.bound = '1';
    editWord.onclick = () => openWordTextEditModal();
  }
  const editClause = document.getElementById('textCleanupEditClauseBtn');
  if (editClause && !editClause.dataset.bound) {
    editClause.dataset.bound = '1';
    editClause.onclick = () => openClauseTextEditModal();
  }
  const exitBtn = document.getElementById('textCleanupExitBtn');
  if (exitBtn && !exitBtn.dataset.bound) {
    exitBtn.dataset.bound = '1';
    exitBtn.onclick = () => setTextCleanupMode(false);
  }
  updateTextCleanupUi();

  document.addEventListener('keydown', (e) => {
    if (!textCleanupMode) return;
    if (e.target.matches('textarea,input,[contenteditable]') || document.getElementById('modal')?.classList.contains('show')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setTextCleanupMode(false);
      return;
    }
    if (e.key === 'Delete' && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      deleteSelectedWordPermanent();
    }
  }, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTextCleanupMode);
else initTextCleanupMode();
