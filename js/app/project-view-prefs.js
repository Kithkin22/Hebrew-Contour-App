/* Per-project workspace display preferences (saved in project JSON) */
(function () {
  let projectViewPrefs = null;

  function defaultProjectViewPrefs() {
    return {
      hideVerseRefs: true,
      inspectorEnabled: false,
      commentsPanelOpen: false,
      contourDensity: 'single',
      pageZoom: '85',
    };
  }

  function legacyProjectViewPrefs() {
    return {
      hideVerseRefs: false,
      inspectorEnabled: false,
      commentsPanelOpen: false,
      contourDensity: 'comfortable',
      pageZoom: '100',
    };
  }

  function normalizeProjectViewPrefs(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      hideVerseRefs: !!raw.hideVerseRefs,
      inspectorEnabled: !!raw.inspectorEnabled,
      commentsPanelOpen: !!raw.commentsPanelOpen,
      contourDensity: raw.contourDensity === 'comfortable' ? 'comfortable' : 'single',
      pageZoom: (function () {
        if (typeof parsePageZoomInput === 'function') {
          const parsed = parsePageZoomInput(raw.pageZoom);
          if (parsed.mode === 'custom') return String(Math.round(parsed.scale * 100));
          return parsed.mode;
        }
        const v = raw.pageZoom;
        if (v === 'fit' || v === '75' || v === '85' || v === '100') return v;
        const n = parseInt(v, 10);
        if (!isNaN(n) && n >= 25 && n <= 200) return String(n);
        return '100';
      })(),
    };
  }

  function getProjectViewPrefs() {
    if (!projectViewPrefs) projectViewPrefs = defaultProjectViewPrefs();
    return projectViewPrefs;
  }

  function setProjectViewPrefs(prefs, opts) {
    opts = opts || {};
    if (opts.reset) {
      projectViewPrefs = defaultProjectViewPrefs();
    } else if (prefs) {
      projectViewPrefs = normalizeProjectViewPrefs(prefs) || defaultProjectViewPrefs();
    } else {
      projectViewPrefs = defaultProjectViewPrefs();
    }
    applyProjectViewPrefsToUI({ legacy: !!opts.legacy });
    if (opts.persist !== false && typeof autoSaveProject === 'function' && window.autosaveReady) {
      autoSaveProject();
    }
  }

  function captureProjectViewPrefs() {
    let commentsOpen = false;
    try {
      commentsOpen = typeof commentsPanelCollapsed !== 'undefined' ? !commentsPanelCollapsed : false;
    } catch (e) { /* ignore */ }
    const density = document.body.classList.contains('contour-density-comfortable') ? 'comfortable' : 'single';
    let hideVerseRefs = !!getProjectViewPrefs().hideVerseRefs;
    try {
      if (typeof state !== 'undefined' && state && Array.isArray(state.verses) && state.verses.length) {
        const fn = typeof verseRefHidden === 'function' ? verseRefHidden : (v) => !!v.hideRef;
        hideVerseRefs = state.verses.every(v => fn(v));
      }
    } catch (e) { /* ignore */ }
    return {
      hideVerseRefs,
      inspectorEnabled: !!window.CONTOUR_INSPECTOR_ENABLED,
      commentsPanelOpen: commentsOpen,
      contourDensity: density,
      pageZoom: typeof getPageZoomPersistValue === 'function'
        ? getPageZoomPersistValue()
        : (typeof getPageZoomMode === 'function' ? getPageZoomMode() : '100'),
    };
  }

  function applyContourDensityClass(density) {
    const single = density !== 'comfortable';
    document.body.classList.toggle('contour-density-single', single);
    document.body.classList.toggle('contour-density-comfortable', !single);
  }

  function applyProjectViewPrefsToUI(opts) {
    opts = opts || {};
    const prefs = getProjectViewPrefs();

    applyContourDensityClass(prefs.contourDensity);

    if (typeof setInspectorEnabled === 'function') {
      setInspectorEnabled(!!prefs.inspectorEnabled, { skipPersist: true });
    }

    try {
      if (typeof commentsPanelCollapsed !== 'undefined') {
        commentsPanelCollapsed = !prefs.commentsPanelOpen;
        if (typeof renderCommentsPanel === 'function') renderCommentsPanel();
      }
    } catch (e) { /* ignore */ }

    if (typeof setPageZoomMode === 'function') {
      setPageZoomMode(prefs.pageZoom || '100', { skipPersist: true });
    }
  }

  function syncPageZoomPref(mode) {
    const prefs = getProjectViewPrefs();
    prefs.pageZoom = mode != null
      ? String(mode)
      : (typeof getPageZoomPersistValue === 'function' ? getPageZoomPersistValue() : '100');
    projectViewPrefs = prefs;
    if (typeof autoSaveProject === 'function' && window.autosaveReady) autoSaveProject();
  }

  function applyNewContentViewPrefs(verses) {
    if (!Array.isArray(verses) || !verses.length) return;
    const prefs = getProjectViewPrefs();
    if (prefs.hideVerseRefs) {
      verses.forEach(v => { v.hideRef = true; });
    }
  }

  function syncHideVerseRefsPref(hidden) {
    const prefs = getProjectViewPrefs();
    prefs.hideVerseRefs = !!hidden;
    projectViewPrefs = prefs;
    if (typeof autoSaveProject === 'function' && window.autosaveReady) autoSaveProject();
  }

  function syncInspectorPref(enabled) {
    const prefs = getProjectViewPrefs();
    prefs.inspectorEnabled = !!enabled;
    projectViewPrefs = prefs;
    if (typeof autoSaveProject === 'function' && window.autosaveReady) autoSaveProject();
  }

  function syncCommentsPanelPref(open) {
    const prefs = getProjectViewPrefs();
    prefs.commentsPanelOpen = !!open;
    projectViewPrefs = prefs;
    if (typeof autoSaveProject === 'function' && window.autosaveReady) autoSaveProject();
  }

  function restoreProjectViewPrefsFromPayload(payload) {
    const normalized = normalizeProjectViewPrefs(payload && payload.viewPrefs);
    if (normalized) {
      projectViewPrefs = normalized;
      applyProjectViewPrefsToUI();
      return;
    }
    projectViewPrefs = legacyProjectViewPrefs();
    applyProjectViewPrefsToUI({ legacy: true });
  }

  window.defaultProjectViewPrefs = defaultProjectViewPrefs;
  window.legacyProjectViewPrefs = legacyProjectViewPrefs;
  window.getProjectViewPrefs = getProjectViewPrefs;
  window.setProjectViewPrefs = setProjectViewPrefs;
  window.captureProjectViewPrefs = captureProjectViewPrefs;
  window.applyProjectViewPrefsToUI = applyProjectViewPrefsToUI;
  window.applyNewContentViewPrefs = applyNewContentViewPrefs;
  window.syncHideVerseRefsPref = syncHideVerseRefsPref;
  window.syncInspectorPref = syncInspectorPref;
  window.syncCommentsPanelPref = syncCommentsPanelPref;
  window.syncPageZoomPref = syncPageZoomPref;
  window.restoreProjectViewPrefsFromPayload = restoreProjectViewPrefsFromPayload;

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('contour-density-single')
      && !document.body.classList.contains('contour-density-comfortable')) {
      applyContourDensityClass(getProjectViewPrefs().contourDensity);
    }
  });
})();
