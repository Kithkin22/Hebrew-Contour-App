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

function applyExportSvgViewport(svg, opts) {
  const contentW = opts.contentW;
  const contentH = opts.contentH;
  const minX = opts.minX || 0;
  const vbW = opts.vbW || contentW;
  svg.setAttribute('viewBox', `${minX} 0 ${vbW} ${contentH}`);
  if (minX < 0) {
    svg.setAttribute('width', String(vbW));
    svg.setAttribute('height', String(contentH));
    svg.style.width = vbW + 'px';
    svg.style.height = contentH + 'px';
    svg.style.left = minX + 'px';
  } else {
    svg.setAttribute('width', String(contentW));
    svg.setAttribute('height', String(contentH));
    svg.style.width = contentW + 'px';
    svg.style.height = contentH + 'px';
    svg.style.left = '0';
  }
}

function buildExportArcSvgElement(ed, arcs, isGreek) {
  if (!ed || !arcs || !arcs.length) return null;
  if (typeof drawArcPath !== 'function') return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'contour-export-arc-svg');
  svg.setAttribute('aria-hidden', 'true');
  const contentW = Math.max(ed.scrollWidth, ed.offsetWidth, 1);
  let contentH = Math.max(ed.scrollHeight, ed.offsetHeight, 1);
  svg.style.position = 'absolute';
  svg.style.top = '0';
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
  applyExportSvgViewport(svg, { contentW, contentH, minX: 0, vbW: contentW });
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
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.pointerEvents = 'none';
    svg.style.overflow = 'visible';
    let minX = 0;
    let vbW = contentW;
    if (bracketRails.length) {
      const minRailX = bracketRails.reduce((m, r) => Math.min(m, r.xL), 0);
      const maxRailX = bracketRails.reduce((m, r) => Math.max(m, r.xR), contentW);
      minX = Math.min(0, minRailX - 4);
      vbW = Math.max(contentW, maxRailX + 4) - minX;
    }
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
    applyExportSvgViewport(svg, { contentW, contentH, minX, vbW });
    return svg;
  } finally {
    if (prevRoot == null) delete window.__contourExportRoot;
    else window.__contourExportRoot = prevRoot;
  }
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
    style.textContent = contourPageExportCss({ isGreek, worksheet: !!opts.worksheet });
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
    + `<div class="contour-export-overlay-layer" aria-hidden="true"></div>`
    + `</div>`;
  host.appendChild(sheet);
  document.body.appendChild(host);
  return host;
}

function renderContourExportOverlaysInto(layer, ed, opts) {
  opts = opts || {};
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const paneState = opts.paneState || (typeof state !== 'undefined' ? state : null);
  const includeArcs = opts.includeArcs !== false;
  const includeUnitFrames = opts.includeUnitFrames !== false;
  if (includeArcs && typeof ensureArcs === 'function') ensureArcs();
  if (includeUnitFrames && typeof ensureInclusios === 'function') ensureInclusios();
  const arcs = includeArcs ? ((paneState && paneState.arcs) || []) : [];
  const arcSvg = includeArcs ? buildExportArcSvgElement(ed, arcs, isGreek) : null;
  const incSvg = includeUnitFrames ? buildExportInclusioSvgElement(ed, paneState) : null;
  if (arcSvg) layer.appendChild(arcSvg);
  if (incSvg) layer.appendChild(incSvg);
  return { arcSvg, incSvg, arcCount: arcs.length, frameCount: includeUnitFrames ? (paneState?.inclusios?.length || 0) : 0 };
}

function buildContourExportBodyWrapHtml(bodyHtml, opts) {
  opts = opts || {};
  if (!bodyHtml) return '';
  const isGreek = opts.isGreek != null ? opts.isGreek : (typeof state !== 'undefined' && state.language === 'greek');
  const langCls = isGreek ? 'lang-greek' : 'lang-hebrew';
  let bodyInner = '';
  let overlayInner = '';
  const host = createContourExportMeasureHost(bodyHtml, opts);
  try {
    const wrap = host.querySelector('.contour-export-body-wrap');
    const ed = host.querySelector('.contour-page-body');
    const layer = host.querySelector('.contour-export-overlay-layer');
    if (wrap && ed && layer) {
      renderContourExportOverlaysInto(layer, ed, opts);
      bodyInner = ed.outerHTML;
      overlayInner = layer.innerHTML;
    }
  } finally {
    host.remove();
  }
  if (!bodyInner) {
    bodyInner = `<div class="contour-page-body ${langCls}" dir="ltr">${bodyHtml}</div>`;
  }
  return `<div class="contour-export-body-wrap">${bodyInner}<div class="contour-export-overlay-layer" aria-hidden="true">${overlayInner}</div></div>`;
}

function contourExportOverlayCss() {
  return '.contour-export-body-wrap{position:relative;overflow:visible}'
    + '.contour-document-sheet.contour-document-sheet--export{overflow:visible}'
    + '.contour-export-overlay-layer{position:absolute;top:0;left:0;right:0;bottom:0;z-index:2;pointer-events:none;overflow:visible}'
    + '.contour-export-arc-svg,.contour-export-inclusio-svg{position:absolute;top:0;pointer-events:none;overflow:visible}'
    + '.contour-export-inclusio-svg .inclusio-frame-rail{vector-effect:non-scaling-stroke;fill:none}'
    + '.contour-export-arc-svg .arc-path{fill:none;stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke}'
    + '.contour-export-arc-svg .arc-label{font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600}'
    + 'body.contour-export-worksheet{margin:0;padding:0;background:#fff}'
    + '.contour-export-worksheet-host{margin:0 auto;box-sizing:border-box;page-break-after:always;overflow:visible}'
    + '.contour-export-worksheet-frame{display:flex;align-items:center;justify-content:center;overflow:visible}'
    + '.contour-export-worksheet-stage{transform-origin:top left;overflow:visible}'
    + '.contour-export-supplement-page{page-break-before:always;margin:0;padding:24px}'
    + '@media print{body.contour-export-worksheet{padding:0}.contour-export-worksheet-host{page-break-inside:avoid}.contour-export-supplement-page{page-break-before:always}}';
}

function buildContourWorksheetScript(opts) {
  opts = opts || {};
  const paper = typeof worksheetPaperSpec === 'function'
    ? worksheetPaperSpec(opts.paper || 'letter')
    : { widthIn: 8.5, heightIn: 11 };
  const marginIn = typeof worksheetMarginIn === 'function'
    ? worksheetMarginIn(opts.margins || 'normal')
    : 1.15;
  const cfg = JSON.stringify({ widthIn: paper.widthIn, heightIn: paper.heightIn, marginIn });
  return '<script>(function(){'
    + 'var cfg=' + cfg + ';'
    + 'function layoutWorksheet(){'
    + 'if(document.body.classList.contains("contour-worksheet-applied"))return;'
    + 'var sheet=document.querySelector(".contour-document-sheet--export");'
    + 'if(!sheet)return;'
    + 'var dpi=96,margin=cfg.marginIn*dpi,pageW=cfg.widthIn*dpi,pageH=cfg.heightIn*dpi;'
    + 'var areaW=pageW-2*margin,areaH=pageH-2*margin;'
    + 'var w=Math.max(sheet.offsetWidth,sheet.scrollWidth,1);'
    + 'var h=Math.max(sheet.offsetHeight,sheet.scrollHeight,1);'
    + 'var scale=Math.min(areaW/w,areaH/h);'
    + 'var host=document.createElement("div");'
    + 'host.className="contour-export-worksheet-host";'
    + 'var frame=document.createElement("div");'
    + 'frame.className="contour-export-worksheet-frame";'
    + 'var stage=document.createElement("div");'
    + 'stage.className="contour-export-worksheet-stage";'
    + 'sheet.parentNode.insertBefore(host,sheet);'
    + 'host.appendChild(frame);'
    + 'frame.appendChild(stage);'
    + 'stage.appendChild(sheet);'
    + 'frame.style.width=areaW+"px";'
    + 'frame.style.height=areaH+"px";'
    + 'stage.style.width=w+"px";'
    + 'stage.style.height=h+"px";'
    + 'stage.style.transform="scale("+scale+")";'
    + 'stage.style.marginLeft=Math.max(0,(areaW-w*scale)/2)+"px";'
    + 'stage.style.marginTop=Math.max(0,(areaH-h*scale)/2)+"px";'
    + 'document.body.classList.add("contour-export-worksheet","contour-worksheet-applied");'
    + '}'
    + 'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(layoutWorksheet).catch(layoutWorksheet);}'
    + 'else{setTimeout(layoutWorksheet,120);}'
    + '})();<\/script>';
}

function buildContourExportFitScript(fitOnePage, opts) {
  if (fitOnePage) return buildContourWorksheetScript(opts);
  return '';
}

window.buildContourWorksheetScript = buildContourWorksheetScript;
window.buildContourExportBodyWrapHtml = buildContourExportBodyWrapHtml;
window.contourExportOverlayCss = contourExportOverlayCss;
window.buildContourExportFitScript = buildContourExportFitScript;
window.renderContourExportOverlaysInto = renderContourExportOverlaysInto;
