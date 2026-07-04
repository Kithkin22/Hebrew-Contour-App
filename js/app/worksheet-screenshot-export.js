/* Screenshot-based Worksheet PDF — captures live contour pane as image (WYSIWYG). */

function inlineNodeStyles(src, dst) {
  if (!(src instanceof Element) || !(dst instanceof Element)) return;
  const cs = getComputedStyle(src);
  let style = '';
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    style += `${prop}:${cs.getPropertyValue(prop)};`;
  }
  dst.setAttribute('style', style);
  const srcKids = src.children;
  const dstKids = dst.children;
  for (let i = 0; i < srcKids.length; i++) {
    if (dstKids[i]) inlineNodeStyles(srcKids[i], dstKids[i]);
  }
}

function loadHtml2CanvasFromCdn() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => (window.html2canvas ? resolve(window.html2canvas) : reject(new Error('html2canvas missing')));
    s.onerror = () => reject(new Error('Could not load screenshot library.'));
    document.head.appendChild(s);
  });
}

async function captureElementToPng(el) {
  const w = el.offsetWidth || 816;
  const h = Math.max(el.scrollHeight, el.offsetHeight, 1);
  const clone = el.cloneNode(true);
  inlineNodeStyles(el, clone);
  clone.style.width = w + 'px';
  clone.style.minHeight = '0';
  clone.style.height = 'auto';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-24000px;top:0;width:${w}px;background:#fff;overflow:visible`;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    try {
      const html2canvas = await loadHtml2CanvasFromCdn();
      const scale = Math.min(2, window.devicePixelRatio || 1.5);
      const canvas = await html2canvas(clone, {
        width: w,
        height: h,
        scale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      return { dataUrl: canvas.toDataURL('image/png'), sheetW: w, sheetH: h };
    } catch (cdnErr) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      wrapper.style.cssText = `width:${w}px;height:${h}px;background:#fff`;
      wrapper.appendChild(clone.cloneNode(true));
      const xhtml = new XMLSerializer().serializeToString(wrapper);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
      const img = new Image();
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      return { dataUrl: canvas.toDataURL('image/png'), sheetW: w, sheetH: h };
    }
  } finally {
    host.remove();
  }
}

async function captureWorksheetContourScreenshot(wsOpts) {
  wsOpts = typeof normalizeWorksheetExportOptions === 'function'
    ? normalizeWorksheetExportOptions(wsOpts || {})
    : (wsOpts || {});

  if (typeof refreshLiveEditorOverlaysForExport === 'function') {
    refreshLiveEditorOverlaysForExport();
  }

  const sheetHtml = typeof cloneLiveEditorForExport === 'function'
    ? cloneLiveEditorForExport(wsOpts)
    : null;
  if (!sheetHtml) return null;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-24000px;top:0;z-index:-1;pointer-events:none;background:#fff;overflow:visible';
  host.innerHTML = sheetHtml;
  document.body.appendChild(host);

  const sheet = host.querySelector('.contour-document-sheet');
  if (!sheet) {
    host.remove();
    return null;
  }

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return await captureElementToPng(sheet);
  } finally {
    host.remove();
  }
}

function buildScreenshotWorksheetDocument(capture, wsOpts) {
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

  const css = `@page{size:${pageSize};margin:0}`
    + '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
    + 'html,body{margin:0;padding:0;background:#fff}'
    + 'body.contour-screenshot-worksheet{font-family:Arial,Helvetica,sans-serif}'
    + '.contour-screenshot-print-hint{font-size:13px;color:#64748b;margin:0 0 12px 0;max-width:640px;line-height:1.45}'
    + '.contour-screenshot-print-hint strong{color:#b45309}'
    + `.contour-screenshot-page{width:${layout.pageW}px;min-height:${layout.pageH}px;padding:${layout.marginPx}px;background:#fff;page-break-after:avoid;page-break-inside:avoid}`
    + `.contour-screenshot-img-wrap{width:${layout.areaW}px;max-height:${layout.areaH}px;overflow:hidden}`
    + `.contour-screenshot-img{display:block;width:${imgW}px;height:${imgH}px}`
    + '@media print{'
    + 'html,body{margin:0!important;padding:0!important;width:8.5in;height:11in}'
    + `.contour-screenshot-page{width:8.5in!important;height:11in!important;min-height:11in;padding:${marginIn}in!important;overflow:hidden;transform:none!important}`
    + `.contour-screenshot-img-wrap{width:calc(8.5in - ${marginIn * 2}in)!important;max-height:calc(11in - ${marginIn * 2}in)!important}`
    + `.contour-screenshot-img{width:100%!important;height:auto!important;max-height:calc(11in - ${marginIn * 2}in)!important;object-fit:contain;object-position:top left;transform:none!important}`
    + 'button,.contour-screenshot-print-hint{display:none!important}'
    + '}';

  const hint = '<p class="contour-screenshot-print-hint">'
    + '<strong>Safari:</strong> set <strong>Scale to 100%</strong> and turn off <strong>Print headers and footers</strong>. '
    + 'This worksheet is a screenshot of your contour pane — it matches the editor exactly.'
    + '</p>';

  return '<!doctype html><html><head><meta charset="utf-8"><title>\u200B</title><style>' + css + '</style></head>'
    + '<body class="contour-screenshot-worksheet">'
    + hint
    + '<button type="button" onclick="window.print()" style="margin-bottom:14px;padding:8px 14px">Print / Save as PDF</button>'
    + `<div class="contour-screenshot-page"><div class="contour-screenshot-img-wrap">`
    + `<img class="contour-screenshot-img" src="${capture.dataUrl}" width="${imgW}" height="${imgH}" alt="Contour worksheet">`
    + '</div></div></body></html>';
}

async function exportScreenshotWorksheetPdf(settings, opts) {
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
    capture = await captureWorksheetContourScreenshot(settings);
  } catch (e) {
    console.error(e);
    alert('Screenshot capture failed. Check your network connection and try again.');
    return;
  }
  if (!capture) {
    alert('Could not capture the contour page.');
    return;
  }

  const docHtml = buildScreenshotWorksheetDocument(capture, settings);
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

window.captureWorksheetContourScreenshot = captureWorksheetContourScreenshot;
window.buildScreenshotWorksheetDocument = buildScreenshotWorksheetDocument;
window.exportScreenshotWorksheetPdf = exportScreenshotWorksheetPdf;
