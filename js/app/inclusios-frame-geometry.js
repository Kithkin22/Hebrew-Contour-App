/* Inclusio unit-frame geometry — anchor-aligned vertical bounds, word-block horizontal rails */
const INCLUSIO_FRAME_PADDING = {
  top: 10,
  bottom: 10,
  left: 44,
  right: 57,
};
window.INCLUSIO_FRAME_PADDING = INCLUSIO_FRAME_PADDING;

const INCLUSIO_UNIT_FRAME = {
  ...INCLUSIO_FRAME_PADDING,
  nestRailGap: 40,
  capLen: 12,
  /* legacy aliases used by gutter sync */
  marginBase: INCLUSIO_FRAME_PADDING.left,
  marginStep: 40,
  anchorPad: INCLUSIO_FRAME_PADDING.top,
  unitPad: 0,
  textPad: 0,
};
window.INCLUSIO_UNIT_FRAME = INCLUSIO_UNIT_FRAME;

function inclusioWordElement(l, ed, pane) {
  if (!ed || !l) return null;
  const sel = typeof inclusioWordSelector === 'function'
    ? inclusioWordSelector(l, pane)
    : `.word[data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`;
  return ed.querySelector(`:scope ${sel}`) || document.querySelector(sel);
}

/** Union of word boxes for words in a loc range. */
function inclusioWordsBoundsForRange(rangeStart, rangeEnd, paneState, pane) {
  if (!rangeStart || !rangeEnd || !paneState?.verses?.length) return null;
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  if (!ed) return null;
  const scale = typeof inclusioEditorScale === 'function' ? inclusioEditorScale() : 1;
  const er = ed.getBoundingClientRect();
  const verses = paneState.verses;
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  let found = false;
  verses.forEach((v, vi) => v.clauses.forEach((c, ci) => c.words.forEach((w, wi) => {
    if (typeof isMaqafConnector === 'function' && isMaqafConnector(w)) return;
    const l = { v: vi, c: ci, w: wi };
    if (!locInRangeInVerses(l, rangeStart, rangeEnd, verses)) return;
    const el = inclusioWordElement(l, ed, pane);
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
  };
}

/** Union of word boxes for one anchor range (opening or closing phrase). */
function inclusioAnchorWordsBounds(anchor, paneState, pane) {
  const ord = typeof anchorRangeOrdered === 'function' ? anchorRangeOrdered(anchor) : null;
  if (!ord) return null;
  return inclusioWordsBoundsForRange(ord.start, ord.end, paneState, pane);
}
window.inclusioAnchorWordsBounds = inclusioAnchorWordsBounds;

/** Clauses touched by a loc range — full line boxes for vertical alignment. */
function inclusioClausesBoundsForRange(rangeStart, rangeEnd, paneState, pane) {
  if (!rangeStart || !rangeEnd || !paneState?.verses?.length) return null;
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  if (!ed) return null;
  const scale = typeof inclusioEditorScale === 'function' ? inclusioEditorScale() : 1;
  const er = ed.getBoundingClientRect();
  const verses = paneState.verses;
  let top = Infinity;
  let bottom = -Infinity;
  let found = false;
  verses.forEach((v, vi) => v.clauses.forEach((c, ci) => {
    let clauseHit = false;
    c.words.forEach((w, wi) => {
      if (typeof isMaqafConnector === 'function' && isMaqafConnector(w)) return;
      if (locInRangeInVerses({ v: vi, c: ci, w: wi }, rangeStart, rangeEnd, verses)) clauseHit = true;
    });
    if (!clauseHit) return;
    const el = ed.querySelector(`:scope .clause[data-v="${vi}"][data-c="${ci}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    found = true;
  }));
  if (!found) return null;
  return {
    top: (top - er.top) / scale,
    bottom: (bottom - er.top) / scale,
  };
}
window.inclusioClausesBoundsForRange = inclusioClausesBoundsForRange;

/**
 * Unit bounds: one expanded rectangle around the literary unit.
 * Vertical and horizontal from the full anchor span (all words between opening and closing).
 * Top/bottom snap to contour line boxes so frames clear vowel points and line rhythm.
 */
function inclusioUnitBounds(inc, paneState, pane) {
  const item = typeof migrateInclusioItem === 'function' ? migrateInclusioItem(inc) : inc;
  const open = anchorRangeOrdered(item?.openingAnchor);
  const close = anchorRangeOrdered(item?.closingAnchor);
  if (!open || !close || !paneState?.verses?.length) return null;
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  if (!ed) return null;
  const spanWords = inclusioWordsBoundsForRange(open.start, close.end, paneState, pane);
  const clauseBounds = inclusioClausesBoundsForRange(open.start, close.end, paneState, pane);
  if (!spanWords) return null;
  const pad = INCLUSIO_FRAME_PADDING;
  const textTop = clauseBounds ? Math.min(spanWords.top, clauseBounds.top) : spanWords.top;
  const textBottom = spanWords.bottom;
  return {
    top: textTop - pad.top,
    bottom: textBottom + pad.bottom,
    left: spanWords.left - pad.left,
    right: spanWords.right + pad.right,
    width: Math.max(ed.scrollWidth, ed.offsetWidth, 1),
    height: Math.max(ed.scrollHeight, ed.offsetHeight, 1),
  };
}
window.inclusioUnitBounds = inclusioUnitBounds;

/** Independent bracket rails per inclusio; nested frames stay inside parents with a clear gap. */
function computeInclusioBracketRails(entries, maxNest, contentW) {
  const gap = INCLUSIO_UNIT_FRAME.nestRailGap;
  const placed = [];
  const out = [];

  entries.forEach((entry) => {
    const bounds = entry.bounds;
    const level = entry.level || 0;
    const layerOut = Math.max(0, (maxNest || 0) - level) * gap;
    let xL = bounds.left - layerOut;
    let xR = bounds.right + layerOut;
    const y1 = Math.max(0, bounds.top);
    const y2 = Math.min(bounds.height, bounds.bottom);
    const textFloorL = bounds.left;
    const textCeilR = bounds.right;

    placed.forEach((parent) => {
      const needL = parent.xL + gap;
      const needR = parent.xR - gap;
      if (needL <= textFloorL) xL = Math.max(xL, needL);
      if (needR >= textCeilR) xR = Math.min(xR, needR);
    });

    xL = Math.min(xL, textFloorL);
    xR = Math.max(xR, textCeilR);

    const rail = { xL, xR, y1, y2, level };
    placed.push(rail);
    out.push(rail);
  });
  return out;
}
window.computeInclusioBracketRails = computeInclusioBracketRails;

function inclusioUnitRailX(bounds, level, maxNest, contentW) {
  const rails = computeInclusioBracketRails([{ bounds, level }], maxNest || 0, contentW);
  const r = rails[0];
  return { xL: r.xL, xR: r.xR };
}
window.inclusioUnitRailX = inclusioUnitRailX;

function drawInclusioUnitFrame(svg, bounds, inc, level, maxNest, opts, railOverride) {
  opts = opts || {};
  const color = inc.color || '#64748B';
  const preset = { thin: 1.25, medium: 2, thick: 2.75 };
  const strokeWidth = (inc.frameWeight && preset[inc.frameWeight])
    ? preset[inc.frameWeight]
    : Math.max(1.25, 2.75 - (level || 0) * 0.55);
  const opacity = opts.preview ? 0.5 : Math.max(0.5, 0.95 - (level || 0) * 0.55);
  const rail = railOverride || computeInclusioBracketRails(
    [{ bounds, level: level || 0 }],
    maxNest || 0,
    bounds.width
  )[0];
  const { xL, xR, y1, y2 } = rail;
  const cap = INCLUSIO_UNIT_FRAME.capLen;
  const railCls = opts.preview ? 'inclusio-frame-rail inclusio-frame-rail-preview' : 'inclusio-frame-rail';
  const mk = (x1, y1v, x2, y2v, extraCls) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', extraCls ? `${railCls} ${extraCls}` : railCls);
    line.setAttribute('data-inc-id', inc.id || '');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1v));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2v));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(strokeWidth));
    line.setAttribute('opacity', String(opacity));
    line.setAttribute('pointer-events', 'none');
    svg.appendChild(line);
  };
  mk(xL, y1, xL, y2);
  mk(xR, y1, xR, y2);
  mk(xL, y1, xL + cap, y1, 'inclusio-frame-endcap');
  mk(xR - cap, y1, xR, y1, 'inclusio-frame-endcap');
  mk(xL, y2, xL + cap, y2, 'inclusio-frame-endcap');
  mk(xR - cap, y2, xR, y2, 'inclusio-frame-endcap');
}
window.drawInclusioUnitFrame = drawInclusioUnitFrame;
