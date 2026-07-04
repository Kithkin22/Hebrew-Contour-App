/* Aleph Worksheet PDF — canonical frozen snapshot of the Contour page.
 *
 * The Contour page is the source of truth. Export captures the live rendered
 * worksheet exactly as displayed (Hebrew, RTL, colors, unit frames, arcs,
 * spacing, indentation) and places that image on Letter. No HTML rebuild.
 */

function loadHtml2CanvasFromCdn() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => (window.html2canvas ? resolve(window.html2canvas) : reject(new Error('html2canvas missing')));
    s.onerror = () => reject(new Error('Could not load snapshot library.'));
    document.head.appendChild(s);
  });
}

function prepareLiveSheetForSnapshot(sheet, wsOpts) {
  wsOpts = wsOpts || {};
  const restores = [];
  const push = (fn) => restores.push(fn);

  const titleEl = sheet.querySelector('#contourPassageTitle, .contour-passage-title');
  if (titleEl && !wsOpts.includePassageTitle) {
    const prev = titleEl.style.display;
    titleEl.style.display = 'none';
    push(() => { titleEl.style.display = prev; });
  }

  const metaNodes = [];
  const insertMeta = (html) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const node = wrap.firstElementChild;
    if (!node) return;
    const anchor = sheet.querySelector('.contour-passage-title') || sheet.querySelector('#editor');
    if (anchor) anchor.insertAdjacentElement('beforebegin', node);
    else sheet.insertAdjacentElement('afterbegin', node);
    metaNodes.push(node);
  };

  if (wsOpts.includeDate) {
    const d = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    insertMeta(`<div class="contour-worksheet-meta">${typeof esc === 'function' ? esc(d) : d}</div>`);
  }
  if (wsOpts.includeExportTimestamp) {
    const ts = new Date().toLocaleString(undefined, {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    insertMeta(`<div class="contour-worksheet-meta contour-worksheet-meta--timestamp">${typeof esc === 'function' ? esc(ts) : ts}</div>`);
  }
  if (wsOpts.includeProjectName) {
    let name = 'Untitled Project';
    if (typeof getCurrentProjectRecord === 'function') {
      const rec = getCurrentProjectRecord();
      if (rec && rec.name) name = rec.name;
    } else if (typeof defaultProjectName === 'function') {
      name = defaultProjectName();
    }
    insertMeta(`<div class="contour-worksheet-meta">${typeof esc === 'function' ? esc(name) : name}</div>`);
  }
  if (metaNodes.length) {
    push(() => metaNodes.forEach((n) => n.remove()));
  }

  if (!wsOpts.includeArcs) {
    sheet.querySelectorAll('#arcSvg, .contour-export-arc-svg').forEach((el) => {
      const prev = el.style.display;
      el.style.display = 'none';
      push(() => { el.style.display = prev; });
    });
  }
  if (!wsOpts.includeUnitFrames) {
    sheet.querySelectorAll('svg.inclusio-frame-svg, .contour-export-inclusio-svg').forEach((el) => {
      const prev = el.style.display;
      el.style.display = 'none';
      push(() => { el.style.display = prev; });
    });
  }

  return () => restores.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
}

function stripSnapshotCloneUi(root, wsOpts) {
  if (typeof stripLiveEditorInteractionClasses === 'function') {
    stripLiveEditorInteractionClasses(root);
  }
  if (wsOpts && wsOpts.includeTextColors === false && typeof stripLiveEditorTextColors === 'function') {
    stripLiveEditorTextColors(root);
  }
  root.querySelectorAll('.comment-marker').forEach((el) => el.remove());
}

async function captureLiveContourSheetSnapshot(wsOpts) {
  wsOpts = typeof normalizeWorksheetExportOptions === 'function'
    ? normalizeWorksheetExportOptions(wsOpts || {})
    : (wsOpts || {});

  if (typeof refreshLiveEditorOverlaysForExport === 'function') {
    refreshLiveEditorOverlaysForExport();
  }

  const liveSheet = document.querySelector('#contourPageZoomStage .contour-document-sheet');
  if (!liveSheet) return null;

  const restore = prepareLiveSheetForSnapshot(liveSheet, wsOpts);

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const w = liveSheet.offsetWidth || (window.CONTOUR_PAGE && window.CONTOUR_PAGE.letterWidthPx) || 816;
    const h = Math.max(liveSheet.scrollHeight, liveSheet.offsetHeight, 1);
    const pixelScale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

    const html2canvas = await loadHtml2CanvasFromCdn();
    const canvas = await html2canvas(liveSheet, {
      scale: pixelScale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: w,
      height: h,
      scrollX: 0,
      scrollY: -window.scrollY,
      onclone: (_doc, clone) => {
        stripSnapshotCloneUi(clone, wsOpts);
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
      },
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      sheetW: w,
      sheetH: h,
      pixelScale,
    };
  } finally {
    restore();
  }
}

/** @deprecated alias */
async function captureWorksheetContourScreenshot(wsOpts) {
  return captureLiveContourSheetSnapshot(wsOpts);
}

function buildSnapshotWorksheetDocument(capture, wsOpts) {
  if (!capture || !capture.dataUrl) return null;
  wsOpts = typeof normalizeWorksheetExportOptions === 'function'
    ? normalizeWorksheetExportOptions(wsOpts || {})
    : (wsOpts || {});

  const layout = typeof computeWorksheetLayoutForExport === 'function'
    ? computeWorksheetLayoutForExport(wsOpts)
    : null;
  if (!layout) return null;

  const imgScale = layout.scale;
  const imgW = Math.round(capture.sheetW * imgScale);
  const imgH = Math.round(capture.sheetH * imgScale);
  const marginIn = layout.marginIn;
  const pageSize = layout.cssSize;
  const isGreek = typeof state !== 'undefined' && state.language === 'greek';
  const alignClass = isGreek ? 'contour-snapshot-align-ltr' : 'contour-snapshot-align-rtl';
  const objectPos = isGreek ? 'top left' : 'top right';

  const css = `@page{size:${pageSize};margin:0}`
    + '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
    + 'html,body{margin:0;padding:0;background:#fff}'
    + 'body.contour-snapshot-worksheet{font-family:Arial,Helvetica,sans-serif}'
    + '.contour-snapshot-print-hint{font-size:13px;color:#64748b;margin:0 0 12px 0;max-width:640px;line-height:1.45}'
    + '.contour-snapshot-print-hint strong{color:#b45309}'
    + `.contour-snapshot-page{width:${layout.pageW}px;min-height:${layout.pageH}px;padding:${layout.marginPx}px;background:#fff;page-break-after:avoid;page-break-inside:avoid}`
    + `.contour-snapshot-img-wrap{display:flex;align-items:flex-start;width:${layout.areaW}px;max-height:${layout.areaH}px;overflow:hidden}`
    + `.contour-snapshot-align-rtl{justify-content:flex-end}`
    + `.contour-snapshot-align-ltr{justify-content:flex-start}`
    + `.contour-snapshot-img{display:block;flex:0 0 auto;width:${imgW}px;height:${imgH}px;max-width:100%;image-rendering:auto}`
    + '@media print{'
    + 'html,body{margin:0!important;padding:0!important;width:8.5in;height:11in}'
    + `.contour-snapshot-page{width:8.5in!important;height:11in!important;min-height:11in;padding:${marginIn}in!important;overflow:hidden;transform:none!important}`
    + `.contour-snapshot-img-wrap{display:flex!important;align-items:flex-start!important;width:calc(8.5in - ${marginIn * 2}in)!important;max-height:calc(11in - ${marginIn * 2}in)!important;overflow:hidden!important}`
    + `.contour-snapshot-align-rtl{justify-content:flex-end!important}`
    + `.contour-snapshot-align-ltr{justify-content:flex-start!important}`
    + `.contour-snapshot-img{display:block!important;flex:0 0 auto!important;width:auto!important;max-width:100%!important;height:auto!important;max-height:calc(11in - ${marginIn * 2}in)!important;object-fit:contain;object-position:${objectPos}!important;transform:none!important}`
    + 'button,.contour-snapshot-print-hint{display:none!important}'
    + '}';

  const hint = '<p class="contour-snapshot-print-hint">'
    + '<strong>Before saving PDF:</strong> set print scale to <strong>100%</strong> and turn off '
    + '<strong>headers and footers</strong>. This page is a frozen snapshot of your Contour worksheet.'
    + '</p>';

  return '<!doctype html><html><head><meta charset="utf-8"><title>\u200B</title><style>' + css + '</style></head>'
    + '<body class="contour-snapshot-worksheet">'
    + hint
    + '<button type="button" onclick="window.print()" style="margin-bottom:14px;padding:8px 14px">Print / Save as PDF</button>'
    + `<div class="contour-snapshot-page"><div class="contour-snapshot-img-wrap ${alignClass}">`
    + `<img class="contour-snapshot-img" src="${capture.dataUrl}" width="${imgW}" height="${imgH}" alt="Contour worksheet snapshot">`
    + '</div></div></body></html>';
}

/** @deprecated alias */
function buildScreenshotWorksheetDocument(capture, wsOpts) {
  return buildSnapshotWorksheetDocument(capture, wsOpts);
}

async function exportWorksheetPdfSnapshot(settings, opts) {
  opts = opts || {};
  settings = typeof normalizeWorksheetExportOptions === 'function'
    ? normalizeWorksheetExportOptions(settings)
    : (settings || {});
  if (!state.verses.length) {
    alert('Create or generate text first.');
    return;
  }

  let capture = null;
  try {
    capture = await captureLiveContourSheetSnapshot(settings);
  } catch (e) {
    console.error(e);
    alert('Could not capture the Contour page. Check your connection and try again.');
    return;
  }
  if (!capture) {
    alert('Could not capture the Contour page.');
    return;
  }

  const docHtml = buildSnapshotWorksheetDocument(capture, settings);
  if (!docHtml) {
    alert('Could not build worksheet PDF.');
    return;
  }

  const fname = askExportFilename(suggestedExportBase('contour-editor'), 'pdf');
  if (!fname) return;
  const printMeta = preparePrintFilename(fname);
  if (typeof openPdfPrintWindow === 'function') {
    openPdfPrintWindow(docHtml, { title: '\u200B', oldTitle: printMeta.oldTitle, filenameHint: printMeta.title });
  }
}

window.captureLiveContourSheetSnapshot = captureLiveContourSheetSnapshot;
window.captureWorksheetContourScreenshot = captureWorksheetContourScreenshot;
window.buildSnapshotWorksheetDocument = buildSnapshotWorksheetDocument;
window.buildScreenshotWorksheetDocument = buildScreenshotWorksheetDocument;
window.exportWorksheetPdfSnapshot = exportWorksheetPdfSnapshot;
window.exportScreenshotWorksheetPdf = exportWorksheetPdfSnapshot;
