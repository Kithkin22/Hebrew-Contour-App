/* Page zoom / print preview — editor presentation only (exports unaffected) */
(function () {
  let pageZoomMode = '100';

  function normalizePageZoomMode(value) {
    const v = String(value || '').trim();
    if (v === 'fit' || v === '75' || v === '85' || v === '100') return v;
    return '100';
  }

  function getEditorFitViewport() {
    const wrap = document.getElementById('editorWrap');
    if (!wrap) return null;

    const cs = getComputedStyle(wrap);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const PAGE_PAD = 16;

    const wrapRect = wrap.getBoundingClientRect();
    let availW = wrap.clientWidth - padL - padR - PAGE_PAD * 2;

    let availH;
    if (wrap.clientHeight > 0 && wrap.scrollHeight > wrap.clientHeight + 1) {
      availH = wrap.clientHeight - padT - padB - PAGE_PAD * 2;
    } else {
      const port = wrap.closest('.contour-with-comments')
        || wrap.closest('#singleEditorSection')
        || wrap.closest('.main-workspace')
        || wrap;
      const portRect = port.getBoundingClientRect();
      const bottom = Math.min(portRect.bottom, window.innerHeight);
      availH = bottom - wrapRect.top - padT - padB - PAGE_PAD * 2;
    }

    return {
      width: Math.max(120, availW),
      height: Math.max(160, availH),
    };
  }

  function getPageLayoutSize(sheet) {
    const letterW = (window.CONTOUR_PAGE && window.CONTOUR_PAGE.letterWidthPx) || 816;
    const letterMinH = (window.CONTOUR_PAGE && window.CONTOUR_PAGE.letterHeightPx) || 1056;
    const pageW = sheet.offsetWidth || letterW;
    const pageH = Math.max(sheet.offsetHeight, sheet.scrollHeight, letterMinH);
    return { pageW, pageH };
  }

  function computeFitPageZoom() {
    const wrap = document.getElementById('editorWrap');
    const sheet = document.querySelector('.contour-document-sheet');
    const viewport = getEditorFitViewport();
    if (!wrap || !sheet || !viewport) return 1;

    const { pageW, pageH } = getPageLayoutSize(sheet);
    const scaleW = viewport.width / pageW;
    const scaleH = viewport.height / pageH;
    const scale = Math.min(1, scaleW, scaleH);
    return Math.max(0.2, Math.round(scale * 1000) / 1000);
  }

  function scrollFitPageIntoView() {
    scrollContourEditorToTop();
    const wrap = document.getElementById('editorWrap');
    const stage = document.getElementById('contourPageZoomStage');
    if (!wrap || !stage) return;
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
    try {
      stage.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
    } catch (_) {
      stage.scrollIntoView(true);
    }
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
    if (mode === 'fit') scrollFitPageIntoView();
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
  window.computeFitPageZoom = computeFitPageZoom;
  window.getEditorFitViewport = getEditorFitViewport;

  document.addEventListener('DOMContentLoaded', () => {
    bindPageZoomControls();
    applyPageZoom({ skipPersist: true });
  });
})();
