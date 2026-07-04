/* inclusio-phase-a — TextAnchor model, editor + legend registry + draw mode */
let inclusioPhraseDraft = null; /* { side: 'opening'|'closing', loc } */
let inclusioRegistryHoverId = null;
let inclusioDraw = { active: false, isDragging: false, start: null, current: null };

const INCLUSIO_COLOR_PRESETS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Blue', value: '#315efb' },
  { name: 'Red', value: '#b02a2a' },
  { name: 'Green', value: '#3c763d' },
  { name: 'Brown', value: '#8a6d3b' },
];

const INCLUSIO_FRAME_WEIGHTS = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'thick', label: 'Thick' },
];

const INCLUSIO_FRAME_GUTTER = {
  textGap: 14,
  layerStep: 20,
  edgePad: 10,
  capLen: 14,
};

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
  const startWord = state.verses[ord.start.v]?.clauses[ord.start.c]?.words[ord.start.w];
  const endWord = state.verses[ord.end.v]?.clauses[ord.end.c]?.words[ord.end.w];
  const text = anchor.normalizedText
    || anchorTextFromLocRange(anchor.range ? anchor : { range: ord })
    || (startWord && !isMaqafConnector(startWord) ? startWord.text : '')
    || (endWord && !isMaqafConnector(endWord) ? endWord.text : '');
  const ref = state.verses[ord.start.v]?.ref || '';
  if (!text) return ref ? `${ref}: (word)` : 'not set';
  if (ord.start.v === ord.end.v && ord.start.c === ord.end.c && ord.start.w === ord.end.w) {
    return ref ? `${ref}: ${text}` : text;
  }
  return ref ? `${ref}: ${text}` : text;
}

function locRankInVerses(l, verses) {
  if (!l || !Array.isArray(verses)) return -1;
  let n = 0;
  for (let vi = 0; vi < verses.length; vi++) {
    for (let ci = 0; ci < verses[vi].clauses.length; ci++) {
      if (vi === l.v && ci === l.c) return n + l.w;
      n += verses[vi].clauses[ci].words.length;
    }
  }
  return -1;
}

function locInRangeInVerses(l, start, end, verses) {
  const r = locRankInVerses(l, verses);
  const a = locRankInVerses(start, verses);
  const b = locRankInVerses(end, verses);
  if (r < 0 || a < 0 || b < 0) return false;
  return r >= Math.min(a, b) && r <= Math.max(a, b);
}

function inclusioEditorScale() {
  if (typeof getArcOverlayScale === 'function') return getArcOverlayScale();
  const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));
  return raw > 0 ? raw : 1;
}

function computeInclusioNestLevels(inclusios, verses) {
  const spans = (inclusios || []).map(inc => {
    const item = migrateInclusioItem(inc);
    const open = anchorRangeOrdered(item?.openingAnchor);
    const close = anchorRangeOrdered(item?.closingAnchor);
    if (!open || !close) return null;
    const start = locRankInVerses(open.start, verses);
    const end = locRankInVerses(close.end, verses);
    if (start < 0 || end < 0) return null;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    return { inc: item, start: lo, end: hi, size: hi - lo };
  }).filter(Boolean);
  spans.forEach(item => {
    let depth = 0;
    spans.forEach(other => {
      if (other === item) return;
      if (other.start <= item.start && other.end >= item.end && other.size > item.size) depth++;
    });
    item.inc.nestLevel = depth;
  });
  return spans;
}

function inclusioWordSelector(l, pane) {
  if (pane != null) {
    return `.word[data-pane="${pane}"][data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`;
  }
  return `.word[data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`;
}

function inclusioEditorRoot(pane) {
  if (pane != null) {
    return document.querySelector(`.parallel-pane-arc-wrap[data-pane="${pane}"] .parallel-verse-body`);
  }
  return document.getElementById('editor');
}

function inclusioEnvelopeBounds(inc, paneState, pane) {
  const item = migrateInclusioItem(inc);
  const open = anchorRangeOrdered(item?.openingAnchor);
  const close = anchorRangeOrdered(item?.closingAnchor);
  if (!open || !close || !paneState?.verses?.length) return null;
  const ed = inclusioEditorRoot(pane);
  if (!ed) return null;
  const scale = inclusioEditorScale();
  const er = ed.getBoundingClientRect();
  const verses = paneState.verses;
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  let found = false;
  verses.forEach((v, vi) => v.clauses.forEach((c, ci) => c.words.forEach((w, wi) => {
    if (isMaqafConnector(w)) return;
    const l = { v: vi, c: ci, w: wi };
    if (!locInRangeInVerses(l, open.start, close.end, verses)) return;
    const el = document.querySelector(inclusioWordSelector(l, pane));
    if (!el) return;
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    found = true;
  })));
  if (!found) return null;
  return {
    top: (top - er.top) / scale,
    bottom: (bottom - er.top) / scale,
    left: (left - er.left) / scale,
    right: (right - er.left) / scale,
    width: Math.max(ed.scrollWidth, ed.offsetWidth, 1),
    height: Math.max(ed.scrollHeight, ed.offsetHeight, 1),
  };
}

function ensureInclusioFrameSvg(ed) {
  if (!ed) return null;
  let svg = ed.querySelector(':scope > svg.inclusio-frame-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('inclusio-frame-svg');
    svg.setAttribute('aria-hidden', 'true');
    const arc = ed.querySelector(':scope > #arcSvg');
    if (arc) ed.insertBefore(svg, arc);
    else ed.insertBefore(svg, ed.firstChild);
  }
  return svg;
}

function inclusioFrameStrokeWidth(inc, level) {
  const preset = { thin: 1.25, medium: 2, thick: 2.75 };
  if (inc.frameWeight && preset[inc.frameWeight]) return preset[inc.frameWeight];
  return Math.max(1.25, 2.75 - (level || 0) * 0.55);
}

function inclusioMaxNestLevel(spans) {
  return (spans || []).reduce((m, s) => Math.max(m, s.inc.nestLevel || 0), 0);
}

function inclusioRailXPositions(bounds, level, maxNest, contentW) {
  const outward = INCLUSIO_FRAME_GUTTER.textGap + Math.max(0, maxNest - (level || 0)) * INCLUSIO_FRAME_GUTTER.layerStep;
  return {
    xL: Math.max(INCLUSIO_FRAME_GUTTER.edgePad, bounds.left - outward),
    xR: Math.min(contentW - INCLUSIO_FRAME_GUTTER.edgePad, bounds.right + outward),
    outward,
  };
}

function inclusioAnchorMidY(anchor, paneState, pane) {
  const ord = anchorRangeOrdered(anchor);
  if (!ord) return null;
  const ed = inclusioEditorRoot(pane);
  if (!ed) return null;
  const el = document.querySelector(inclusioWordSelector(ord.start, pane));
  if (!el) return null;
  const scale = inclusioEditorScale();
  const er = ed.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return (r.top + r.height / 2 - er.top) / scale;
}

function syncInclusioEditorGutter(paneState) {
  const ed = document.getElementById('editor');
  if (!ed) return;
  const spans = computeInclusioNestLevels(paneState?.inclusios || [], paneState?.verses || []);
  const visible = spans.filter(s => s.inc.showMarginEnvelope !== false && s.inc.openingAnchor && s.inc.closingAnchor);
  const maxNest = inclusioMaxNestLevel(spans);
  const gutter = visible.length ? 40 + maxNest * INCLUSIO_FRAME_GUTTER.layerStep + INCLUSIO_FRAME_GUTTER.textGap : 0;
  if (gutter) ed.style.setProperty('--inclusio-margin-gutter', `${gutter}px`);
  else ed.style.removeProperty('--inclusio-margin-gutter');
  ed.classList.toggle('has-inclusio-frames', visible.length > 0);
}

function drawInclusioEnvelopeRail(svg, bounds, inc, level, maxNest, paneState, pane, opts) {
  opts = opts || {};
  const color = inc.color || '#6B7280';
  const strokeWidth = inclusioFrameStrokeWidth(inc, level);
  const opacity = opts.preview ? 0.5 : Math.max(0.5, 0.9 - (level || 0) * 0.1);
  const { xL, xR } = inclusioRailXPositions(bounds, level, maxNest, bounds.width);
  const y1 = Math.max(0, bounds.top - 2);
  const y2 = Math.min(bounds.height, bounds.bottom + 2);
  const cap = INCLUSIO_FRAME_GUTTER.capLen;
  const openY = inclusioAnchorMidY(inc.openingAnchor, paneState, pane);
  const closeY = inclusioAnchorMidY(inc.closingAnchor, paneState, pane);
  const mkLine = (x1, y1v, x2, y2v, extraCls) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', `${opts.preview ? 'inclusio-frame-rail inclusio-frame-rail-preview' : 'inclusio-frame-rail'}${extraCls ? ' ' + extraCls : ''}`);
    line.setAttribute('data-inc-id', inc.id || '');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1v));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2v));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(strokeWidth));
    line.setAttribute('opacity', String(opacity));
    svg.appendChild(line);
  };
  mkLine(xL, y1, xL, y2);
  mkLine(xR, y1, xR, y2);
  mkLine(xL, y1, xL + cap, y1);
  mkLine(xR - cap, y1, xR, y1);
  mkLine(xL, y2, xL + cap, y2);
  mkLine(xR - cap, y2, xR, y2);
  if (openY != null) {
    mkLine(xL, openY, xL + cap, openY, 'inclusio-frame-endcap');
    mkLine(xR - cap, openY, xR, openY, 'inclusio-frame-endcap');
  }
  if (closeY != null && closeY !== openY) {
    mkLine(xL, closeY, xL + cap, closeY, 'inclusio-frame-endcap');
    mkLine(xR - cap, closeY, xR, closeY, 'inclusio-frame-endcap');
  }
}

function renderInclusioFrameOverlay(paneState, pane) {
  const ed = inclusioEditorRoot(pane);
  if (!ed) return;
  const hasInclusios = !!(paneState?.inclusios?.length);
  const hasPreview = !pane && inclusioDraw.isDragging && inclusioDraw.start && inclusioDraw.current;
  if (!hasInclusios && !hasPreview) {
    const old = ed.querySelector(':scope > svg.inclusio-frame-svg');
    if (old) old.remove();
    if (!pane) syncInclusioEditorGutter(paneState);
    return;
  }
  const svg = ensureInclusioFrameSvg(ed);
  if (!svg) return;
  svg.innerHTML = '';
  const contentW = Math.max(ed.scrollWidth, ed.offsetWidth, 1);
  const contentH = Math.max(ed.scrollHeight, ed.offsetHeight, 1);
  svg.setAttribute('viewBox', `0 0 ${contentW} ${contentH}`);
  svg.setAttribute('width', String(contentW));
  svg.setAttribute('height', String(contentH));
  svg.style.width = contentW + 'px';
  svg.style.height = contentH + 'px';
  if (hasInclusios) {
    const spans = computeInclusioNestLevels(paneState.inclusios, paneState.verses);
    const maxNest = inclusioMaxNestLevel(spans);
    spans.sort((a, b) => (a.inc.nestLevel || 0) - (b.inc.nestLevel || 0));
    spans.forEach(({ inc }) => {
      if (inc.showMarginEnvelope === false) return;
      if (!inc.openingAnchor || !inc.closingAnchor) return;
      const bounds = inclusioEnvelopeBounds(inc, paneState, pane);
      if (!bounds) return;
      drawInclusioEnvelopeRail(svg, bounds, inc, inc.nestLevel || 0, maxNest, paneState, pane);
    });
  }
  if (hasPreview) {
    drawInclusioDragPreview(svg, inclusioDraw.start, inclusioDraw.current, paneState);
  }
  if (!pane) {
    syncInclusioEditorGutter(paneState);
    applyInclusioFrameHighlight();
  }
}

function renderInclusioFrameOverlays() {
  ensureStateBundle();
  if (typeof isParallelActive === 'function' && isParallelActive()) {
    [0, 1].forEach(pane => renderInclusioFrameOverlay(stateBundle.panes[pane], pane));
  } else {
    renderInclusioFrameOverlay(state, null);
  }
  if (typeof updateInclusioWorkflowStatus === 'function') updateInclusioWorkflowStatus();
}

function scheduleInclusioFrameRedraw() {
  if (window._inclusioFrameQueued) return;
  window._inclusioFrameQueued = true;
  requestAnimationFrame(() => {
    window._inclusioFrameQueued = false;
    if (typeof renderInclusioFrameOverlays === 'function') renderInclusioFrameOverlays();
  });
}
window.scheduleInclusioFrameRedraw = scheduleInclusioFrameRedraw;
if (typeof window !== 'undefined') {
  window.renderInclusioFrameOverlay = renderInclusioFrameOverlay;
  window.renderInclusioFrameOverlays = renderInclusioFrameOverlays;
}

function updateInclusioWorkflowStatus() {
  const el = document.getElementById('inclusioWorkflowStatus');
  if (!el) return;
  if (inclusioDraw.active) {
    el.textContent = inclusioDraw.isDragging
      ? 'Drawing… release on the closing word to create the inclusio frame.'
      : 'Draw mode on: drag from the opening word to the closing word.';
    el.classList.remove('inclusio-status-warn');
    return;
  }
  ensureInclusios();
  migrateAllInclusios();
  const item = activeInclusio();
  if (!item) {
    el.textContent = 'No active inclusio. Click New Inclusio, Draw Inclusio, or Set Opening Anchor to create one. Then select a Hebrew word.';
    el.classList.remove('inclusio-status-warn');
    return;
  }
  const open = anchorDisplayLabel(item.openingAnchor);
  const close = anchorDisplayLabel(item.closingAnchor);
  const span = deriveInclusioSpan(item);
  let rails = 0;
  const ed = inclusioEditorRoot(null);
  if (ed) rails = ed.querySelectorAll('svg.inclusio-frame-svg line.inclusio-frame-rail').length;
  const bracketN = document.querySelectorAll('#editor .word.inclusio-bracket.bracket-start, #editor .word.inclusio-bracket.bracket-end').length;
  let msg = `Active: ${item.label || item.id}. Opening: ${open}. Closing: ${close}. Span: ${span}.`;
  if (item.openingAnchor && item.closingAnchor) {
    msg += rails >= 2 ? ` Frame rails: ${rails}.` : ' Frame pending — check margin envelope toggle.';
    if (bracketN < 2) msg += ' Endpoint brackets pending.';
  } else if (!locOK(state.selected)) {
    msg += ' Select a Hebrew word first.';
    el.classList.add('inclusio-status-warn');
  } else {
    msg += ' Select closing word, then Set Closing Anchor.';
    el.classList.remove('inclusio-status-warn');
  }
  if (item.openingAnchor && item.closingAnchor) el.classList.remove('inclusio-status-warn');
  el.textContent = msg;
}
window.updateInclusioWorkflowStatus = updateInclusioWorkflowStatus;

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
  if (!inc.color) inc.color = '#6B7280';
  if (inc.frameWeight && !INCLUSIO_FRAME_WEIGHTS.some(w => w.value === inc.frameWeight)) {
    delete inc.frameWeight;
  }
  if (inc.showMarginEnvelope == null) inc.showMarginEnvelope = true;
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
  if (!item) return '—';
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
      const pane = typeof isParallelActive === 'function' && isParallelActive() ? stateBundle.activePane : null;
      const open = anchorRangeOrdered(item.openingAnchor);
      const sel = open ? inclusioWordSelector(open.start, pane) : null;
      const w = sel ? document.querySelector(sel) : null;
      if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' });
      applyInclusioRegistryHighlight();
      if (typeof renderInclusioFrameOverlays === 'function') renderInclusioFrameOverlays();
    }, 60);
  }
}

function expandLegendInclusiosSection() {
  const section = document.getElementById('legendInclusiosSection');
  if (section) section.classList.remove('collapsed');
}

function addInclusio() {
  markUndo();
  ensureInclusios();
  const n = state.inclusios.length + 1;
  const label = `Inclusio ${String.fromCharCode(64 + ((n - 1) % 26) + 1)}`;
  const color = document.getElementById('inclusioColorInput')?.value
    || document.getElementById('inclusioColor')?.value
    || '#6B7280';
  const item = {
    id: 'inc' + Date.now(),
    label,
    color,
    showMarginEnvelope: true,
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
  expandLegendInclusiosSection();
  updateInclusioWorkflowStatus();
  render();
}

function inclusioDefaultColor() {
  return document.getElementById('inclusioColorInput')?.value
    || document.getElementById('inclusioColor')?.value
    || '#6B7280';
}

function drawInclusioDragPreview(svg, startLoc, endLoc, paneState) {
  if (!locOK(startLoc) || !locOK(endLoc) || locEqual(startLoc, endLoc)) return;
  const [openLoc, closeLoc] = orderedLocs(startLoc, endLoc);
  const preview = {
    id: '__inclusio_preview__',
    color: inclusioDefaultColor(),
    openingAnchor: makeTextAnchorFromLocs(openLoc, openLoc),
    closingAnchor: makeTextAnchorFromLocs(closeLoc, closeLoc),
    showMarginEnvelope: true,
    nestLevel: 0,
  };
  if (!preview.openingAnchor || !preview.closingAnchor) return;
  const bounds = inclusioEnvelopeBounds(preview, paneState, null);
  if (!bounds) return;
  drawInclusioEnvelopeRail(svg, bounds, preview, 0, 0, paneState, null, { preview: true });
}

function applyInclusioFrameHighlight() {
  const id = inclusioRegistryHoverId || state.activeInclusioId;
  document.querySelectorAll('svg.inclusio-frame-svg line.inclusio-frame-rail').forEach(line => {
    line.classList.toggle('inclusio-frame-rail-hot', !!(id && line.getAttribute('data-inc-id') === id));
  });
}

function addInclusioFromLocs(startLoc, endLoc) {
  if (!locOK(startLoc) || !locOK(endLoc) || locEqual(startLoc, endLoc)) return null;
  const [openLoc, closeLoc] = orderedLocs(startLoc, endLoc);
  markUndo();
  ensureInclusios();
  const n = state.inclusios.length + 1;
  const label = `Inclusio ${String.fromCharCode(64 + ((n - 1) % 26) + 1)}`;
  const color = inclusioDefaultColor();
  const openingAnchor = makeTextAnchorFromLocs(openLoc, openLoc);
  const closingAnchor = makeTextAnchorFromLocs(closeLoc, closeLoc);
  if (!openingAnchor || !closingAnchor) return null;
  const o = openingAnchor.normalizedText || '';
  const c = closingAnchor.normalizedText || '';
  const item = {
    id: 'inc' + Date.now(),
    label,
    color,
    showMarginEnvelope: true,
    relationshipKind: 'inclusio',
    openingAnchor,
    closingAnchor,
    theme: '',
    relationshipBasis: '',
    evidence: o && c ? (o === c ? o : `${o} … ${c}`) : '',
    notes: '',
  };
  state.inclusios.push(item);
  state.activeInclusioId = item.id;
  state.selected = cloneLoc(closeLoc);
  inclusioPhraseDraft = null;
  syncStateBundle();
  if (typeof syncAllPaneInclusioWordMarkers === 'function') syncAllPaneInclusioWordMarkers();
  else syncInclusioWordMarkers();
  expandLegendInclusiosSection();
  if (autosaveReady) autoSaveProject();
  return item;
}
window.addInclusioFromLocs = addInclusioFromLocs;

function toggleDrawInclusioMode(force) {
  if (typeof isParallelActive === 'function' && isParallelActive()) {
    if (force !== false) alert('Draw Inclusio is available in single-pane mode.');
    return;
  }
  const next = typeof force === 'boolean' ? force : !inclusioDraw.active;
  if (next && typeof toggleDrawArcMode === 'function' && window.arcDraw && window.arcDraw.active) {
    toggleDrawArcMode(false);
  }
  inclusioDraw.active = next;
  inclusioDraw.isDragging = false;
  inclusioDraw.start = null;
  inclusioDraw.current = null;
  const wrap = document.getElementById('editorWrap');
  const btn = document.getElementById('drawInclusioMode');
  if (wrap) wrap.classList.toggle('inclusio-draw-active', inclusioDraw.active);
  if (btn) {
    btn.textContent = inclusioDraw.active ? 'Drawing Inclusio…' : 'Draw Inclusio';
    btn.classList.toggle('warn', inclusioDraw.active);
    btn.classList.toggle('primary', !inclusioDraw.active);
  }
  updateInclusioWorkflowStatus();
  scheduleInclusioFrameRedraw();
}
window.toggleDrawInclusioMode = toggleDrawInclusioMode;

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
  if (!locOK(state.selected)) {
    updateInclusioWorkflowStatus();
    alert('Select a Hebrew word first.');
    return;
  }
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
  syncStateBundle();
  if (typeof syncAllPaneInclusioWordMarkers === 'function') syncAllPaneInclusioWordMarkers();
  else syncInclusioWordMarkers();
  updateInclusioPhraseStatus();
  expandLegendInclusiosSection();
  render();
  requestAnimationFrame(() => {
    scheduleInclusioFrameRedraw();
    updateInclusioWorkflowStatus();
  });
}

function clearInclusioWordMarkersOnVerses(verses) {
  if (!Array.isArray(verses)) return;
  verses.forEach(v => v.clauses.forEach(c => c.words.forEach(w => {
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

function syncInclusioWordMarkers(paneState) {
  const st = paneState || state;
  if (!st || !Array.isArray(st.verses)) return;
  if (!Array.isArray(st.inclusios)) st.inclusios = [];
  st.inclusios = st.inclusios.map(migrateInclusioItem).filter(Boolean);
  clearInclusioWordMarkersOnVerses(st.verses);
  const verses = st.verses;
  st.inclusios.forEach(item => {
    const color = item.color || '#6B7280';
    const markAnchor = (anchor, side) => {
      const ord = anchorRangeOrdered(anchor);
      if (!ord) return;
      const l = side === 'opening' ? ord.start : ord.end;
      const w = verses[l.v]?.clauses[l.c]?.words[l.w];
      if (!w || isMaqafConnector(w)) return;
      w.inclusioId = item.id;
      w.inclusioColor = color;
      w.inclusioAnchorSide = side;
      w.inclusioRole = side === 'opening' ? 'opening-start' : 'closing-end';
      w.bracketColor = color;
      w.bracketColorSource = 'inclusio';
      w.bracketSource = 'inclusio';
      if (side === 'opening') w.bracketStart = true;
      else w.bracketEnd = true;
    };
    if (item.openingAnchor) markAnchor(item.openingAnchor, 'opening');
    if (item.closingAnchor) markAnchor(item.closingAnchor, 'closing');
  });
}

function clearInclusioWordMarkers() {
  clearInclusioWordMarkersOnVerses(state.verses);
}

function syncAllPaneInclusioWordMarkers() {
  ensureStateBundle();
  if (typeof isParallelActive === 'function' && isParallelActive()) {
    stateBundle.panes.forEach(p => syncInclusioWordMarkers(p));
  } else {
    ensureInclusios();
    migrateAllInclusios();
    syncInclusioWordMarkers(state);
  }
}
if (typeof window !== 'undefined') window.syncAllPaneInclusioWordMarkers = syncAllPaneInclusioWordMarkers;

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
  applyInclusioFrameHighlight();
  const id = inclusioRegistryHoverId || state.activeInclusioId;
  if (!id) return;
  const item = state.inclusios.find(x => x.id === id);
  if (!item) return;
  const cls = inclusioRegistryHoverId ? 'inclusio-registry-hover' : 'inclusio-anchor-active';
  const activePane = typeof isParallelActive === 'function' && isParallelActive() ? stateBundle.activePane : null;
  document.querySelectorAll('.word.inclusio-bracket').forEach(el => {
    if (activePane != null && el.dataset.pane != null && +el.dataset.pane !== activePane) return;
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
  html += '</div>';
  html += '<div class="inclusio-field-row inclusio-color-row"><span class="small"><strong>Frame color</strong></span>';
  INCLUSIO_COLOR_PRESETS.forEach(p => {
    const sel = (active?.color || '#6B7280').toLowerCase() === p.value.toLowerCase();
    html += `<button type="button" class="btn small inclusio-color-preset${sel ? ' primary' : ''}" data-inc-color="${esc(p.value)}" title="${esc(p.name)}">${esc(p.name)}</button>`;
  });
  html += '<label class="small inclusio-custom-color">Custom <input id="inclusioColorInput" type="color" value="' + esc(active?.color || '#6B7280') + '"></label>';
  html += '</div>';
  html += '<label class="small">Frame weight <select id="inclusioFrameWeightSelect">';
  html += `<option value=""${!active?.frameWeight ? ' selected' : ''}>Auto (by nest level)</option>`;
  INCLUSIO_FRAME_WEIGHTS.forEach(w => {
    html += `<option value="${esc(w.value)}"${active?.frameWeight === w.value ? ' selected' : ''}>${esc(w.label)}</option>`;
  });
  html += '</select></label>';
  html += '<label class="small inclusio-envelope-toggle"><input type="checkbox" id="inclusioEnvelopeToggle"' + (active?.showMarginEnvelope !== false ? ' checked' : '') + '> Show margin envelope</label>';

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
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el[ev] = () => {
      const item = activeInclusio();
      if (!item) return;
      markUndo();
      fn(item, el);
      autoSaveProject();
      if (id === '#inclusioColorInput') syncInclusioWordMarkers();
      if (id === '#inclusioColorInput' || id === '#inclusioLabelInput' || id === '#inclusioEnvelopeToggle') renderInclusioRegistry();
    };
  };
  bindField('#inclusioLabelInput', (item, el) => { item.label = el.value; });
  bindField('#inclusioColorInput', (item, el) => {
    item.color = el.value;
    renderInclusioEditor();
    syncInclusioWordMarkers();
    scheduleInclusioFrameRedraw();
  });
  bindField('#inclusioFrameWeightSelect', (item, el) => {
    item.frameWeight = el.value || null;
    if (!item.frameWeight) delete item.frameWeight;
    renderInclusioRegistry();
    scheduleInclusioFrameRedraw();
  });
  bindField('#inclusioEnvelopeToggle', (item, el) => {
    item.showMarginEnvelope = !!el.checked;
    scheduleInclusioFrameRedraw();
  });
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
  box.querySelectorAll('.inclusio-color-preset').forEach(btn => {
    btn.onclick = () => {
      const item = activeInclusio();
      if (!item) return;
      markUndo();
      item.color = btn.dataset.incColor;
      syncInclusioWordMarkers();
      autoSaveProject();
      renderInclusioEditor();
      renderInclusioRegistry();
      scheduleInclusioFrameRedraw();
    };
  });
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
    const weight = inc.frameWeight || (inc.nestLevel > 0 ? 'thin' : 'medium');
    html += `<div class="inclusio-registry-row${active ? ' active' : ''}" data-inc-id="${esc(inc.id)}" tabindex="0" role="button">`;
    html += `<div class="inclusio-registry-row-head"><span class="inclusio-registry-swatch" style="border-color:${esc(inc.color || '#6B7280')}" title="Frame color"></span>`;
    html += `<span class="inclusio-registry-marker" style="color:${esc(inc.color || '#6B7280')}">[${letter}]</span>`;
    html += `<span class="inclusio-registry-label">${esc(inc.label || ('Inclusio ' + letter))}</span>`;
    html += `<span class="inclusio-registry-style muted small">${esc(weight)}</span>`;
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
  renderInclusioEditor();
  renderInclusioRegistry();
  updateInclusioWorkflowStatus();
  setTimeout(() => {
    applyInclusioRegistryHighlight();
    scheduleInclusioFrameRedraw();
  }, 0);
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

(function bindInclusioRenderHook() {
  function install() {
    if (typeof renderEditor !== 'function' || window._inclusioRenderHookBound) return;
    window._inclusioRenderHookBound = true;
    const prev = renderEditor;
    renderEditor = function inclusioRenderEditorHook() {
      prev();
      scheduleInclusioFrameRedraw();
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

(function initInclusioDrawTool() {
  function bind() {
    const btn = document.getElementById('drawInclusioMode');
    if (btn && !btn.dataset.inclusioDrawBound) {
      btn.dataset.inclusioDrawBound = '1';
      btn.onclick = () => toggleDrawInclusioMode();
    }
    const wrap = document.getElementById('editorWrap');
    if (!wrap || wrap.dataset.inclusioDrawBound) return;
    wrap.dataset.inclusioDrawBound = '1';
    wrap.addEventListener('pointerdown', e => {
      if (!inclusioDraw.active || typeof nearestWordLocFromPoint !== 'function') return;
      const loc = nearestWordLocFromPoint(e.clientX, e.clientY);
      if (!loc) return;
      e.preventDefault();
      e.stopPropagation();
      inclusioDraw.isDragging = true;
      inclusioDraw.start = cloneLoc(loc);
      inclusioDraw.current = cloneLoc(loc);
      state.selected = cloneLoc(loc);
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      scheduleInclusioFrameRedraw();
    }, true);
    wrap.addEventListener('pointermove', e => {
      if (!inclusioDraw.active || !inclusioDraw.isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof nearestWordLocFromPoint !== 'function') return;
      const loc = nearestWordLocFromPoint(e.clientX, e.clientY);
      if (loc) {
        inclusioDraw.current = cloneLoc(loc);
        scheduleInclusioFrameRedraw();
      }
    }, true);
    wrap.addEventListener('pointerup', e => {
      if (!inclusioDraw.active || !inclusioDraw.isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      const end = typeof nearestWordLocFromPoint === 'function'
        ? (nearestWordLocFromPoint(e.clientX, e.clientY) || inclusioDraw.current)
        : inclusioDraw.current;
      const start = inclusioDraw.start;
      inclusioDraw.isDragging = false;
      inclusioDraw.start = null;
      inclusioDraw.current = null;
      try { wrap.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const item = start && end ? addInclusioFromLocs(start, end) : null;
      if (item) {
        toggleDrawInclusioMode(false);
        render();
      } else {
        scheduleInclusioFrameRedraw();
      }
    }, true);
    wrap.addEventListener('pointercancel', () => {
      inclusioDraw.isDragging = false;
      inclusioDraw.start = null;
      inclusioDraw.current = null;
      scheduleInclusioFrameRedraw();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
