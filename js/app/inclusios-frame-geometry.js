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

function inclusioMeasureScale(ed) {
  const inner = ed?.closest?.('.contour-page-zoom-inner');
  if (inner) {
    const t = getComputedStyle(inner).transform;
    if (t && t !== 'none') {
      const sx = new DOMMatrix(t).a;
      if (sx > 0 && Number.isFinite(sx)) return sx;
    }
  }
  return typeof inclusioEditorScale === 'function' ? inclusioEditorScale() : 1;
}

/** Layout-space rect of el relative to editor root (stable under page zoom). */
function inclusioRectRelativeToEditor(el, ed) {
  if (!el || !ed) return null;
  const scale = inclusioMeasureScale(ed);
  const er = ed.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    top: (r.top - er.top) / scale,
    bottom: (r.bottom - er.top) / scale,
    left: (r.left - er.left) / scale,
    right: (r.right - er.left) / scale,
  };
}

/** Clauses in document order that intersect a loc range. */
function inclusioClausesInRangeOrdered(rangeStart, rangeEnd, paneState) {
  if (!rangeStart || !rangeEnd || !paneState?.verses?.length) return [];
  const verses = paneState.verses;
  const hits = [];
  verses.forEach((v, vi) => v.clauses.forEach((c, ci) => {
    const inRange = c.words.some((w, wi) => {
      if (typeof isMaqafConnector === 'function' && isMaqafConnector(w)) return false;
      return locInRangeInVerses({ v: vi, c: ci, w: wi }, rangeStart, rangeEnd, verses);
    });
    if (!inRange) return;
    const rank = locRankInVerses({ v: vi, c: ci, w: 0 }, verses);
    hits.push({ v: vi, c: ci, rank });
  }));
  hits.sort((a, b) => a.rank - b.rank);
  return hits;
}

/** Word bounds for words of one clause that fall inside a loc range. */
function inclusioClauseWordsBoundsInRange(vi, ci, rangeStart, rangeEnd, paneState, pane) {
  const verses = paneState?.verses;
  const clause = verses?.[vi]?.clauses?.[ci];
  if (!clause?.words?.length) return null;
  let firstW = null;
  let lastW = null;
  clause.words.forEach((w, wi) => {
    if (typeof isMaqafConnector === 'function' && isMaqafConnector(w)) return;
    if (!locInRangeInVerses({ v: vi, c: ci, w: wi }, rangeStart, rangeEnd, verses)) return;
    if (firstW == null) firstW = wi;
    lastW = wi;
  });
  if (firstW == null || lastW == null) return null;
  return inclusioWordsBoundsForRange(
    { v: vi, c: ci, w: firstW },
    { v: vi, c: ci, w: lastW },
    paneState,
    pane
  );
}

/** Word bounds for a single contour line (clause). */
function inclusioClauseWordsBounds(vi, ci, paneState, pane) {
  const clause = paneState?.verses?.[vi]?.clauses?.[ci];
  if (!clause?.words?.length) return null;
  let lastW = clause.words.length - 1;
  while (lastW > 0 && typeof isMaqafConnector === 'function' && isMaqafConnector(clause.words[lastW])) lastW--;
  return inclusioWordsBoundsForRange(
    { v: vi, c: ci, w: 0 },
    { v: vi, c: ci, w: lastW },
    paneState,
    pane
  );
}

/** First/last contour line tops and bottoms for a span. */
function inclusioEdgeLineBounds(rangeStart, rangeEnd, paneState, pane) {
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  const clauses = inclusioClausesInRangeOrdered(rangeStart, rangeEnd, paneState);
  if (!ed || !clauses.length) return null;
  const first = clauses[0];
  const last = clauses[clauses.length - 1];
  const firstClauseEl = ed.querySelector(`:scope .clause[data-v="${first.v}"][data-c="${first.c}"]`);
  const lastClauseEl = ed.querySelector(`:scope .clause[data-v="${last.v}"][data-c="${last.c}"]`);
  const firstClause = firstClauseEl ? inclusioRectRelativeToEditor(firstClauseEl, ed) : null;
  const lastClause = lastClauseEl ? inclusioRectRelativeToEditor(lastClauseEl, ed) : null;
  const firstLineWords = inclusioClauseWordsBounds(first.v, first.c, paneState, pane)
    || inclusioClauseWordsBoundsInRange(first.v, first.c, rangeStart, rangeEnd, paneState, pane);
  const lastLineWords = inclusioClauseWordsBounds(last.v, last.c, paneState, pane)
    || inclusioClauseWordsBoundsInRange(last.v, last.c, rangeStart, rangeEnd, paneState, pane);
  if (!firstLineWords && !firstClause) return null;
  if (!lastLineWords && !lastClause) return null;
  const niqqudClearance = 4;
  const firstLineTop = Math.min(
    firstClause?.top ?? Infinity,
    firstLineWords?.top ?? Infinity
  ) - niqqudClearance;
  const lastLineBottom = Math.max(
    lastClause?.bottom ?? -Infinity,
    lastLineWords?.bottom ?? -Infinity
  );
  if (!Number.isFinite(firstLineTop) || !Number.isFinite(lastLineBottom)) return null;
  return { firstLineTop, lastLineBottom, lastClause: last };
}
window.inclusioEdgeLineBounds = inclusioEdgeLineBounds;

function inclusioNextClauseTop(vi, ci, paneState, pane) {
  const verses = paneState?.verses;
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  if (!verses?.length || !ed) return null;
  let nv = vi;
  let nc = ci + 1;
  if (nc >= verses[vi].clauses.length) {
    nv += 1;
    nc = 0;
  }
  if (nv >= verses.length || !verses[nv]?.clauses?.[nc]) return null;
  const el = ed.querySelector(`:scope .clause[data-v="${nv}"][data-c="${nc}"]`);
  if (!el) return null;
  const box = inclusioRectRelativeToEditor(el, ed);
  return box ? box.top : null;
}

/** Union of word boxes for words in a loc range. */
function inclusioWordsBoundsForRange(rangeStart, rangeEnd, paneState, pane) {
  if (!rangeStart || !rangeEnd || !paneState?.verses?.length) return null;
  const ed = typeof inclusioEditorRoot === 'function' ? inclusioEditorRoot(pane) : document.getElementById('editor');
  if (!ed) return null;
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
    const box = inclusioRectRelativeToEditor(el, ed);
    if (!box) return;
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    found = true;
  })));
  if (!found) return null;
  return { top, bottom, left, right };
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
    const box = inclusioRectRelativeToEditor(el, ed);
    if (!box) return;
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
    found = true;
  }));
  if (!found) return null;
  return { top, bottom };
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
  const edgeLines = inclusioEdgeLineBounds(open.start, close.end, paneState, pane);
  if (!spanWords) return null;
  const pad = INCLUSIO_FRAME_PADDING;
  const textTop = edgeLines ? edgeLines.firstLineTop : spanWords.top;
  const textBottom = edgeLines ? edgeLines.lastLineBottom : spanWords.bottom;
  let bottom = textBottom + pad.bottom;
  if (edgeLines?.lastClause) {
    const nextTop = inclusioNextClauseTop(edgeLines.lastClause.v, edgeLines.lastClause.c, paneState, pane);
    if (nextTop != null) bottom = Math.min(bottom, nextTop - 2);
  }
  bottom = Math.max(bottom, spanWords.bottom);
  const contentH = Math.max(ed.scrollHeight, ed.offsetHeight, bottom + pad.bottom, 1);
  return {
    top: textTop - pad.top,
    bottom,
    left: spanWords.left - pad.left,
    right: spanWords.right + pad.right,
    width: Math.max(ed.scrollWidth, ed.offsetWidth, 1),
    height: contentH,
  };
}
window.inclusioUnitBounds = inclusioUnitBounds;

function inclusioRailsOverlapVertically(a, b) {
  return a.y1 < b.y2 && a.y2 > b.y1;
}

function inclusioBoundsNestWithin(outer, inner) {
  if (!outer || !inner) return false;
  return inner.top >= outer.top - 1
    && inner.bottom <= outer.bottom + 1
    && inner.left >= outer.left - 1
    && inner.right <= outer.right + 1
    && !(Math.abs(inner.top - outer.top) < 1
      && Math.abs(inner.bottom - outer.bottom) < 1
      && Math.abs(inner.left - outer.left) < 1
      && Math.abs(inner.right - outer.right) < 1);
}

/** Bracket rails per unit; nested frames inset inside parents, siblings stay independent. */
function computeInclusioBracketRails(entries, maxNest, contentW) {
  const gap = INCLUSIO_UNIT_FRAME.nestRailGap;
  const minTextGap = Math.min(INCLUSIO_FRAME_PADDING.left, INCLUSIO_FRAME_PADDING.right) * 0.5;
  const placed = [];
  const out = [];

  entries.forEach((entry) => {
    const bounds = entry.bounds;
    const level = entry.level || 0;
    let xL = bounds.left;
    let xR = bounds.right;
    const y1 = Math.max(0, bounds.top);
    const y2 = bounds.bottom;

    placed.forEach((parent) => {
      if (!inclusioRailsOverlapVertically(parent, { y1, y2 })) return;
      if (!inclusioBoundsNestWithin(parent.bounds, bounds)) return;
      xL = Math.max(xL, parent.xL + gap);
      xR = Math.min(xR, parent.xR - gap);
    });

    if (xR - xL < 12) {
      xL = bounds.left;
      xR = bounds.right;
    }

    const wordL = bounds.left + INCLUSIO_FRAME_PADDING.left;
    const wordR = bounds.right - INCLUSIO_FRAME_PADDING.right;
    if (wordL - xL < minTextGap) {
      xL = wordL - minTextGap;
      placed.forEach((parent) => {
        if (!inclusioRailsOverlapVertically(parent, { y1, y2 })) return;
        if (!inclusioBoundsNestWithin(parent.bounds, bounds)) return;
        if (parent.xL > xL - gap) parent.xL = xL - gap;
      });
    }
    if (xR - wordR < minTextGap) {
      xR = wordR + minTextGap;
      placed.forEach((parent) => {
        if (!inclusioRailsOverlapVertically(parent, { y1, y2 })) return;
        if (!inclusioBoundsNestWithin(parent.bounds, bounds)) return;
        if (parent.xR < xR + gap) parent.xR = xR + gap;
      });
    }

    const rail = { xL, xR, y1, y2, level, bounds };
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
