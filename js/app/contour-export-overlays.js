/* Contour PDF/HTML export — arc + unit-frame SVG overlays (matches editor view) */

function wordElForLocExport(l, ed) {
  if (!l || !ed || !locOK(l)) return null;
  return ed.querySelector(`.word[data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`);
}

function arcGeometryForExport(start, end, ed, isGreek) {
  const a = wordElForLocExport(start, ed);
  const b = wordElForLocExport(end, ed);
  if (!a || !b || !ed) return null;
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  const er = ed.getBoundingClientRect();
  const layoutW = Math.max(ed.offsetWidth, ed.scrollWidth, 1);
  const y1 = ar.top + ar.height / 2 - er.top;
  const y2 = br.top + br.height / 2 - er.top;
  const anchor1 = (isGreek ? ar.left - er.left : ar.right - er.left);
  const anchor2 = (isGreek ? br.left - er.left : br.right - er.left);
  const textEdge = (isGreek
    ? Math.min(ar.left, br.left) - er.left
    : Math.max(ar.right, br.right) - er.left);
  const sideX = isGreek ? Math.max(8, textEdge - 46) : Math.min(layoutW - 8, textEdge + 46);
  const mid = (y1 + y2) / 2;
  return { isGreek, y1, y2, anchor1, anchor2, sideX, mid };
}

function buildExportArcSvgElement(ed, arcs, isGreek) {
  if (!ed || !arcs || !arcs.length) return null;
  if (typeof drawArcPath !== 'function') return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'contour-export-arc-svg');
  svg.setAttribute('aria-hidden', 'true');
  const contentW = Math.max(ed.scrollWidth, ed.offsetWidth, 1);
  let contentH = Math.max(ed.scrollHeight, ed.offsetHeight, 1);
  svg.setAttribute('viewBox', `0 0 ${contentW} ${contentH}`);
  svg.setAttribute('width', String(contentW));
  svg.setAttribute('height', String(contentH));
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = contentW + 'px';
  svg.style.height = contentH + 'px';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'visible';
  arcs.forEach((arc) => {
    const geo = arcGeometryForExport(arc.start, arc.end, ed, isGreek);
    if (!geo) return;
    const color = arc.color || '#0b61d8';
    if (typeof drawArcPath === 'function') drawArcPath(svg, geo, color);
    if (typeof drawArcLabel === 'function') drawArcLabel(svg, geo, arc, color);
    contentH = Math.max(contentH, geo.y2 + 8, geo.y1 + 8);
  });
  svg.setAttribute('height', String(contentH));
  svg.style.height = contentH + 'px';
  return svg;
}

function buildExportInclusioSvgElement(ed, paneState) {
  if (!ed || !paneState?.inclusios?.length) return null;
  if (typeof inclusioUnitBounds !== 'function' || typeof drawInclusioUnitFrame !== 'function') return null;
  const prevRoot = window.__contourExportRoot;
  window.__contourExportRoot = ed;
  try {
    const spans = typeof computeInclusioNestLevels === 'function'
      ? computeInclusioNestLevels(paneState.inclusios, paneState.verses)
      : paneState.inclusios.map((inc) => ({ inc, level: 0 }));
    const maxNest = typeof inclusioMaxNestLevel === 'function'
      ? inclusioMaxNestLevel(spans)
      : 0;
    spans.sort((a, b) => (a.inc.nestLevel || 0) - (b.inc.nestLevel || 0));
    const bracketEntries = [];
    spans.forEach(({ inc }) => {
      const item = typeof migrateInclusioItem === 'function' ? migrateInclusioItem(inc) : inc;
      if (!item || item.showMarginEnvelope === false) return;
      if (!item.openingAnchor || !item.closingAnchor) return;
      const bounds = inclusioUnitBounds(item, paneState, null);
      if (!bounds) return;
      bracketEntries.push({ inc: item, bounds, level: item.nestLevel || 0 });
    });
    if (!bracketEntries.length) return null;
    const contentW = Math.max(ed.scrollWidth, ed.offsetWidth, 1);
    let contentH = Math.max(ed.scrollHeight, ed.offsetHeight, 1);
    bracketEntries.forEach((e) => { contentH = Math.max(contentH, e.bounds.bottom + 4); });
    const bracketRails = typeof computeInclusioBracketRails === 'function'
      ? computeInclusioBracketRails(
        bracketEntries.map((e) => ({ bounds: e.bounds, level: e.level })),
        maxNest,
        contentW
      )
      : [];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'contour-export-inclusio-svg inclusio-frame-svg');
    svg.setAttribute('aria-hidden', 'true');
    let minX = 0;
    let vbW = contentW;
    if (bracketRails.length) {
      const minRailX = bracketRails.reduce((m, r) => Math.min(m, r.xL), 0);
      const maxRailX = bracketRails.reduce((m, r) => Math.max(m, r.xR), contentW);
      minX = Math.min(0, minRailX - 4);
      vbW = Math.max(contentW, maxRailX + 4) - minX;
    }
    svg.setAttribute('viewBox', `${minX} 0 ${vbW} ${contentH}`);
    svg.setAttribute('width', String(contentW));
    svg.setAttribute('height', String(contentH));
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = contentW + 'px';
    svg.style.height = contentH + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.overflow = 'visible';
    bracketEntries.forEach((entry, i) => {
      if (typeof drawInclusioUnitFrame === 'function') {
        drawInclusioUnitFrame(
          svg,
          entry.bounds,
          entry.inc,
          entry.level,
          maxNest,
          null,
          bracketRails[i]
        );
      }
    });
    return svg;
  } finally {
    if (prevRoot == null) delete window.__contourExportRoot;
    else window.__contourExportRoot = prevRoot;
  }
}

function applyInclusioExportGutter(ed, paneState) {
  if (!ed || !paneState) return;
  const spans = typeof computeInclusioNestLevels === 'function'
    ? computeInclusioNestLevels(paneState.inclusios || [], paneState.verses || [])
    : [];
  const visible = spans.filter((s) => s.inc.showMarginEnvelope !== false && s.inc.openingAnchor && s.inc.closingAnchor);
  const maxNest = typeof inclusioMaxNestLevel === 'function' ? inclusioMaxNestLevel(spans) : 0;
  const gutterCfg = window.INCLUSIO_FRAME_GUTTER || { marginBase: 36, layerStep: 40, textGap: 8 };
  const gutter = visible.length
    ? (gutterCfg.marginBase || 36) + maxNest * (gutterCfg.layerStep || 40) + (gutterCfg.textGap || 8) + 8
    : 0;
  if (gutter) ed.style.setProperty('--inclusio-margin-gutter', `${gutter}px`);
  else ed.style.removeProperty('--inclusio-margin-gutter');
  ed.classList.toggle('has-inclusio-frames', visible.length > 0);
}

function createContourExportMeasureHost(bodyHtml, opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const host = document.createElement('div');
  host.className = 'contour-export-measure-host';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-12000px;top:0;visibility:hidden;pointer-events:none;z-index:-1';
  if (typeof contourPageExportCss === 'function') {
    const style = document.createElement('style');
    style.textContent = contourPageExportCss({ isGreek });
    host.appendChild(style);
  }
  const titleHtml = opts.includeTitle === false ? '' : (
    typeof buildContourPassageTitleExportHtml === 'function' ? buildContourPassageTitleExportHtml() : ''
  );
  const langCls = isGreek ? 'lang-greek' : 'lang-hebrew';
  const sheet = document.createElement('div');
  sheet.className = 'contour-document-sheet contour-document-sheet--export';
  sheet.innerHTML = titleHtml
    + `<div class="contour-export-body-wrap">`
    + `<div class="contour-page-body ${langCls}" dir="ltr">${bodyHtml || ''}</div>`
    + `</div>`;
  host.appendChild(sheet);
  document.body.appendChild(host);
  const ed = host.querySelector('.contour-page-body');
  if (ed) applyInclusioExportGutter(ed, opts.paneState || (typeof state !== 'undefined' ? state : null));
  return host;
}

function renderContourExportOverlaysInto(wrap, ed, opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const paneState = opts.paneState || (typeof state !== 'undefined' ? state : null);
  if (typeof ensureArcs === 'function') ensureArcs();
  if (typeof ensureInclusios === 'function') ensureInclusios();
  const arcs = (paneState && paneState.arcs) || [];
  const arcSvg = buildExportArcSvgElement(ed, arcs, isGreek);
  const incSvg = buildExportInclusioSvgElement(ed, paneState);
  if (arcSvg) wrap.appendChild(arcSvg);
  if (incSvg) wrap.appendChild(incSvg);
  return { arcSvg, incSvg, arcCount: arcs.length, frameCount: paneState?.inclusios?.length || 0 };
}

function buildContourExportBodyWrapHtml(bodyHtml, opts) {
  opts = opts || {};
  if (!bodyHtml) return '';
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const langCls = isGreek ? 'lang-greek' : 'lang-hebrew';
  let overlayHtml = '';
  const host = createContourExportMeasureHost(bodyHtml, opts);
  try {
    const wrap = host.querySelector('.contour-export-body-wrap');
    const ed = host.querySelector('.contour-page-body');
    if (wrap && ed) {
      renderContourExportOverlaysInto(wrap, ed, opts);
      overlayHtml = wrap.innerHTML;
    }
  } finally {
    host.remove();
  }
  return `<div class="contour-export-body-wrap">${overlayHtml || (`<div class="contour-page-body ${langCls}" dir="ltr">${bodyHtml}</div>`)}</div>`;
}

function contourExportOverlayCss() {
  return '.contour-export-body-wrap{position:relative}'
    + '.contour-page-body.lang-hebrew.has-inclusio-frames{padding-right:calc(var(--contour-hebrew-anchor-inset) + var(--inclusio-margin-gutter,0px))!important}'
    + '.contour-export-arc-svg,.contour-export-inclusio-svg{position:absolute;top:0;left:0;z-index:2;pointer-events:none;overflow:visible}'
    + '.contour-export-inclusio-svg .inclusio-frame-rail{vector-effect:non-scaling-stroke;fill:none}'
    + '.contour-export-arc-svg .arc-path{fill:none;stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke}'
    + '.contour-export-arc-svg .arc-label{font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600}'
    + 'body.contour-export-fit-one-page .contour-export-fit-outer{display:flex;justify-content:center;align-items:flex-start}'
    + 'body.contour-export-fit-one-page .contour-export-fit-stage{transform-origin:top center}'
    + '@media print{body.contour-export-fit-one-page .contour-document-sheet--export{page-break-inside:avoid}}';
}

function buildContourExportFitScript(fitOnePage) {
  if (!fitOnePage) return '';
  return '<script>(function(){'
    + 'function fitOnePage(){'
    + 'var sheet=document.querySelector(".contour-document-sheet--export");'
    + 'if(!sheet||document.body.classList.contains("contour-export-fit-applied"))return;'
    + 'var printableH=Math.max(400,(11*96)-(2*0.6*96));'
    + 'var h=Math.max(sheet.scrollHeight,sheet.offsetHeight);'
    + 'if(h<=printableH+4)return;'
    + 'var scale=Math.min(1,printableH/h);'
    + 'var outer=document.createElement("div");'
    + 'outer.className="contour-export-fit-outer";'
    + 'var stage=document.createElement("div");'
    + 'stage.className="contour-export-fit-stage";'
    + 'sheet.parentNode.insertBefore(outer,sheet);'
    + 'outer.appendChild(stage);'
    + 'stage.appendChild(sheet);'
    + 'stage.style.transform="scale("+scale+")";'
    + 'stage.style.width=(sheet.offsetWidth*scale)+"px";'
    + 'stage.style.height=(h*scale)+"px";'
    + 'document.body.classList.add("contour-export-fit-one-page","contour-export-fit-applied");'
    + '}'
    + 'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fitOnePage).catch(fitOnePage);}'
    + 'else{setTimeout(fitOnePage,120);}'
    + '})();<\/script>';
}

window.buildContourExportBodyWrapHtml = buildContourExportBodyWrapHtml;
window.contourExportOverlayCss = contourExportOverlayCss;
window.buildContourExportFitScript = buildContourExportFitScript;
window.renderContourExportOverlaysInto = renderContourExportOverlaysInto;
