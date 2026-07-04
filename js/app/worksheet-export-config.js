/* Worksheet PDF export — paper, margin, and include presets */

const WORKSHEET_PAPER = {
  letter: { widthIn: 8.5, heightIn: 11, cssSize: 'letter' },
  a4: { widthIn: 210 / 25.4, heightIn: 297 / 25.4, cssSize: 'A4' },
};

const WORKSHEET_MARGIN_IN = {
  narrow: 0.65,
  normal: 1.15,
  wide: 1.5,
};

const WORKSHEET_EXPORT_DEFAULTS = {
  fitOnePage: true,
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
};

function normalizeWorksheetExportOptions(raw) {
  raw = raw || {};
  const paper = WORKSHEET_PAPER[raw.paper] ? raw.paper : WORKSHEET_EXPORT_DEFAULTS.paper;
  const margins = WORKSHEET_MARGIN_IN[raw.margins] != null ? raw.margins : WORKSHEET_EXPORT_DEFAULTS.margins;
  return {
    fitOnePage: raw.fitOnePage != null ? !!raw.fitOnePage : WORKSHEET_EXPORT_DEFAULTS.fitOnePage,
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
  };
}

function worksheetPaperSpec(paperKey) {
  return WORKSHEET_PAPER[paperKey] || WORKSHEET_PAPER.letter;
}

function worksheetMarginIn(marginKey) {
  return WORKSHEET_MARGIN_IN[marginKey] != null ? WORKSHEET_MARGIN_IN[marginKey] : WORKSHEET_MARGIN_IN.normal;
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

/** Live editor sheet size — matches Contour workspace letter page geometry. */
function getLiveEditorSheetMetrics() {
  const sheet = document.querySelector('#contourPageZoomStage .contour-document-sheet');
  if (!sheet) return null;
  const cp = window.CONTOUR_PAGE || {};
  const sheetW = cp.letterWidthPx || 816;
  const sheetH = Math.max(sheet.offsetHeight, sheet.scrollHeight, cp.letterHeightPx || 1056);
  return { sheetW, sheetH };
}

function computeWorksheetLayoutForExport(wsOpts) {
  wsOpts = normalizeWorksheetExportOptions(wsOpts);
  const metrics = getLiveEditorSheetMetrics();
  if (!metrics) return null;
  const area = worksheetPrintableAreaPx(wsOpts.paper, wsOpts.margins);
  let scale = 1;
  if (wsOpts.fitOnePage) {
    scale = Math.min(1, area.areaW / metrics.sheetW, area.areaH / metrics.sheetH);
    scale = Math.round(scale * 10000) / 10000;
  }
  return Object.assign({ fitOnePage: wsOpts.fitOnePage, scale }, area, metrics);
}

function buildWorksheetLayoutCss(layout) {
  if (!layout) return '';
  if (!layout.fitOnePage) {
    return `@page{size:${layout.cssSize};margin:${layout.marginIn}in}`
      + 'body.contour-export-worksheet{margin:0;padding:0;background:#fff}';
  }
  return `@page{size:${layout.cssSize};margin:0}`
    + 'body.contour-export-worksheet{margin:0;padding:0;background:#fff}'
    + `.contour-export-worksheet-print-root{width:${layout.pageW}px;height:${layout.pageH}px;margin:0 auto;overflow:hidden;position:relative;box-sizing:border-box;page-break-after:always}`
    + `.contour-export-worksheet-stage{transform:scale(${layout.scale});transform-origin:top left;position:absolute;left:${layout.marginPx}px;top:${layout.marginPx}px;width:${layout.sheetW}px;min-height:${layout.sheetH}px}`
    + '@media print{.contour-export-worksheet-print-root{page-break-inside:avoid}}';
}

window.WORKSHEET_EXPORT_DEFAULTS = WORKSHEET_EXPORT_DEFAULTS;
window.normalizeWorksheetExportOptions = normalizeWorksheetExportOptions;
window.worksheetPaperSpec = worksheetPaperSpec;
window.worksheetMarginIn = worksheetMarginIn;
window.worksheetPrintableAreaPx = worksheetPrintableAreaPx;
window.getLiveEditorSheetMetrics = getLiveEditorSheetMetrics;
window.computeWorksheetLayoutForExport = computeWorksheetLayoutForExport;
window.buildWorksheetLayoutCss = buildWorksheetLayoutCss;
