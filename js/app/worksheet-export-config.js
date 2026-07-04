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

window.WORKSHEET_EXPORT_DEFAULTS = WORKSHEET_EXPORT_DEFAULTS;
window.normalizeWorksheetExportOptions = normalizeWorksheetExportOptions;
window.worksheetPaperSpec = worksheetPaperSpec;
window.worksheetMarginIn = worksheetMarginIn;
