/* Worksheet PDF export wizard modal */

(function () {
  let previewTimer = null;

  function modalEl() {
    return document.getElementById('worksheetPdfModal');
  }

  function readWorksheetWizardForm() {
    const form = document.getElementById('worksheetPdfForm');
    if (!form) return { ...(window.WORKSHEET_EXPORT_DEFAULTS || {}) };
    const val = (name) => {
      const el = form.elements[name];
      if (!el) return null;
      if (el.type === 'checkbox') return el.checked;
      return el.value;
    };
    return typeof normalizeWorksheetExportOptions === 'function'
      ? normalizeWorksheetExportOptions({
        fitOnePage: val('fitOnePage'),
        paper: val('paper'),
        margins: val('margins'),
        includeUnitFrames: val('includeUnitFrames'),
        includeArcs: val('includeArcs'),
        includeTextColors: val('includeTextColors'),
        includeLegend: val('includeLegend'),
        includeComments: val('includeComments'),
        includeNotes: val('includeNotes'),
        includePassageTitle: val('includePassageTitle'),
        includeDate: val('includeDate'),
        includeProjectName: val('includeProjectName'),
      })
      : {};
  }

  function applyWorksheetWizardForm(settings) {
    const form = document.getElementById('worksheetPdfForm');
    if (!form) return;
    settings = settings || (window.WORKSHEET_EXPORT_DEFAULTS || {});
    const set = (name, value) => {
      const el = form.elements[name];
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!value;
      else if (value != null) el.value = value;
    };
    set('fitOnePage', settings.fitOnePage);
    set('paper', settings.paper);
    set('margins', settings.margins);
    set('includeUnitFrames', settings.includeUnitFrames);
    set('includeArcs', settings.includeArcs);
    set('includeTextColors', settings.includeTextColors);
    set('includeLegend', settings.includeLegend);
    set('includeComments', settings.includeComments);
    set('includeNotes', settings.includeNotes);
    set('includePassageTitle', settings.includePassageTitle);
    set('includeDate', settings.includeDate);
    set('includeProjectName', settings.includeProjectName);
  }

  function closeWorksheetPdfWizard() {
    const modal = modalEl();
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  function schedulePreviewUpdate() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(updateWorksheetPreview, 400);
  }

  function updateWorksheetPreview() {
    const frame = document.getElementById('worksheetPdfPreview');
    if (!frame || typeof buildContourExportDocument !== 'function') return;
    if (!state.verses.length) {
      frame.removeAttribute('srcdoc');
      return;
    }
    const settings = readWorksheetWizardForm();
    let html = '';
    try {
      html = buildContourExportDocument({
        worksheetSettings: settings,
        includePrintButton: false,
      });
    } catch (e) {
      return;
    }
    if (!html) return;
    frame.srcdoc = html;
  }

  function showWorksheetPdfWizard(preset) {
    preset = preset || {};
    const modal = modalEl();
    if (!modal) {
      if (typeof exportWorksheetPdf === 'function') {
        exportWorksheetPdf({
          ...(window.WORKSHEET_EXPORT_DEFAULTS || {}),
          includeLegend: !!preset.includeLegend,
        });
      }
      return;
    }
    const defaults = { ...(window.WORKSHEET_EXPORT_DEFAULTS || {}) };
    if (preset.includeLegend) defaults.includeLegend = true;
    applyWorksheetWizardForm(defaults);
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    schedulePreviewUpdate();
    const first = modal.querySelector('input,button,select,textarea');
    if (first) first.focus();
  }

  function initWorksheetPdfWizard() {
    const modal = modalEl();
    if (!modal || modal.dataset.inited) return;
    modal.dataset.inited = '1';

    document.getElementById('worksheetPdfCancel')?.addEventListener('click', closeWorksheetPdfWizard);
    document.getElementById('worksheetPdfExportBtn')?.addEventListener('click', () => {
      const settings = readWorksheetWizardForm();
      closeWorksheetPdfWizard();
      if (typeof exportWorksheetPdf === 'function') exportWorksheetPdf(settings);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeWorksheetPdfWizard();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!modal.classList.contains('show')) return;
      e.preventDefault();
      closeWorksheetPdfWizard();
    });

    const form = document.getElementById('worksheetPdfForm');
    if (form) {
      form.addEventListener('change', schedulePreviewUpdate);
      form.addEventListener('input', schedulePreviewUpdate);
    }
  }

  window.showWorksheetPdfWizard = showWorksheetPdfWizard;
  window.closeWorksheetPdfWizard = closeWorksheetPdfWizard;
  window.readWorksheetWizardForm = readWorksheetWizardForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorksheetPdfWizard);
  } else {
    initWorksheetPdfWizard();
  }
})();
