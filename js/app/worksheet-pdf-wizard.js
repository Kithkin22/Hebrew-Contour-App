/* Worksheet PDF export wizard modal */

(function () {
  let previewTimer = null;

  function modalEl() {
    return document.getElementById('worksheetPdfModal');
  }

  function syncScaleCustomVisibility() {
    const form = document.getElementById('worksheetPdfForm');
    const wrap = document.getElementById('worksheetScaleCustomWrap');
    if (!form || !wrap) return;
    const mode = form.elements.scaleMode;
    const selected = mode && (mode.value || (mode instanceof RadioNodeList && [...mode].find((r) => r.checked)?.value));
    wrap.classList.toggle('hidden', selected !== 'custom');
  }

  function readWorksheetWizardForm() {
    const form = document.getElementById('worksheetPdfForm');
    if (!form) return { ...(window.WORKSHEET_EXPORT_DEFAULTS || {}) };
    const val = (name) => {
      const el = form.elements[name];
      if (!el) return null;
      if (el.type === 'checkbox') return el.checked;
      if (el instanceof RadioNodeList) {
        const checked = [...el].find((r) => r.checked);
        return checked ? checked.value : null;
      }
      return el.value;
    };
    return typeof normalizeWorksheetExportOptions === 'function'
      ? normalizeWorksheetExportOptions({
        scaleMode: val('scaleMode'),
        scalePercent: val('scalePercent'),
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
        includeExportTimestamp: val('includeExportTimestamp'),
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
      else if (el instanceof RadioNodeList) {
        [...el].forEach((r) => { r.checked = r.value === String(value); });
      } else if (value != null) el.value = value;
    };
    set('scaleMode', settings.scaleMode || (settings.fitOnePage ? 'fit' : '100'));
    set('scalePercent', settings.scalePercent);
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
    set('includeExportTimestamp', settings.includeExportTimestamp);
    syncScaleCustomVisibility();
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
    const previewWrap = document.querySelector('.worksheet-wizard-preview');
    if (!frame || !state.verses.length) {
      frame?.removeAttribute('srcdoc');
      return;
    }
    const settings = readWorksheetWizardForm();
    let layout = null;
    if (typeof computeWorksheetLayoutForExport === 'function') {
      layout = computeWorksheetLayoutForExport(settings);
    }
    if (layout && previewWrap) {
      const thumbW = 180;
      const scale = thumbW / layout.pageW;
      previewWrap.style.setProperty('--worksheet-preview-page-w', layout.pageW + 'px');
      previewWrap.style.setProperty('--worksheet-preview-page-h', layout.pageH + 'px');
      previewWrap.style.setProperty('--worksheet-preview-scale', String(scale));
    }

    const showScreenshotPreview = () => {
      if (typeof buildScreenshotWorksheetDocument !== 'function' || typeof captureWorksheetContourScreenshot !== 'function') {
        return false;
      }
      captureWorksheetContourScreenshot(settings).then((capture) => {
        if (!capture) return;
        const html = buildScreenshotWorksheetDocument(capture, settings);
        if (html) frame.srcdoc = html;
      }).catch(() => {});
      return true;
    };

    if (showScreenshotPreview()) return;

    if (typeof buildContourExportDocument !== 'function') return;
    let html = '';
    try {
      html = buildContourExportDocument({
        worksheetSettings: settings,
        includePrintButton: false,
        worksheetLayout: layout,
        docTitle: '\u200B',
      });
    } catch (e) {
      return;
    }
    if (html) frame.srcdoc = html;
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
      form.addEventListener('change', () => {
        syncScaleCustomVisibility();
        schedulePreviewUpdate();
      });
      form.addEventListener('input', schedulePreviewUpdate);
    }
    syncScaleCustomVisibility();
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
