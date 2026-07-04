/* Page zoom / print preview — editor presentation only (exports unaffected) */
(function () {
  const PAGE_ZOOM_PRESETS = { fit: null, '75': 0.75, '85': 0.85, '100': 1 };
  const MIN_PAGE_ZOOM = 0.25;
  const MAX_PAGE_ZOOM = 2;
  const PRESET_MATCH_EPS = 0.008;
  const WHEEL_ZOOM_SENSITIVITY = 0.0022;

  let pageZoomMode = '100';
  let pageZoomScale = 1;
  let gestureSession = null;
  let pinchSession = null;
  let persistAfterGestureTimer = null;

  function clampPageZoomScale(scale) {
    return Math.min(MAX_PAGE_ZOOM, Math.max(MIN_PAGE_ZOOM, Math.round(scale * 1000) / 1000));
  }

  function parsePageZoomInput(value) {
    const v = String(value == null ? '' : value).trim();
    if (v === 'fit') return { mode: 'fit', scale: null };
    if (v === '75' || v === '85' || v === '100') {
      return { mode: v, scale: parseInt(v, 10) / 100 };
    }
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 25 && n <= 200) {
      return { mode: 'custom', scale: n / 100 };
    }
    return { mode: '100', scale: 1 };
  }

  function normalizePageZoomMode(value) {
    return parsePageZoomInput(value).mode;
  }

  function presetModeFromScale(scale) {
    const s = clampPageZoomScale(scale);
    if (Math.abs(s - 1) < PRESET_MATCH_EPS) return '100';
    if (Math.abs(s - 0.85) < PRESET_MATCH_EPS) return '85';
    if (Math.abs(s - 0.75) < PRESET_MATCH_EPS) return '75';
    return 'custom';
  }

  function getPageZoomScaleValue() {
    if (pageZoomMode === 'fit') return computeFitPageZoom();
    if (pageZoomMode === 'custom') return clampPageZoomScale(pageZoomScale);
    const preset = PAGE_ZOOM_PRESETS[pageZoomMode];
    return preset != null ? preset : 1;
  }

  function getPageZoomPersistValue() {
    if (pageZoomMode === 'fit') return 'fit';
    if (pageZoomMode === 'custom') return String(Math.round(getPageZoomScaleValue() * 100));
    return pageZoomMode;
  }

  function isParallelPageZoomDisabled() {
    const parallelWrap = document.getElementById('parallelCompareWrap');
    return !!(parallelWrap && !parallelWrap.classList.contains('hidden'));
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

  const FIT_FALLBACK_SCALE = 0.85;

  function getPageLayoutSize(sheet) {
    const letterW = (window.CONTOUR_PAGE && window.CONTOUR_PAGE.letterWidthPx) || 816;
    const letterMinH = (window.CONTOUR_PAGE && window.CONTOUR_PAGE.letterHeightPx) || 1056;
    const pageW = sheet.offsetWidth || letterW;
    const pageH = Math.max(sheet.offsetHeight, sheet.scrollHeight, letterMinH);
    return { pageW, pageH };
  }

  function getPageContentFitHeight(sheet, stage) {
    const { pageH } = getPageLayoutSize(sheet);
    const editor = stage?.querySelector('#editor');
    const contentH = editor?.scrollHeight || 0;
    if (contentH <= 0) return pageH;
    const title = stage?.querySelector('#contourPassageTitle');
    const titleExtra = title && !title.hidden ? title.offsetHeight + 24 : 0;
    const fitted = contentH + titleExtra + 48;
    if (fitted >= pageH - 80) return pageH;
    return Math.max(200, fitted);
  }

  /** Stage clip height — must match computeFitPageZoom in fit mode to avoid blank/clipped canvas */
  function getStageLayoutHeight(sheet, stage, mode) {
    const { pageH } = getPageLayoutSize(sheet);
    const zoomMode = mode != null ? mode : pageZoomMode;
    if (zoomMode === 'fit') return getPageContentFitHeight(sheet, stage);
    return pageH;
  }

  function isWordVisibleInEditorWrap(wordEl) {
    const wrap = document.getElementById('editorWrap');
    if (!wrap || !wordEl) return false;
    const fr = wordEl.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    return fr.width > 0 && fr.height > 0 && fr.bottom > wr.top + 2 && fr.top < wr.bottom - 2;
  }

  function computeFitPageZoom() {
    const wrap = document.getElementById('editorWrap');
    const stage = document.getElementById('contourPageZoomStage');
    const sheet = document.querySelector('.contour-document-sheet');
    const viewport = getEditorFitViewport();
    if (!wrap || !sheet || !viewport) return FIT_FALLBACK_SCALE;

    const { pageW } = getPageLayoutSize(sheet);
    const pageH = getPageContentFitHeight(sheet, stage);
    const scaleW = viewport.width / pageW;
    const scaleH = viewport.height / pageH;
    let scale = Math.min(1, scaleW, scaleH);
    scale = clampPageZoomScale(scale);
    if (!Number.isFinite(scale)) return FIT_FALLBACK_SCALE;
    return scale;
  }

  function ensureFitShowsContent(opts) {
    if (pageZoomMode !== 'fit') return;
    const words = document.querySelectorAll('#editor .word');
    if (!words.length) return;
    const word = words[0];
    const scale = getPageZoomScaleValue();
    if (!Number.isFinite(scale) || scale < MIN_PAGE_ZOOM) {
      applyPageZoom({ mode: '85', skipPersist: !!opts?.skipPersist, skipFitScroll: true });
      return;
    }
    if (isWordVisibleInEditorWrap(word)) return;
    scrollFitPageIntoView();
    requestAnimationFrame(() => {
      if (pageZoomMode !== 'fit') return;
      refreshPageZoomStageLayout();
      if (isWordVisibleInEditorWrap(word)) return;
      applyPageZoom({ mode: '85', skipPersist: !!opts?.skipPersist, skipFitScroll: true });
    });
  }

  function scrollFitPageIntoView() {
    scrollContourEditorToTop();
    const wrap = document.getElementById('editorWrap');
    if (!wrap) return;
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
  }

  function getPageZoomScale(mode) {
    const parsed = parsePageZoomInput(mode != null ? mode : pageZoomMode);
    if (parsed.mode === 'fit') return computeFitPageZoom();
    if (parsed.mode === 'custom') return clampPageZoomScale(parsed.scale);
    return PAGE_ZOOM_PRESETS[parsed.mode] || 1;
  }

  function pageZoomInner(stage) {
    return stage ? (stage.querySelector('.contour-page-zoom-inner') || stage) : null;
  }

  function syncStageLayoutAfterZoom(stage, scale, mode) {
    const sheet = stage?.querySelector('.contour-document-sheet');
    const inner = pageZoomInner(stage);
    if (!sheet || !inner) return;
    const { pageW } = getPageLayoutSize(sheet);
    const pageH = getStageLayoutHeight(sheet, stage, mode);
    stage.style.width = Math.ceil(pageW * scale) + 'px';
    stage.style.height = Math.ceil(pageH * scale) + 'px';
    stage.style.minHeight = '';
    inner.style.width = pageW + 'px';
    inner.style.height = pageH + 'px';
  }

  function refreshPageZoomStageLayout() {
    const stage = document.getElementById('contourPageZoomStage');
    if (!stage) return;
    syncStageLayoutAfterZoom(stage, getPageZoomScaleValue());
    clampEditorWrapScroll(document.getElementById('editorWrap'));
  }

  function updatePageZoomControls(mode, scale) {
    document.querySelectorAll('[data-page-zoom]').forEach((btn) => {
      const active = btn.dataset.pageZoom === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const label = document.getElementById('pageZoomStatus');
    if (label) {
      const pct = Math.round(scale * 100);
      if (mode === 'fit') label.textContent = `Fit (${pct}%)`;
      else if (mode === 'custom') label.textContent = `${pct}%`;
      else label.textContent = `${mode}%`;
    }
    const controls = document.getElementById('pageZoomControls');
    const parallelWrap = document.getElementById('parallelCompareWrap');
    const parallelActive = parallelWrap && !parallelWrap.classList.contains('hidden');
    if (controls) controls.classList.toggle('hidden', !!parallelActive);
  }

  function clampEditorWrapScroll(wrap) {
    if (!wrap) return;
    const maxScrollL = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
    const maxScrollT = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
    wrap.scrollLeft = Math.min(maxScrollL, Math.max(0, wrap.scrollLeft));
    wrap.scrollTop = Math.min(maxScrollT, Math.max(0, wrap.scrollTop));
  }

  function adjustScrollForZoom(wrap, focalX, focalY, oldScale, newScale) {
    if (!wrap || oldScale === newScale) return;
    const rect = wrap.getBoundingClientRect();
    const offsetX = focalX - rect.left;
    const offsetY = focalY - rect.top;
    const ratio = newScale / oldScale;
    wrap.scrollLeft = (wrap.scrollLeft + offsetX) * ratio - offsetX;
    wrap.scrollTop = (wrap.scrollTop + offsetY) * ratio - offsetY;
    clampEditorWrapScroll(wrap);
  }

  function setPinchZooming(active) {
    const stage = document.getElementById('contourPageZoomStage');
    const inner = pageZoomInner(stage);
    const wrap = document.getElementById('editorWrap');
    if (inner) inner.classList.toggle('is-pinch-zooming', !!active);
    if (wrap) wrap.classList.toggle('contour-page-zoom-gesturing', !!active);
  }

  function queuePersistAfterGesture() {
    if (persistAfterGestureTimer) clearTimeout(persistAfterGestureTimer);
    persistAfterGestureTimer = setTimeout(() => {
      persistAfterGestureTimer = null;
      if (typeof syncPageZoomPref === 'function') syncPageZoomPref(getPageZoomPersistValue());
    }, 120);
  }

  function applyPageZoom(opts) {
    opts = opts || {};
    const stage = document.getElementById('contourPageZoomStage');
    if (!stage) return;
    const wrap = document.getElementById('editorWrap');
    const oldScale = getPageZoomScaleValue();

    if (opts.scale != null) {
      pageZoomScale = clampPageZoomScale(opts.scale);
      pageZoomMode = presetModeFromScale(pageZoomScale);
    } else if (opts.mode != null) {
      const parsed = parsePageZoomInput(opts.mode);
      pageZoomMode = parsed.mode;
      if (parsed.mode === 'custom') pageZoomScale = parsed.scale;
    }

    const mode = pageZoomMode;
    const scale = getPageZoomScaleValue();
    document.documentElement.style.setProperty('--contour-page-zoom', String(scale));
    stage.dataset.zoomMode = mode;
    stage.dataset.zoomScale = String(scale);
    syncStageLayoutAfterZoom(stage, scale, mode);
    updatePageZoomControls(mode, scale);

    if (opts.focal && wrap && oldScale !== scale) {
      adjustScrollForZoom(wrap, opts.focal.x, opts.focal.y, oldScale, scale);
    } else if (!opts.skipFitScroll) {
      scrollFitPageIntoView();
    } else {
      clampEditorWrapScroll(wrap);
    }

    if (!opts.skipPersist && typeof syncPageZoomPref === 'function') {
      syncPageZoomPref(getPageZoomPersistValue());
    }
    if (!opts.skipArcRedraw && typeof scheduleArcOverlayRedraw === 'function') {
      scheduleArcOverlayRedraw();
    }
    if (!opts.skipArcRedraw && typeof renderInclusioFrameOverlays === 'function') {
      renderInclusioFrameOverlays();
    }
    if (mode === 'fit' && !opts.skipFitGuard) {
      requestAnimationFrame(() => ensureFitShowsContent({ skipPersist: opts.skipPersist }));
    }
  }

  function setPageZoomScale(scale, opts) {
    opts = opts || {};
    applyPageZoom(Object.assign({
      scale,
      skipPersist: !!opts.live,
      skipArcRedraw: !!opts.live,
      skipFitScroll: true,
      focal: opts.focal,
    }, opts));
    if (!opts.live) return;
    queuePersistAfterGesture();
  }

  function zoomByFactor(factor, focal, opts) {
    const next = clampPageZoomScale(getPageZoomScaleValue() * factor);
    setPageZoomScale(next, Object.assign({ focal }, opts || {}));
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

  function scrollWordIntoEditorView(el, opts) {
    opts = opts || {};
    const wrap = document.getElementById('editorWrap');
    if (!wrap || !el) return;
    const pad = opts.pad != null ? opts.pad : 48;
    const wr = wrap.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.top < wr.top + pad) wrap.scrollTop += er.top - wr.top - pad;
    else if (er.bottom > wr.bottom - pad) wrap.scrollTop += er.bottom - wr.bottom + pad;
    clampEditorWrapScroll(wrap);
  }

  function isDocumentZoomTarget(target) {
    if (!target || isParallelPageZoomDisabled()) return false;
    const wrap = document.getElementById('editorWrap');
    const stage = document.getElementById('contourPageZoomStage');
    if (!wrap || !stage) return false;
    return wrap.contains(target) || stage.contains(target);
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

  function bindPageZoomGestures() {
    if (window._pageZoomGesturesBound) return;
    window._pageZoomGesturesBound = true;

    document.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (!isDocumentZoomTarget(e.target)) return;
      e.preventDefault();
      setPinchZooming(true);
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomByFactor(factor, { x: e.clientX, y: e.clientY }, { live: true });
      setPinchZooming(false);
    }, { passive: false, capture: true });

    const bindGestureTarget = (el) => {
      if (!el || el.dataset.pageZoomGestureBound) return;
      el.dataset.pageZoomGestureBound = '1';

      el.addEventListener('gesturestart', (e) => {
        if (isParallelPageZoomDisabled()) return;
        e.preventDefault();
        gestureSession = {
          startScale: getPageZoomScaleValue(),
          lastScale: getPageZoomScaleValue(),
        };
        setPinchZooming(true);
      }, { passive: false });

      el.addEventListener('gesturechange', (e) => {
        if (!gestureSession || isParallelPageZoomDisabled()) return;
        e.preventDefault();
        const next = clampPageZoomScale(gestureSession.startScale * (e.scale || 1));
        setPageZoomScale(next, {
          live: true,
          focal: { x: e.clientX, y: e.clientY },
        });
        gestureSession.lastScale = next;
      }, { passive: false });

      el.addEventListener('gestureend', (e) => {
        if (!gestureSession) return;
        e.preventDefault();
        gestureSession = null;
        setPinchZooming(false);
        queuePersistAfterGesture();
      }, { passive: false });

      el.addEventListener('touchstart', (e) => {
        if (isParallelPageZoomDisabled() || e.touches.length !== 2) return;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchSession = {
          startDist: Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY),
          startScale: getPageZoomScaleValue(),
          focalX: (t0.clientX + t1.clientX) / 2,
          focalY: (t0.clientY + t1.clientY) / 2,
        };
        setPinchZooming(true);
      }, { passive: true });

      el.addEventListener('touchmove', (e) => {
        if (!pinchSession || e.touches.length !== 2) return;
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (pinchSession.startDist <= 0) return;
        const next = clampPageZoomScale(pinchSession.startScale * (dist / pinchSession.startDist));
        pinchSession.focalX = (t0.clientX + t1.clientX) / 2;
        pinchSession.focalY = (t0.clientY + t1.clientY) / 2;
        setPageZoomScale(next, {
          live: true,
          focal: { x: pinchSession.focalX, y: pinchSession.focalY },
        });
      }, { passive: false });

      el.addEventListener('touchend', () => {
        if (!pinchSession) return;
        pinchSession = null;
        setPinchZooming(false);
        queuePersistAfterGesture();
      }, { passive: true });

      el.addEventListener('touchcancel', () => {
        pinchSession = null;
        setPinchZooming(false);
      }, { passive: true });
    };

    const stage = document.getElementById('contourPageZoomStage');
    const wrap = document.getElementById('editorWrap');
    bindGestureTarget(stage);
    bindGestureTarget(wrap);
  }

  function syncPageZoomAfterContentChange() {
    const stage = document.getElementById('contourPageZoomStage');
    if (!stage) return;
    if (pageZoomMode === 'fit') {
      applyPageZoom({ skipPersist: true, skipFitScroll: true, skipFitGuard: true, skipArcRedraw: true });
    } else {
      refreshPageZoomStageLayout();
    }
  }

  window.normalizePageZoomMode = normalizePageZoomMode;
  window.parsePageZoomInput = parsePageZoomInput;
  window.getPageZoomScale = getPageZoomScale;
  window.getPageZoomScaleValue = getPageZoomScaleValue;
  window.getPageZoomPersistValue = getPageZoomPersistValue;
  window.applyPageZoom = applyPageZoom;
  window.setPageZoomMode = setPageZoomMode;
  window.setPageZoomScale = setPageZoomScale;
  window.zoomByFactor = zoomByFactor;
  window.getPageZoomMode = getPageZoomMode;
  window.scrollContourEditorToTop = scrollContourEditorToTop;
  window.scrollWordIntoEditorView = scrollWordIntoEditorView;
  window.refreshPageZoomStageLayout = refreshPageZoomStageLayout;
  window.syncPageZoomAfterContentChange = syncPageZoomAfterContentChange;
  window.computeFitPageZoom = computeFitPageZoom;
  window.getStageLayoutHeight = getStageLayoutHeight;
  window.getEditorFitViewport = getEditorFitViewport;
  window.clampPageZoomScale = clampPageZoomScale;
  window.isWordVisibleInEditorWrap = isWordVisibleInEditorWrap;
  window.ensureFitShowsContent = ensureFitShowsContent;

  function ensurePageZoomInnerWrapper() {
    const stage = document.getElementById('contourPageZoomStage');
    if (!stage || stage.querySelector('.contour-page-zoom-inner')) return;
    const inner = document.createElement('div');
    inner.className = 'contour-page-zoom-inner';
    while (stage.firstChild) inner.appendChild(stage.firstChild);
    stage.appendChild(inner);
  }

  function migrateStrayEditorWrapArcSvg() {
    const wrap = document.getElementById('editorWrap');
    const ed = document.getElementById('editor');
    const stray = wrap?.querySelector(':scope > #arcSvg');
    if (!stray) return;
    if (ed && typeof ensureArcSvgLayer === 'function') ensureArcSvgLayer();
    else stray.remove();
  }

  function bootPageZoom() {
    ensurePageZoomInnerWrapper();
    migrateStrayEditorWrapArcSvg();
    bindPageZoomControls();
    bindPageZoomGestures();
    applyPageZoom({ skipPersist: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPageZoom);
  } else {
    bootPageZoom();
  }
})();
