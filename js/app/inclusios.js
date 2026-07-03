/* inclusio-phase-a — TextAnchor model, editor + legend registry */
let inclusioPhraseDraft = null; /* { side: 'opening'|'closing', loc } */
let inclusioRegistryHoverId = null;

const RELATIONSHIP_BASIS_OPTIONS = [
  { value: '', label: '— unset —' },
  { value: 'exact_word', label: 'Exact word' },
  { value: 'lemma', label: 'Lemma' },
  { value: 'root', label: 'Root' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'motif', label: 'Motif' },
  { value: 'conceptual', label: 'Conceptual' },
  { value: 'custom', label: 'Custom' }
];

function relationshipBasisLabel(v) {
  const o = RELATIONSHIP_BASIS_OPTIONS.find(x => x.value === (v || ''));
  return o ? o.label : '';
}

function nextTextAnchorId(prefix) {
  return (prefix || 'ta') + Date.now() + Math.random().toString(36).slice(2, 6);
}

function cloneLocRange(range) {
  if (!range || !range.start) return null;
  return { start: cloneLoc(range.start), end: cloneLoc(range.end || range.start) };
}

function makeTextAnchorFromLocs(start, end) {
  if (!locOK(start)) return null;
  const ordered = orderedLocs(start, end || start);
  const range = { start: cloneLoc(ordered[0]), end: cloneLoc(ordered[1]) };
  const text = anchorTextFromLocRange(range);
  return { id: nextTextAnchorId('ta'), range, normalizedText: text };
}

function anchorRangeOrdered(anchor) {
  if (!anchor || !anchor.range || !anchor.range.start) return null;
  const s = anchor.range.start;
  const e = anchor.range.end || anchor.range.start;
  if (!locOK(s)) return null;
  const ordered = orderedLocs(s, locOK(e) ? e : s);
  return { start: ordered[0], end: ordered[1] };
}

function anchorTextFromLocRange(range) {
  if (!range || !range.start) return '';
  const ord = anchorRangeOrdered({ range });
  if (!ord) return '';
  return commentAnchorText(ord.start, ord.end);
}

function anchorDisplayLabel(anchor) {
  if (!anchor) return 'not set';
  const ord = anchorRangeOrdered(anchor);
  if (!ord) return 'not set';
  const text = anchorTextFromLocRange(anchor.range ? anchor : { range: ord });
  const ref = state.verses[ord.start.v]?.ref || '';
  if (ord.start.v === ord.end.v && ord.start.c === ord.end.c && ord.start.w === ord.end.w) {
    return ref ? `${ref}: ${text}` : text;
  }
  return ref ? `${ref}: ${text}` : text;
}

function migrateInclusioItem(item) {
  if (!item || typeof item !== 'object') return null;
  const inc = Object.assign({}, item);
  inc.relationshipKind = inc.relationshipKind || 'inclusio';
  if (!inc.openingAnchor && locOK(inc.start)) {
    inc.openingAnchor = makeTextAnchorFromLocs(inc.start, inc.start);
    delete inc.start;
  }
  if (!inc.closingAnchor && locOK(inc.end)) {
    inc.closingAnchor = makeTextAnchorFromLocs(inc.end, inc.end);
    delete inc.end;
  }
  if (inc.openingAnchor && inc.openingAnchor.range) {
    inc.openingAnchor.normalizedText = anchorTextFromLocRange(inc.openingAnchor.range);
  }
  if (inc.closingAnchor && inc.closingAnchor.range) {
    inc.closingAnchor.normalizedText = anchorTextFromLocRange(inc.closingAnchor.range);
  }
  if (!inc.id) inc.id = 'inc' + Date.now();
  if (!inc.color) inc.color = '#315efb';
  if (inc.theme == null) inc.theme = inc.theme || '';
  if (inc.evidence == null) inc.evidence = inc.evidence || '';
  if (inc.notes == null) inc.notes = inc.notes || '';
  delete inc.derivedSpan;
  return inc;
}

function migrateAllInclusios() {
  ensureInclusios();
  state.inclusios = state.inclusios.map(migrateInclusioItem).filter(Boolean);
  if (state.activeInclusioId && !state.inclusios.some(x => x.id === state.activeInclusioId)) {
    state.activeInclusioId = state.inclusios[0]?.id || null;
  }
}

function migrateInclusiosOnPane(pane) {
  if (!pane || !Array.isArray(pane.inclusios)) return;
  pane.inclusios = pane.inclusios.map(migrateInclusioItem).filter(Boolean);
  if (pane.activeInclusioId && !pane.inclusios.some(x => x.id === pane.activeInclusioId)) {
    pane.activeInclusioId = pane.inclusios[0]?.id || null;
  }
}

function remapTextAnchor(anchor, fixFn) {
  if (!anchor || !anchor.range) return null;
  const s = fixFn(cloneLoc(anchor.range.start));
  const e = fixFn(cloneLoc(anchor.range.end || anchor.range.start));
  if (!s || !e) return null;
  const range = { start: s, end: e };
  return Object.assign({}, anchor, { range, normalizedText: anchorTextFromLocRange(range) });
}

function remapInclusioItem(inc, fixFn) {
  if (!inc) return null;
  const item = migrateInclusioItem(inc);
  let opening = item.openingAnchor ? remapTextAnchor(item.openingAnchor, fixFn) : null;
  let closing = item.closingAnchor ? remapTextAnchor(item.closingAnchor, fixFn) : null;
  if (item.openingAnchor && !opening) return null;
  if (item.closingAnchor && !closing) return null;
  if (!opening && !closing) return null;
  return Object.assign({}, item, {
    openingAnchor: opening || item.openingAnchor,
    closingAnchor: closing || item.closingAnchor
  });
}

function remapInclusiosInPane(panest, fixFn) {
  if (!panest || !Array.isArray(panest.inclusios)) return;
  panest.inclusios = panest.inclusios
    .map(inc => remapInclusioItem(inc, fixFn))
    .filter(Boolean);
  if (panest.activeInclusioId && !panest.inclusios.some(x => x.id === panest.activeInclusioId)) {
    panest.activeInclusioId = panest.inclusios[0]?.id || null;
  }
}

function deriveInclusioSpan(inc) {
  const item = migrateInclusioItem(inc);
  const open = anchorRangeOrdered(item.openingAnchor);
  const close = anchorRangeOrdered(item.closingAnchor);
  if (!open || !close) return '—';
  const spanStart = open.start;
  const spanEnd = close.end;
  const refA = state.verses[spanStart.v]?.ref || '';
  const refB = state.verses[spanEnd.v]?.ref || '';
  if (!refA && !refB) return '—';
  if (refA === refB) return refA;
  const bookA = refA.replace(/\s*\d+:\d+.*$/, '').trim();
  const bookB = refB.replace(/\s*\d+:\d+.*$/, '').trim();
  const chapVerse = r => {
    const m = String(r || '').match(/(\d+)\s*:\s*(\d+)/);
    return m ? { ch: +m[1], v: +m[2] } : null;
  };
  const a = chapVerse(refA);
  const b = chapVerse(refB);
  if (bookA && bookA === bookB && a && b) {
    if (a.ch === b.ch) return `${bookA} ${a.ch}:${a.v}–${b.v}`;
    return `${bookA} ${a.ch}:${a.v}–${b.ch}:${b.v}`;
  }
  return `${refA} – ${refB}`;
}

function ensureInclusios() {
  if (!Array.isArray(state.inclusios)) state.inclusios = [];
}

function activeInclusio() {
  ensureInclusios();
  migrateAllInclusios();
  let id = state.activeInclusioId;
  const sel = document.getElementById('activeInclusioSelect');
  if (sel && sel.value) id = sel.value;
  if (!id && state.inclusios[0]) id = state.inclusios[0].id;
  return state.inclusios.find(x => x.id === id) || null;
}

function activateInclusio(id, scroll) {
  ensureInclusios();
  const item = state.inclusios.find(x => x.id === id);
  if (!item) return;
  state.activeInclusioId = id;
  const open = anchorRangeOrdered(item.openingAnchor);
  if (open && locOK(open.start)) state.selected = cloneLoc(open.start);
  render();
  if (scroll !== false) {
    setTimeout(() => {
      const w = document.querySelector(
        `.word[data-v="${open?.start?.v}"][data-c="${open?.start?.c}"][data-w="${open?.start?.w}"]`
      );
      if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' });
      applyInclusioRegistryHighlight();
    }, 60);
  }
}

function addInclusio() {
  markUndo();
  ensureInclusios();
  const n = state.inclusios.length + 1;
  const label = `Inclusio ${String.fromCharCode(64 + ((n - 1) % 26) + 1)}`;
  const color = document.getElementById('inclusioColor')?.value || '#315efb';
  const item = {
    id: 'inc' + Date.now(),
    label,
    color,
    relationshipKind: 'inclusio',
    openingAnchor: null,
    closingAnchor: null,
    theme: '',
    relationshipBasis: '',
    evidence: '',
    notes: ''
  };
  state.inclusios.push(item);
  state.activeInclusioId = item.id;
  inclusioPhraseDraft = null;
  render();
}

function deleteActiveInclusio() {
  const item = activeInclusio();
  if (!item) { alert('No inclusio selected.'); return; }
  if (!confirm('Delete this inclusio?')) return;
  markUndo();
  const idx = state.inclusios.findIndex(x => x.id === item.id);
  if (idx >= 0) state.inclusios.splice(idx, 1);
  state.activeInclusioId = state.inclusios[0]?.id || null;
  syncInclusioWordMarkers();
  render();
}

function setInclusioPhraseStart(side) {
  if (!locOK(state.selected)) { alert('Select a word first.'); return; }
  inclusioPhraseDraft = { side, loc: cloneLoc(state.selected) };
  updateInclusioPhraseStatus();
}

function clearInclusioPhraseDraft() {
  inclusioPhraseDraft = null;
  updateInclusioPhraseStatus();
}

function updateInclusioPhraseStatus() {
  const el = document.getElementById('inclusioPhraseStatus');
  if (!el) return;
  if (!inclusioPhraseDraft) {
    el.textContent = 'For a phrase, set phrase start on a word, select the end word, then set the anchor.';
    return;
  }
  const side = inclusioPhraseDraft.side === 'closing' ? 'Closing' : 'Opening';
  el.textContent = `${side} phrase start set. Select the end word, then Set ${side} Anchor.`;
}

function setInclusioAnchor(side) {
  markUndo();
  let item = activeInclusio();
  if (!item) { addInclusio(); item = activeInclusio(); }
  if (!locOK(state.selected)) { alert('Select a word first.'); return; }
  let start = inclusioPhraseDraft && inclusioPhraseDraft.side === side
    ? cloneLoc(inclusioPhraseDraft.loc)
    : cloneLoc(state.selected);
  let end = cloneLoc(state.selected);
  const anchor = makeTextAnchorFromLocs(start, end);
  if (!anchor) return;
  if (side === 'opening') item.openingAnchor = anchor;
  else item.closingAnchor = anchor;
  if (!item.evidence && item.openingAnchor && item.closingAnchor) {
    const o = item.openingAnchor.normalizedText || '';
    const c = item.closingAnchor.normalizedText || '';
    if (o && c) item.evidence = o === c ? o : `${o} … ${c}`;
  }
  inclusioPhraseDraft = null;
  syncInclusioWordMarkers();
  updateInclusioPhraseStatus();
  render();
}

function clearInclusioWordMarkers() {
  state.verses.forEach(v => v.clauses.forEach(c => c.words.forEach(w => {
    if (w.inclusioId) {
      delete w.inclusioId;
      delete w.inclusioRole;
      delete w.inclusioColor;
      delete w.inclusioAnchorSide;
      if (w.bracketStart && w.bracketSource === 'inclusio') delete w.bracketStart;
      if (w.bracketEnd && w.bracketSource === 'inclusio') delete w.bracketEnd;
      delete w.bracketSource;
      if (w.bracketColorSource === 'inclusio') {
        delete w.bracketColor;
        delete w.bracketColorSource;
      }
    }
  })));
}

function syncInclusioWordMarkers() {
  ensureInclusios();
  migrateAllInclusios();
  clearInclusioWordMarkers();
  state.inclusios.forEach(item => {
    const color = item.color || '#315efb';
    const applyAnchor = (anchor, side) => {
      const ord = anchorRangeOrdered(anchor);
      if (!ord) return;
      let started = false;
      state.verses.forEach((v, vi) => v.clauses.forEach((c, ci) => c.words.forEach((w, wi) => {
        const l = { v: vi, c: ci, w: wi };
        if (!locInRange(l, ord.start, ord.end) || isMaqafConnector(w)) return;
        w.inclusioId = item.id;
        w.inclusioColor = color;
        w.inclusioAnchorSide = side;
        if (side === 'opening' && !started && locEqual(l, ord.start)) {
          w.bracketStart = true;
          w.bracketColor = color;
          w.bracketColorSource = 'inclusio';
          w.bracketSource = 'inclusio';
          w.inclusioRole = 'opening-start';
          started = true;
        } else if (side === 'closing' && locEqual(l, ord.end)) {
          w.bracketEnd = true;
          w.bracketColor = color;
          w.bracketColorSource = 'inclusio';
          w.bracketSource = 'inclusio';
          w.inclusioRole = 'closing-end';
        } else {
          w.inclusioRole = side === 'opening' ? 'opening' : 'closing';
        }
      })));
    };
    if (item.openingAnchor) applyAnchor(item.openingAnchor, 'opening');
    if (item.closingAnchor) applyAnchor(item.closingAnchor, 'closing');
  });
}

function clearInclusioMarkers() {
  markUndo();
  if (!confirm('Clear all inclusio markers?')) return;
  state.inclusios = [];
  state.activeInclusioId = null;
  inclusioPhraseDraft = null;
  clearInclusioWordMarkers();
  render();
}

function inclusioWordHighlightClass(l, w) {
  if (!w.inclusioId) return '';
  const activeId = state.activeInclusioId || activeInclusio()?.id;
  const hoverId = inclusioRegistryHoverId;
  if (hoverId && w.inclusioId === hoverId) return 'inclusio-registry-hover';
  if (activeId && w.inclusioId === activeId) return 'inclusio-anchor-active';
  return '';
}

function applyInclusioRegistryHighlight() {
  document.querySelectorAll('.word.inclusio-registry-hover,.word.inclusio-anchor-active').forEach(el => {
    el.classList.remove('inclusio-registry-hover', 'inclusio-anchor-active');
  });
  const id = inclusioRegistryHoverId || state.activeInclusioId;
  if (!id) return;
  const cls = inclusioRegistryHoverId ? 'inclusio-registry-hover' : 'inclusio-anchor-active';
  document.querySelectorAll('.word').forEach(el => {
    const vi = +el.dataset.v;
    const ci = +el.dataset.c;
    const wi = +el.dataset.w;
    const w = state.verses[vi]?.clauses[ci]?.words[wi];
    if (w && w.inclusioId === id) el.classList.add(cls);
  });
}

function renderInclusioEditor() {
  ensureInclusios();
  migrateAllInclusios();
  const box = document.getElementById('inclusioEditor');
  if (!box) return;
  if (!state.inclusios.length) {
    box.innerHTML = '<p class="muted small">No inclusios yet. Click <strong>New Inclusio</strong> to begin.</p>';
    return;
  }
  const active = activeInclusio();
  const activeId = active?.id || '';
  let html = '<div class="inclusio-editor-grid">';
  html += '<div class="row inclusio-active-row"><label class="small">Active <select id="activeInclusioSelect">';
  state.inclusios.forEach((x, i) => {
    html += `<option value="${esc(x.id)}"${x.id === activeId ? ' selected' : ''}>${esc(x.label || ('Inclusio ' + (i + 1)))}</option>`;
  });
  html += '</select></label>';
  html += '<label class="small">Label <input id="inclusioLabelInput" value="' + esc(active?.label || '') + '"></label>';
  html += '<label class="small">Color <input id="inclusioColorInput" type="color" value="' + esc(active?.color || '#315efb') + '"></label>';
  html += '</div>';

  html += '<div class="inclusio-anchor-block">';
  html += '<div class="inclusio-field-row"><strong class="small">Opening Anchor</strong>';
  html += '<button type="button" class="btn small" id="inclusioOpeningPhraseStart">Phrase start</button>';
  html += '<button type="button" class="btn small" id="setInclusioOpening">Set Opening Anchor</button></div>';
  html += '<div class="inclusio-readonly muted small" id="inclusioOpeningDisplay">' + esc(anchorDisplayLabel(active?.openingAnchor)) + '</div>';
  html += '</div>';

  html += '<div class="inclusio-anchor-block">';
  html += '<div class="inclusio-field-row"><strong class="small">Closing Anchor</strong>';
  html += '<button type="button" class="btn small" id="inclusioClosingPhraseStart">Phrase start</button>';
  html += '<button type="button" class="btn small" id="setInclusioClosing">Set Closing Anchor</button></div>';
  html += '<div class="inclusio-readonly muted small" id="inclusioClosingDisplay">' + esc(anchorDisplayLabel(active?.closingAnchor)) + '</div>';
  html += '</div>';

  html += '<div class="inclusio-field-row"><label class="small">Derived Span</label>';
  html += '<div class="inclusio-readonly inclusio-derived-span" id="inclusioDerivedSpan">' + esc(deriveInclusioSpan(active)) + '</div></div>';

  html += '<label class="small">Theme <input id="inclusioThemeInput" value="' + esc(active?.theme || '') + '" placeholder="Optional theme"></label>';
  html += '<label class="small">Relationship Basis <select id="inclusioBasisSelect">';
  RELATIONSHIP_BASIS_OPTIONS.forEach(o => {
    html += `<option value="${esc(o.value)}"${(active?.relationshipBasis || '') === o.value ? ' selected' : ''}>${esc(o.label)}</option>`;
  });
  html += '</select></label>';
  html += '<label class="small">Evidence <input id="inclusioEvidenceInput" value="' + esc(active?.evidence || '') + '" placeholder="Repeated word or phrase"></label>';
  html += '<label class="small">Notes <textarea id="inclusioNotesInput" rows="2" placeholder="Optional notes">' + esc(active?.notes || '') + '</textarea></label>';

  html += '<p class="muted small" id="inclusioPhraseStatus"></p>';
  html += '</div>';

  box.innerHTML = html;
  updateInclusioPhraseStatus();

  const sel = box.querySelector('#activeInclusioSelect');
  if (sel) sel.onchange = () => { state.activeInclusioId = sel.value; render(); };

  const bindField = (id, fn) => {
    const el = box.querySelector(id);
    if (!el) return;
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el[ev] = () => {
      const item = activeInclusio();
      if (!item) return;
      markUndo();
      fn(item, el);
      if (id === '#inclusioColorInput') syncInclusioWordMarkers();
      autoSaveProject();
      if (id === '#inclusioColorInput' || id === '#inclusioLabelInput') renderInclusioRegistry();
    };
  };
  bindField('#inclusioLabelInput', (item, el) => { item.label = el.value; });
  bindField('#inclusioColorInput', (item, el) => { item.color = el.value; renderInclusioEditor(); });
  bindField('#inclusioThemeInput', (item, el) => { item.theme = el.value; });
  bindField('#inclusioBasisSelect', (item, el) => { item.relationshipBasis = el.value || null; });
  bindField('#inclusioEvidenceInput', (item, el) => { item.evidence = el.value; });
  bindField('#inclusioNotesInput', (item, el) => { item.notes = el.value; });

  const oPh = box.querySelector('#inclusioOpeningPhraseStart');
  if (oPh) oPh.onclick = () => setInclusioPhraseStart('opening');
  const cPh = box.querySelector('#inclusioClosingPhraseStart');
  if (cPh) cPh.onclick = () => setInclusioPhraseStart('closing');
  const oSet = box.querySelector('#setInclusioOpening');
  if (oSet) oSet.onclick = () => setInclusioAnchor('opening');
  const cSet = box.querySelector('#setInclusioClosing');
  if (cSet) cSet.onclick = () => setInclusioAnchor('closing');
}

function renderInclusioRegistry() {
  ensureInclusios();
  migrateAllInclusios();
  const box = document.getElementById('inclusioRegistry');
  const head = document.getElementById('legendInclusiosHeader');
  const n = state.inclusios.length;
  if (head) {
    const collapsed = head.parentElement?.classList.contains('collapsed');
    head.textContent = (collapsed ? '▶' : '▼') + ` Inclusios (${n})`;
  }
  if (!box) return;
  if (!n) {
    box.innerHTML = '<p class="muted small">No inclusios marked yet. Use the Inclusio tab to create one.</p>';
    return;
  }
  let html = '<div class="inclusio-registry-list">';
  state.inclusios.forEach((inc, i) => {
    const letter = String.fromCharCode(65 + (i % 26));
    const active = inc.id === (state.activeInclusioId || activeInclusio()?.id);
    const openText = inc.openingAnchor?.normalizedText || anchorTextFromLocRange(inc.openingAnchor?.range) || '—';
    const closeText = inc.closingAnchor?.normalizedText || anchorTextFromLocRange(inc.closingAnchor?.range) || '—';
    const span = deriveInclusioSpan(inc);
    const theme = (inc.theme || '').trim();
    const basis = relationshipBasisLabel(inc.relationshipBasis);
    const meta = [theme && `Theme: ${theme}`, basis && basis !== '— unset —' && `Basis: ${basis}`].filter(Boolean).join(' · ');
    html += `<div class="inclusio-registry-row${active ? ' active' : ''}" data-inc-id="${esc(inc.id)}" tabindex="0" role="button">`;
    html += `<div class="inclusio-registry-row-head"><span class="inclusio-registry-marker" style="color:${esc(inc.color || '#315efb')}">[${letter}]</span>`;
    html += `<span class="inclusio-registry-label">${esc(inc.label || ('Inclusio ' + letter))}</span>`;
    html += `<span class="inclusio-registry-span muted">${esc(span)}</span></div>`;
    html += `<div class="inclusio-registry-detail small"><span>Opening: <span class="inclusio-registry-hebrew">${esc(openText)}</span></span>`;
    html += `<span>Closing: <span class="inclusio-registry-hebrew">${esc(closeText)}</span></span></div>`;
    if (meta) html += `<div class="inclusio-registry-meta muted small">${esc(meta)}</div>`;
    if ((inc.evidence || '').trim()) {
      html += `<div class="inclusio-registry-evidence muted small">Evidence: <span class="inclusio-registry-hebrew">${esc(inc.evidence)}</span></div>`;
    }
    html += '</div>';
  });
  html += '</div>';
  box.innerHTML = html;

  box.querySelectorAll('.inclusio-registry-row').forEach(row => {
    const id = row.dataset.incId;
    row.onclick = () => activateInclusio(id);
    row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateInclusio(id); } };
    row.onmouseenter = () => {
      inclusioRegistryHoverId = id;
      applyInclusioRegistryHighlight();
    };
    row.onmouseleave = () => {
      inclusioRegistryHoverId = null;
      applyInclusioRegistryHighlight();
    };
  });
}

function initLegendInclusiosSection() {
  const panel = document.getElementById('legendPanel');
  if (!panel || document.getElementById('legendInclusiosSection')) return;
  const section = document.createElement('div');
  section.id = 'legendInclusiosSection';
  section.className = 'legend-subsection collapsed';
  const head = document.createElement('div');
  head.id = 'legendInclusiosHeader';
  head.className = 'legend-subsection-header';
  head.textContent = '▶ Inclusios (0)';
  head.onclick = () => {
    section.classList.toggle('collapsed');
    renderInclusioRegistry();
  };
  const body = document.createElement('div');
  body.id = 'legendInclusiosBody';
  body.className = 'legend-subsection-body';
  const registry = document.createElement('div');
  registry.id = 'inclusioRegistry';
  body.appendChild(registry);
  section.appendChild(head);
  section.appendChild(body);
  panel.appendChild(section);
}

function renderInclusioUI() {
  initLegendInclusiosSection();
  syncInclusioWordMarkers();
  renderInclusioEditor();
  renderInclusioRegistry();
  setTimeout(applyInclusioRegistryHighlight, 0);
}

function inclusiosHtmlForExport() {
  ensureInclusios();
  migrateAllInclusios();
  if (!state.inclusios.length) return '';
  let rows = state.inclusios.map((inc, i) => {
    const letter = String.fromCharCode(65 + (i % 26));
    return `<tr><td>[${letter}]</td><td>${esc(inc.label || '')}</td><td>${esc(deriveInclusioSpan(inc))}</td><td dir="auto">${esc(inc.openingAnchor?.normalizedText || '')}</td><td dir="auto">${esc(inc.closingAnchor?.normalizedText || '')}</td><td>${esc(inc.theme || '')}</td><td>${esc(relationshipBasisLabel(inc.relationshipBasis))}</td><td dir="auto">${esc(inc.evidence || '')}</td></tr>`;
  }).join('');
  return `<h3 style="font-family:Arial,Helvetica,sans-serif;margin-top:14px">Inclusios</h3><table class="export-legend"><thead><tr><th>Marker</th><th>Label</th><th>Derived Span</th><th>Opening</th><th>Closing</th><th>Theme</th><th>Basis</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table>`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLegendInclusiosSection);
} else {
  initLegendInclusiosSection();
}
