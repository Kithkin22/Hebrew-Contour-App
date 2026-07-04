/* Page zoom / print preview — editor presentation only (exports unaffected) */
(function () {
  let pageZoomMode = '100';

  function normalizePageZoomMode(value) {
    const v = String(value || '').trim();
    if (v === 'fit' || v === '75' || v === '85' || v === '100') return v;
    return '100';
  }

  function computeFitPageZoom() {
    const wrap = document.getElementById('editorWrap');
    const sheet = document.querySelector('.contour-document-sheet');
    if (!wrap || !sheet) return 1;
    const availW = Math.max(240, wrap.clientWidth - 40);
    const availH = Math.max(320, wrap.clientHeight - 48);
    const sw = sheet.offsetWidth || 816;
    const sh = Math.max(sheet.offsetHeight, sheet.scrollHeight, 1056);
    const scale = Math.min(1, availW / sw, availH / sh);
    return Math.max(0.45, Math.round(scale * 1000) / 1000);
  }

  function getPageZoomScale(mode) {
    const m = normalizePageZoomMode(mode != null ? mode : pageZoomMode);
    if (m === 'fit') return computeFitPageZoom();
    return parseInt(m, 10) / 100;
  }

  function syncStageLayoutAfterZoom(stage, scale) {
    const sheet = stage.querySelector('.contour-document-sheet');
    if (!sheet) return;
    const w = sheet.offsetWidth;
    const h = Math.max(sheet.offsetHeight, sheet.scrollHeight);
    stage.style.width = Math.ceil(w * scale) + 'px';
    stage.style.minHeight = Math.ceil(h * scale) + 'px';
  }

  function updatePageZoomControls(mode, scale) {
    document.querySelectorAll('[data-page-zoom]').forEach((btn) => {
      const active = btn.dataset.pageZoom === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const label = document.getElementById('pageZoomStatus');
    if (label) {
      label.textContent = mode === 'fit'
        ? `Fit (${Math.round(scale * 100)}%)`
        : `${mode}%`;
    }
    const controls = document.getElementById('pageZoomControls');
    const parallelWrap = document.getElementById('parallelCompareWrap');
    const parallelActive = parallelWrap && !parallelWrap.classList.contains('hidden');
    if (controls) controls.classList.toggle('hidden', !!parallelActive);
  }

  function applyPageZoom(opts) {
    opts = opts || {};
    const stage = document.getElementById('contourPageZoomStage');
    if (!stage) return;
    const mode = normalizePageZoomMode(opts.mode != null ? opts.mode : pageZoomMode);
    pageZoomMode = mode;
    const scale = getPageZoomScale(mode);
    document.documentElement.style.setProperty('--contour-page-zoom', String(scale));
    stage.dataset.zoomMode = mode;
    stage.dataset.zoomScale = String(scale);
    syncStageLayoutAfterZoom(stage, scale);
    updatePageZoomControls(mode, scale);
    if (!opts.skipPersist && typeof syncPageZoomPref === 'function') syncPageZoomPref(mode);
    if (typeof scheduleArcOverlayRedraw === 'function') scheduleArcOverlayRedraw();
  }

  function setPageZoomMode(mode, opts) {
    applyPageZoom(Object.assign({ mode }, opts || {}));
  }

  function getPageZoomMode() {
    return pageZoomMode;
  }

  function scrollContourEditorToTop() {
    const wrap = document.getElementById('editorWrap');
    if (wrap) wrap.scrollTop = 0;
  }

  function bindPageZoomControls() {
    document.querySelectorAll('[data-page-zoom]').forEach((btn) => {
      if (btn.dataset.pageZoomBound) return;
      btn.dataset.pageZoomBound = '1';
      btn.addEventListener('click', () => applyPageZoom({ mode: btn.dataset.pageZoom }));
    });
    if (window._pageZoomResizeBound) return;
    window._pageZoomResizeBound = true;
    window.addEventListener('resize', () => {
      if (pageZoomMode === 'fit') applyPageZoom({ skipPersist: true });
    });
  }

  window.normalizePageZoomMode = normalizePageZoomMode;
  window.getPageZoomScale = getPageZoomScale;
  window.applyPageZoom = applyPageZoom;
  window.setPageZoomMode = setPageZoomMode;
  window.getPageZoomMode = getPageZoomMode;
  window.scrollContourEditorToTop = scrollContourEditorToTop;

  document.addEventListener('DOMContentLoaded', () => {
    bindPageZoomControls();
    applyPageZoom({ skipPersist: true });
  });
})();
