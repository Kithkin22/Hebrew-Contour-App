/* Worksheet PDF export — paper, margin, scale, and include presets */

const WORKSHEET_PAPER = {
  letter: { widthIn: 8.5, heightIn: 11, cssSize: 'letter' },
  a4: { widthIn: 210 / 25.4, heightIn: 297 / 25.4, cssSize: 'A4' },
};

const WORKSHEET_MARGIN_IN = {
  narrow: 0.65,
  normal: 1.15,
  wide: 1.5,
};

const WORKSHEET_SCALE_PRESETS = ['fit', '100', '90', '80', '70', 'custom'];

const WORKSHEET_EXPORT_DEFAULTS = {
  scaleMode: '100',
  scalePercent: 100,
  fitOnePage: false,
  paper: 'letter',
  margins: 'normal',
  includeUnitFrames: true,
  includeArcs: true,
  includeTextColors: true,
  includeLegend: false,
  includeComments: false,
  includeNotes: false,
  includePassageTitle: true,
  includeDate: false,
  includeProjectName: false,
  includeExportTimestamp: false,
};

function normalizeWorksheetExportOptions(raw) {
  raw = raw || {};
  const paper = WORKSHEET_PAPER[raw.paper] ? raw.paper : WORKSHEET_EXPORT_DEFAULTS.paper;
  const margins = WORKSHEET_MARGIN_IN[raw.margins] != null ? raw.margins : WORKSHEET_EXPORT_DEFAULTS.margins;
  let scaleMode = raw.scaleMode;
  if (!scaleMode && raw.fitOnePage) scaleMode = 'fit';
  if (!scaleMode || !WORKSHEET_SCALE_PRESETS.includes(scaleMode)) {
    scaleMode = WORKSHEET_EXPORT_DEFAULTS.scaleMode;
  }
  let scalePercent = parseInt(raw.scalePercent, 10);
  if (isNaN(scalePercent)) scalePercent = WORKSHEET_EXPORT_DEFAULTS.scalePercent;
  scalePercent = Math.min(200, Math.max(25, scalePercent));
  return {
    scaleMode,
    scalePercent,
    fitOnePage: scaleMode === 'fit',
    paper,
    margins,
    includeUnitFrames: raw.includeUnitFrames != null ? !!raw.includeUnitFrames : WORKSHEET_EXPORT_DEFAULTS.includeUnitFrames,
    includeArcs: raw.includeArcs != null ? !!raw.includeArcs : WORKSHEET_EXPORT_DEFAULTS.includeArcs,
    includeTextColors: raw.includeTextColors != null ? !!raw.includeTextColors : WORKSHEET_EXPORT_DEFAULTS.includeTextColors,
    includeLegend: !!raw.includeLegend,
    includeComments: !!raw.includeComments,
    includeNotes: !!raw.includeNotes,
    includePassageTitle: raw.includePassageTitle != null ? !!raw.includePassageTitle : WORKSHEET_EXPORT_DEFAULTS.includePassageTitle,
    includeDate: !!raw.includeDate,
    includeProjectName: !!raw.includeProjectName,
    includeExportTimestamp: !!raw.includeExportTimestamp,
  };
}

function worksheetPaperSpec(paperKey) {
  return WORKSHEET_PAPER[paperKey] || WORKSHEET_PAPER.letter;
}

function worksheetMarginIn(marginKey) {
  return WORKSHEET_MARGIN_IN[marginKey] != null ? WORKSHEET_MARGIN_IN[marginKey] : WORKSHEET_MARGIN_IN.normal;
}

const WORKSHEET_DPI = 96;

function worksheetPrintableAreaPx(paperKey, marginKey) {
  const paper = worksheetPaperSpec(paperKey);
  const marginIn = worksheetMarginIn(marginKey);
  const pageW = Math.round(paper.widthIn * WORKSHEET_DPI);
  const pageH = Math.round(paper.heightIn * WORKSHEET_DPI);
  const marginPx = Math.round(marginIn * WORKSHEET_DPI);
  return {
    pageW,
    pageH,
    marginPx,
    marginIn,
    areaW: pageW - marginPx * 2,
    areaH: pageH - marginPx * 2,
    cssSize: paper.cssSize,
  };
}

/** Live editor sheet — use actual content height, not empty letter min-height. */
function getLiveEditorSheetMetrics() {
  const sheet = document.querySelector('#contourPageZoomStage .contour-document-sheet');
  const ed = document.getElementById('editor');
  if (!sheet) return null;
  const cp = window.CONTOUR_PAGE || {};
  const sheetW = cp.letterWidthPx || 816;
  const marginPx = cp.marginPx || 96;
  const titleEl = sheet.querySelector('#contourPassageTitle, .contour-passage-title');
  const titleVisible = titleEl && !titleEl.hidden && titleEl.textContent.trim();
  const titleBlock = titleVisible ? (titleEl.offsetHeight + 24) : 0;
  const edH = ed ? Math.max(ed.offsetHeight, ed.scrollHeight, 1) : 1;
  const contentH = Math.ceil(titleBlock + edH + marginPx * 2);
  const sheetH = Math.max(contentH, sheet.scrollHeight || 0, 1);
  return { sheetW, sheetH, contentH, marginPx };
}

function resolveWorksheetScale(wsOpts, metrics, area) {
  const mode = wsOpts.scaleMode || '100';
  if (mode === 'fit') {
    const s = Math.min(1, area.areaW / metrics.sheetW, area.areaH / metrics.sheetH);
    return Math.round(s * 10000) / 10000;
  }
  if (mode === 'custom') {
    return Math.round((wsOpts.scalePercent / 100) * 10000) / 10000;
  }
  const preset = parseInt(mode, 10);
  if (!isNaN(preset)) return Math.round((preset / 100) * 10000) / 10000;
  return 1;
}

function computeWorksheetLayoutForExport(wsOpts) {
  wsOpts = normalizeWorksheetExportOptions(wsOpts);
  const metrics = getLiveEditorSheetMetrics();
  if (!metrics) return null;
  const area = worksheetPrintableAreaPx(wsOpts.paper, wsOpts.margins);
  const scale = resolveWorksheetScale(wsOpts, metrics, area);
  return Object.assign({
    scaleMode: wsOpts.scaleMode,
    scalePercent: wsOpts.scalePercent,
    fitOnePage: wsOpts.scaleMode === 'fit',
    scale,
  }, area, metrics);
}

function buildWorksheetLayoutCss(layout) {
  if (!layout) return '';
  const scaled = layout.scale !== 1 || layout.scaleMode === 'fit';
  let css = `@page{size:${layout.cssSize};margin:0}`
    + 'body.contour-export-worksheet{margin:0!important;padding:0!important;background:#fff}'
    + '.contour-export-print-hint{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;margin:0 0 12px 0;max-width:720px}'
    + '.contour-document-sheet.contour-document-sheet--export{min-height:0!important;height:auto!important;box-shadow:none!important;border:none!important}'
    + '.contour-document-sheet--export.contour-export-no-meta{padding-top:var(--contour-letter-margin)}'
    + '.contour-document-sheet--export .contour-passage-title{margin-top:0}'
    + '.contour-document-sheet--export .contour-worksheet-meta{margin:0 0 8px 0;font-size:12px;color:#64748b}'
    + '.contour-document-sheet--export .contour-page-body{position:relative;overflow:visible}'
    + '.contour-document-sheet--export .contour-page-body.lang-hebrew .verse-block,'
    + '.contour-document-sheet--export .contour-page-body.lang-hebrew .clause{direction:rtl;text-align:right}'
    + '.contour-document-sheet--export .contour-page-body.lang-greek .verse-block,'
    + '.contour-document-sheet--export .contour-page-body.lang-greek .clause{direction:ltr;text-align:left}';

  if (scaled) {
    css += `.contour-export-worksheet-print-root{width:${layout.pageW}px;min-height:${layout.pageH}px;margin:0 auto;overflow:hidden;position:relative;box-sizing:border-box;page-break-after:always}`
      + `.contour-export-worksheet-stage{transform:scale(${layout.scale});transform-origin:top left;position:absolute;left:${layout.marginPx}px;top:${layout.marginPx}px;width:${layout.sheetW}px;height:auto}`
      + '@media print{.contour-export-worksheet-print-root{page-break-inside:avoid;transform:none!important}.contour-export-worksheet-stage{transform:scale(' + layout.scale + ')!important;transform-origin:top left!important}}';
  } else {
    const fitScale = Math.min(1, layout.areaW / layout.sheetW, layout.areaH / layout.sheetH);
    css += `.contour-export-worksheet-print-root{width:${layout.pageW}px;min-height:${layout.pageH}px;margin:0 auto;box-sizing:border-box;padding:${layout.marginPx}px;page-break-after:always;overflow:hidden}`
      + `.contour-export-worksheet-stage{width:${layout.sheetW}px;height:auto;transform:scale(${fitScale});transform-origin:top left}`
      + '@media print{.contour-export-worksheet-print-root{page-break-inside:avoid;padding:' + layout.marginPx + 'px!important;overflow:hidden}.contour-export-worksheet-stage{transform:scale(' + fitScale + ')!important;transform-origin:top left!important}}';
  }
  return css;
}

window.WORKSHEET_EXPORT_DEFAULTS = WORKSHEET_EXPORT_DEFAULTS;
window.WORKSHEET_SCALE_PRESETS = WORKSHEET_SCALE_PRESETS;
window.normalizeWorksheetExportOptions = normalizeWorksheetExportOptions;
window.worksheetPaperSpec = worksheetPaperSpec;
window.worksheetMarginIn = worksheetMarginIn;
window.worksheetPrintableAreaPx = worksheetPrintableAreaPx;
window.getLiveEditorSheetMetrics = getLiveEditorSheetMetrics;
window.computeWorksheetLayoutForExport = computeWorksheetLayoutForExport;
window.buildWorksheetLayoutCss = buildWorksheetLayoutCss;
window.resolveWorksheetScale = resolveWorksheetScale;
