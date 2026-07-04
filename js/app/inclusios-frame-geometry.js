/* Inclusio unit-frame geometry — literary-unit bounds, margin rails (not word boxes) */
const INCLUSIO_UNIT_FRAME = {
  textPad: 8,
  marginBase: 28,
  marginStep: 24,
  edgePad: 10,
  capLen: 12,
};
window.INCLUSIO_UNIT_FRAME = INCLUSIO_UNIT_FRAME;

function inclusioClauseInRange(vi, ci, open, close, verses) {
  const clause = verses[vi]?.clauses[ci];
  if (!clause) return false;
  for (let wi = 0; wi < clause.words.length; wi++) {
    if (typeof isMaqafConnector === 'function' && isMaqafConnector(clause.words[wi])) continue;
    const l = { v: vi, c: ci, w: wi };
    if (locInRangeInVerses(l, open.start, close.end, verses)) return true;
  }
  return false;
}

function inclusioClauseElement(vi, ci, ed, pane) {
  if (!ed) return null;
  const sel = `.clause[data-v="${vi}"][data-c="${ci}"]`;
  if (pane != null) {
    const scoped = ed.querySelector(`${sel}`);
    if (scoped) return scoped;
  }
  return ed.querySelector(`:scope ${sel}`) || ed.querySelector(sel);
}

/** Union of spanned clause line boxes in editor coordinates (not per-word). */
function inclusioUnitBounds(inc, paneState, pane) {
  const item = typeof migrateInclusioItem === 'function' ? migrateInclusioItem(inc) : inc;
  const open = anchorRangeOrdered(item?.openingAnchor);
  const close = anchorRangeOrdered(item?.closingAnchor);
  if (!open || !close || !paneState?.verses?.length) return null;
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
  verses.forEach((v, vi) => v.clauses.forEach((c, ci) => {
    if (!inclusioClauseInRange(vi, ci, open, close, verses)) return;
    const el = inclusioClauseElement(vi, ci, ed, pane);
    if (!el) return;
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    found = true;
  }));
  if (!found) return null;
  const pad = INCLUSIO_UNIT_FRAME.textPad;
  return {
    top: (top - er.top) / scale - pad,
    bottom: (bottom - er.top) / scale + pad,
    left: (left - er.left) / scale - pad,
    right: (right - er.left) / scale + pad,
    width: Math.max(ed.scrollWidth, ed.offsetWidth, 1),
    height: Math.max(ed.scrollHeight, ed.offsetHeight, 1),
  };
}
window.inclusioUnitBounds = inclusioUnitBounds;

function inclusioUnitRailX(bounds, level, maxNest, contentW) {
  const outward = INCLUSIO_UNIT_FRAME.marginBase
    + Math.max(0, (maxNest || 0) - (level || 0)) * INCLUSIO_UNIT_FRAME.marginStep;
  return {
    xL: Math.max(INCLUSIO_UNIT_FRAME.edgePad, bounds.left - outward),
    xR: Math.min(contentW - INCLUSIO_UNIT_FRAME.edgePad, bounds.right + outward),
  };
}
window.inclusioUnitRailX = inclusioUnitRailX;

function drawInclusioUnitFrame(svg, bounds, inc, level, maxNest, opts) {
  opts = opts || {};
  const color = inc.color || '#64748B';
  const preset = { thin: 1.25, medium: 2, thick: 2.75 };
  const strokeWidth = (inc.frameWeight && preset[inc.frameWeight])
    ? preset[inc.frameWeight]
    : Math.max(1.25, 2.75 - (level || 0) * 0.55);
  const opacity = opts.preview ? 0.5 : Math.max(0.5, 0.95 - (level || 0) * 0.1);
  const { xL, xR } = inclusioUnitRailX(bounds, level, maxNest, bounds.width);
  const y1 = Math.max(0, bounds.top);
  const y2 = Math.min(bounds.height, bounds.bottom);
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
