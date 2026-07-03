/**
 * Hebrew Contour — UI Shell
 * Restructures existing DOM into modern three-column layout.
 * Preserves all element IDs and event handlers (moves nodes, never clones).
 */
(function () {
  'use strict';

  var initialized = false;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function init() {
    if (initialized || document.querySelector('.hc-app-body')) return;
    var appRoot = $('#appRoot');
    var wrap = $('.wrap', appRoot);
    var mainWorkspace = $('.main-workspace', wrap);
    if (!appRoot || !wrap || !mainWorkspace) return;

    initialized = true;
    appRoot.classList.add('hc-shell-ready');
    document.body.classList.add('hc-shell-ready');

    var topNav = buildTopNav(appRoot, wrap);
    var secondary = buildSecondaryToolbar(wrap);
    var appBody = el('div', 'hc-app-body');
    var sidebar = buildSidebar(wrap);
    var workspace = buildWorkspace(wrap);
    var rightPanel = buildRightPanel();

    wrap.insertBefore(topNav, wrap.firstChild);
    if (wrap.children.length > 1) {
      wrap.insertBefore(secondary, wrap.children[1]);
    } else {
      wrap.appendChild(secondary);
    }

    var workspaceContent = $('.hc-workspace-content', workspace);
    if (mainWorkspace && workspaceContent) {
      workspaceContent.appendChild(mainWorkspace);
    }

    appBody.appendChild(sidebar);
    appBody.appendChild(workspace);
    appBody.appendChild(rightPanel);
    wrap.appendChild(appBody);

    var statusBar = buildStatusBar();
    wrap.appendChild(statusBar);

    setupSegmentedToggles();
    setupSidebarCollapse(sidebar, appBody);
    setupRightPanelTabs(rightPanel);
    setupInspectorDock(rightPanel);
    setupCommentsDock(rightPanel);
    setupVerseNavigation(sidebar);
    setupParallelInSecondary(secondary);
    relocateMorphButtons(secondary);
    setupDocumentToolbar();
    syncProjectName();
    syncPanelVisibility();
    hookRenderForVerseNav();
    hookRenderForSidebarNotes();

    if (typeof window.setupHcNavMenus === 'function' && topNav._navButtons) {
      window.setupHcNavMenus(topNav._navButtons);
    }
    if (typeof window.reapplyHcNavMenuPatches === 'function') {
      window.reapplyHcNavMenuPatches();
    }

  }

  /* ── Top Navigation ── */
  function buildTopNav(appRoot, wrap) {
    var nav = el('nav', 'hc-top-nav');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    var brand = el('div', 'hc-top-nav-brand');
    brand.innerHTML =
      '<span class="hc-top-nav-logo">ALEPH CONTOUR</span>' +
      '<span class="hc-top-nav-tagline">Contour</span>';

    var menubar = el('div', 'hc-aleph-menubar');
    menubar.setAttribute('role', 'menubar');

    var projectBtn = el('button', 'hc-nav-menu-btn hc-aleph-menu-btn');
    projectBtn.type = 'button';
    projectBtn.textContent = 'Project';
    projectBtn.dataset.hcMenu = 'file';
    projectBtn.setAttribute('role', 'menuitem');
    menubar.appendChild(projectBtn);

    if (typeof window.setupAlephMenus === 'function') {
      window.setupAlephMenus(menubar);
    }

    var exportBtn = el('button', 'hc-nav-menu-btn hc-aleph-menu-btn');
    exportBtn.type = 'button';
    exportBtn.textContent = 'Export';
    exportBtn.dataset.hcMenu = 'export';
    exportBtn.setAttribute('role', 'menuitem');
    menubar.appendChild(exportBtn);

    var left = el('div', 'hc-top-nav-left');
    left.appendChild(menubar);

    var center = el('div', 'hc-top-nav-center');
    var projectNameEl = el('span', 'hc-top-nav-project-name');
    projectNameEl.id = 'hcTopNavProjectName';
    var currentName = $('#currentProjectName');
    projectNameEl.textContent = currentName ? currentName.textContent : 'Untitled Project';
    center.appendChild(projectNameEl);

    var right = el('div', 'hc-top-nav-right');

    ['inspectorToggleBtn', 'themeToggleBtn', 'manualInspectorBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.classList.add('hc-nav-btn');
        right.appendChild(btn);
      }
    });

    var adminLink = $('#adminLink');
    if (adminLink) {
      adminLink.classList.add('hc-nav-btn');
      right.appendChild(adminLink);
    }

    nav.appendChild(brand);
    nav.appendChild(left);
    nav.appendChild(center);
    nav.appendChild(right);

    nav._navButtons = { file: projectBtn, export: exportBtn };
    return nav;
  }

  function makeNavProxy(label, onClick) {
    var btn = el('button', 'hc-nav-btn');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function openTopMenu(card) {
    if (!card) return;
    card.classList.add('menu-open');
    var trigger = card.querySelector('.menu-trigger, .save-tools-title');
    if (trigger) trigger.click();
    var backdrop = $('#topMenuBackdrop');
    if (backdrop) {
      backdrop.classList.add('show');
      backdrop.onclick = function () {
        card.classList.remove('menu-open');
        backdrop.classList.remove('show');
      };
    }
  }

  /* ── Secondary Toolbar — workspace context only ── */
  function buildSecondaryToolbar(wrap) {
    var bar = el('div', 'hc-secondary-toolbar');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Document context');

    var left = el('div', 'hc-secondary-toolbar-group');
    var right = el('div', 'hc-secondary-toolbar-group hc-secondary-right');

    var morphSlot = el('div', 'hc-morph-slot');
    morphSlot.id = 'hcMorphSlot';
    left.appendChild(morphSlot);

    var parallelSlot = el('div', 'hc-parallel-controls');
    parallelSlot.id = 'hcParallelSlot';
    right.appendChild(parallelSlot);

    var refDisplay = el('span', 'hc-secondary-ref muted small');
    refDisplay.id = 'hcRefDisplay';
    right.appendChild(refDisplay);

    bar.appendChild(left);
    bar.appendChild(right);
    return bar;
  }

  function setupDocumentToolbar() {
    function tryBuild() {
      var header = $('.hc-workspace-header');
      if (!header) return;

      var toolbar = $('#hcDocToolbar');
      if (!toolbar) {
        toolbar = el('div', 'hc-doc-toolbar');
        toolbar.id = 'hcDocToolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Document tools');

        var undoGroup = el('div', 'hc-toolbar-group');
        var undoBtn = el('button', 'hc-toolbar-btn hc-ghost-btn');
        undoBtn.type = 'button';
        undoBtn.title = 'Undo (⌘Z)';
        undoBtn.innerHTML = '<span class="hc-toolbar-icon" aria-hidden="true">↶</span><span class="hc-toolbar-text">Undo</span>';
        undoBtn.addEventListener('click', function () {
          if (typeof window.undoLastChange === 'function') window.undoLastChange();
        });
        undoGroup.appendChild(undoBtn);

        var formatGroup = el('div', 'hc-toolbar-group');
        [
          { id: 'toggleBold', label: 'B', title: 'Bold (⌘B)' },
          { id: 'toggleItalic', label: 'I', title: 'Italic (⌘I)' },
          { id: 'toggleUnderline', label: 'U', title: 'Underline (⌘U)' }
        ].forEach(function (def) {
          var src = document.getElementById(def.id);
          if (!src) return;
          var proxy = el('button', 'hc-toolbar-btn hc-ghost-btn hc-format-btn');
          proxy.type = 'button';
          proxy.title = def.title;
          proxy.innerHTML = '<span class="hc-toolbar-icon">' + def.label + '</span>';
          proxy.addEventListener('click', function () { src.click(); });
          formatGroup.appendChild(proxy);
        });

        var commentsGroup = el('div', 'hc-toolbar-group');
        var commentsBtn = el('button', 'hc-toolbar-btn hc-ghost-btn');
        commentsBtn.type = 'button';
        commentsBtn.title = 'Show comments';
        commentsBtn.innerHTML = '<span class="hc-toolbar-icon" aria-hidden="true">◇</span><span class="hc-toolbar-text">Comments</span>';
        commentsBtn.addEventListener('click', function () {
          var btn = document.getElementById('showCommentsPanel');
          if (btn) btn.click();
          var tab = $('.hc-panel-tab[data-panel="comments"]');
          if (tab) tab.click();
        });
        commentsGroup.appendChild(commentsBtn);

        var toolsSlot = el('div', 'hc-toolbar-tools');
        toolsSlot.id = 'hcAnnotationToolsSlot';

        toolbar.appendChild(undoGroup);
        toolbar.appendChild(el('div', 'hc-toolbar-divider'));
        toolbar.appendChild(formatGroup);
        toolbar.appendChild(el('div', 'hc-toolbar-divider'));
        toolbar.appendChild(commentsGroup);
        toolbar.appendChild(toolsSlot);
        header.appendChild(toolbar);
      }

      var annShell = $('#annotationTabsShell');
      var slot = $('#hcAnnotationToolsSlot');
      if (annShell && slot && annShell.parentNode !== slot) {
        slot.appendChild(annShell);
      }

      var viewHeader = $('.workspace-view-header');
      if (viewHeader) viewHeader.classList.add('hc-legacy-hidden');
    }

    tryBuild();
    setTimeout(tryBuild, 600);
    setTimeout(tryBuild, 2000);
  }

  function relocateMorphButtons(secondary) {
    function tryMove() {
      var slot = $('#hcMorphSlot');
      if (!slot) return;
      ['importMorphDataBtn', 'clearMorphDataBtn'].forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn && btn.parentNode !== slot) {
          btn.classList.add('hc-toolbar-btn');
          slot.appendChild(btn);
        }
      });
    }
    tryMove();
    setTimeout(tryMove, 500);
    setTimeout(tryMove, 2000);
    var obs = new MutationObserver(tryMove);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function setupParallelInSecondary(secondary) {
    var parallelBar = $('#parallelModeBar');
    var slot = $('#hcParallelSlot');
    if (!parallelBar || !slot) return;

    var toggle = $('#parallelModeToggle');
    var shiftUp = $('#shiftRightUpBtn');
    var shiftDown = $('#shiftRightDownBtn');

    if (toggle) {
      var label = el('label', 'hc-parallel-label small');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.appendChild(toggle.cloneNode(true));
      label.lastChild.id = 'parallelModeToggleProxy';
      /* Keep original checkbox — move it */
      label.removeChild(label.lastChild);
      label.appendChild(toggle);
      label.appendChild(document.createTextNode(' Parallel'));
      slot.appendChild(label);
    }
    if (shiftUp) slot.appendChild(shiftUp);
    if (shiftDown) slot.appendChild(shiftDown);

    var indicator = $('#activePaneIndicator');
    if (indicator) slot.appendChild(indicator);
  }

  /* ── Sidebar ── */
  function buildSidebar(wrap) {
    var sidebar = el('aside', 'hc-sidebar');
    sidebar.setAttribute('aria-label', 'Project navigation');

    var header = el('div', 'hc-sidebar-header');
    header.innerHTML = '<span class="hc-sidebar-title">Navigation</span>';
    var collapseBtn = el('button', 'hc-sidebar-collapse-btn');
    collapseBtn.type = 'button';
    collapseBtn.setAttribute('aria-label', 'Collapse sidebar');
    collapseBtn.textContent = '‹';
    header.appendChild(collapseBtn);
    sidebar.appendChild(header);

    var scroll = el('div', 'hc-sidebar-scroll');

    /* Project section */
    var projectSection = el('div', 'hc-sidebar-section');
    projectSection.innerHTML = '<div class="hc-sidebar-section-title">Project</div>';
    var projName = el('div', 'hc-sidebar-project-name');
    projName.id = 'hcSidebarProjectName';
    var cur = $('#currentProjectName');
    projName.textContent = cur ? cur.textContent : 'Untitled Project';
    projectSection.appendChild(projName);

    var saveStatus = el('div', 'hc-save-status saved');
    saveStatus.id = 'hcSidebarSaveStatus';
    var origStatus = $('#saveStatus');
    saveStatus.textContent = origStatus ? origStatus.textContent || 'All changes saved' : 'All changes saved';
    projectSection.appendChild(saveStatus);

    var actions = el('div', 'hc-sidebar-actions');
    var actionDefs = [
      { label: 'Save', action: 'save-project' },
      { label: 'New Project', action: 'new-project' },
      { label: 'Open Project', submenu: 'openRecentMenuBtn' },
      { label: 'Import Morph Data (.json)', id: 'importMorphDataBtnSidebar' },
      { label: 'Project Settings', action: 'settings-rename' }
    ];
    actionDefs.forEach(function (def) {
      var btn = el('button', 'hc-sidebar-action');
      btn.type = 'button';
      btn.innerHTML = '<span>' + def.label + '</span>';
      if (def.action) {
        btn.addEventListener('click', function () {
          var item = $('.file-menu-item[data-action="' + def.action + '"]');
          if (item) item.click();
        });
      } else if (def.submenu) {
        btn.addEventListener('click', function () {
          if (typeof window.openRecentProjectsMenu === 'function') window.openRecentProjectsMenu(btn);
        });
      } else if (def.id === 'importMorphDataBtnSidebar') {
        btn.addEventListener('click', function () {
          var morphBtn = document.getElementById('importMorphDataBtn');
          if (morphBtn) morphBtn.click();
          else document.getElementById('morphImportInput')?.click();
        });
      }
      actions.appendChild(btn);
    });
    projectSection.appendChild(actions);
    scroll.appendChild(projectSection);

    /* Passage outline */
    var outlineSection = el('div', 'hc-sidebar-section');
    outlineSection.innerHTML = '<div class="hc-sidebar-section-title">Outline</div>';
    var verseNav = el('nav', 'hc-verse-nav');
    verseNav.id = 'hcVerseNav';
    verseNav.setAttribute('aria-label', 'Verse navigation');
    outlineSection.appendChild(verseNav);
    scroll.appendChild(outlineSection);

    /* Legend */
    var legendSection = el('div', 'hc-sidebar-section');
    legendSection.innerHTML = '<div class="hc-sidebar-section-title">Legend</div>';
    var legendBtn = el('button', 'hc-sidebar-action');
    legendBtn.type = 'button';
    legendBtn.innerHTML = '<span>Show Legend / Key</span>';
    legendBtn.addEventListener('click', function () {
      var leg = document.getElementById('legendBelowEditor');
      if (leg) {
        leg.classList.remove('collapsed');
        var head = document.getElementById('legendBelowHeader');
        if (head) head.textContent = '▼ Legend / Key';
        leg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    legendSection.appendChild(legendBtn);
    var legendEmpty = el('div', 'hc-empty-placeholder');
    legendEmpty.id = 'hcSidebarLegendHint';
    legendEmpty.textContent = 'No legend entries yet.';
    legendSection.appendChild(legendEmpty);
    scroll.appendChild(legendSection);

    /* Notes */
    var notesSection = el('div', 'hc-sidebar-section');
    notesSection.innerHTML = '<div class="hc-sidebar-section-title">Notes</div>';
    var notesList = el('div', 'hc-sidebar-notes');
    notesList.id = 'hcSidebarNotes';
    notesSection.appendChild(notesList);
    scroll.appendChild(notesSection);

    /* Attachments placeholder */
    var attachSection = el('div', 'hc-sidebar-section');
    attachSection.innerHTML = '<div class="hc-sidebar-section-title">Attachments</div>';
    var attachEmpty = el('div', 'hc-empty-placeholder');
    attachEmpty.textContent = 'No attachments.';
    attachSection.appendChild(attachEmpty);
    scroll.appendChild(attachSection);

    sidebar.appendChild(scroll);

    /* Footer with segmented toggle */
    var footer = el('div', 'hc-sidebar-footer');
    footer.appendChild(buildSegmentedControl('hcSidebarSegmented'));
    sidebar.appendChild(footer);

    sidebar._collapseBtn = collapseBtn;
    return sidebar;
  }

  /* ── Workspace ── */
  function buildWorkspace(wrap) {
    var workspace = el('main', 'hc-workspace');
    workspace.setAttribute('aria-label', 'Editor workspace');

    var header = el('div', 'hc-workspace-header');
    header.appendChild(buildSegmentedControl('hcMainSegmented'));

    var helpRow = $('.workspace-help-row');
    if (helpRow) {
      helpRow.classList.add('hc-moved');
      header.appendChild(helpRow);
    }

    workspace.appendChild(header);

    var content = el('div', 'hc-workspace-content');
    workspace.appendChild(content);

    return workspace;
  }

  /* ── Segmented View Toggle ── */
  function buildSegmentedControl(id) {
    var seg = el('div', 'hc-segmented');
    seg.id = id;
    seg.setAttribute('role', 'tablist');

    var contourBtn = el('button', 'hc-segmented-btn active');
    contourBtn.type = 'button';
    contourBtn.dataset.view = 'contour';
    contourBtn.setAttribute('role', 'tab');
    contourBtn.innerHTML = '<span class="hc-seg-label">Contour View</span>';

    var tableBtn = el('button', 'hc-segmented-btn');
    tableBtn.type = 'button';
    tableBtn.dataset.view = 'table';
    tableBtn.setAttribute('role', 'tab');
    tableBtn.innerHTML = '<span class="hc-seg-label">Table View</span>';

    seg.appendChild(contourBtn);
    seg.appendChild(tableBtn);
    return seg;
  }

  function setupSegmentedToggles() {
    var origContour = $('[data-tab="contour"]');
    var origTable = $('[data-tab="table"]');

    function syncFromOriginal() {
      var isContour = origContour && origContour.classList.contains('active');
      $all('.hc-segmented-btn').forEach(function (btn) {
        var match = (btn.dataset.view === 'contour') === isContour;
        btn.classList.toggle('active', match);
        btn.setAttribute('aria-selected', match ? 'true' : 'false');
      });
      document.body.classList.toggle('workspace-table-view', !isContour);
    }

    function switchTo(view) {
      var target = view === 'contour' ? origContour : origTable;
      if (target) target.click();
      syncFromOriginal();
    }

    $all('.hc-segmented').forEach(function (seg) {
      $all('.hc-segmented-btn', seg).forEach(function (btn) {
        btn.addEventListener('click', function () {
          switchTo(btn.dataset.view);
        });
      });
    });

    if (origContour) origContour.addEventListener('click', syncFromOriginal);
    if (origTable) origTable.addEventListener('click', syncFromOriginal);
    syncFromOriginal();
  }

  /* ── Right Panel ── */
  function buildRightPanel() {
    var panel = el('aside', 'hc-right-panel');
    panel.id = 'hcRightPanel';
    panel.setAttribute('aria-label', 'Inspector and comments');

    var tabs = el('div', 'hc-panel-tabs');
    tabs.setAttribute('role', 'tablist');

    var tabDefs = [
      { id: 'inspector', label: 'Inspector' },
      { id: 'comments', label: 'Comments' }
    ];

    var contents = el('div', 'hc-panel-contents');
    contents.style.flex = '1';
    contents.style.display = 'flex';
    contents.style.flexDirection = 'column';
    contents.style.minHeight = '0';
    contents.style.overflow = 'hidden';

    tabDefs.forEach(function (def, i) {
      var tab = el('button', 'hc-panel-tab' + (i === 0 ? ' active' : ''));
      tab.type = 'button';
      tab.dataset.panel = def.id;
      tab.setAttribute('role', 'tab');
      tab.textContent = def.label;
      tabs.appendChild(tab);

      var content = el('div', 'hc-panel-tab-content' + (i === 0 ? '' : ' hidden'));
      content.id = 'hcPanel' + def.id.charAt(0).toUpperCase() + def.id.slice(1);
      content.dataset.panel = def.id;
      contents.appendChild(content);
    });

    panel.appendChild(tabs);
    panel.appendChild(contents);
    return panel;
  }

  function setupRightPanelTabs(panel) {
    var tabs = $all('.hc-panel-tab', panel);
    var contents = $all('.hc-panel-tab-content', panel);

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.panel;
        tabs.forEach(function (t) {
          t.classList.toggle('active', t.dataset.panel === target);
        });
        contents.forEach(function (c) {
          c.classList.toggle('hidden', c.dataset.panel !== target);
        });
      });
    });
  }

  function setupInspectorDock(panel) {
    var dock = $('#hcPanelInspector');
    if (!dock) return;

    var placeholder = el('div', 'hc-inspector-placeholder');
    placeholder.id = 'hcInspectorPlaceholder';
    placeholder.textContent = 'Select a word to inspect its lemma, root, parsing, and notes.';
    dock.appendChild(placeholder);

    var inspectorWrap = el('div', 'hc-inspector-dock');
    inspectorWrap.id = 'hcInspectorDock';
    dock.appendChild(inspectorWrap);

    /* Observe wordInspector creation */
    function dockInspector() {
      var wi = document.getElementById('wordInspector');
      if (!wi || wi.dataset.hcDocked) return;
      wi.dataset.hcDocked = '1';
      wi.classList.add('hc-docked');
      inspectorWrap.appendChild(wi);
      placeholder.style.display = 'none';

      /* Override show/hide to work in docked mode */
      var origShow = wi.style.display;
      var observer = new MutationObserver(function () {
        if (wi.style.display !== 'none' && wi.textContent.trim()) {
          placeholder.style.display = 'none';
        }
      });
      observer.observe(wi, { attributes: true, childList: true, subtree: true, attributeFilter: ['style'] });
    }

    dockInspector();
    setTimeout(dockInspector, 1000);
    setTimeout(dockInspector, 3000);
    var obs = new MutationObserver(dockInspector);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function setupCommentsDock(panel) {
    var dock = $('#hcPanelComments');
    if (!dock) return;

    var wrap = el('div', 'hc-comments-dock');
    dock.appendChild(wrap);

    function moveComments() {
      var cp = document.getElementById('commentsPanel');
      if (cp && cp.parentNode !== wrap) {
        wrap.appendChild(cp);
        cp.style.display = '';
      }
    }

    moveComments();
    setInterval(moveComments, 1000);

    /* Re-render when show comments clicked */
    var showBtn = document.getElementById('showCommentsPanel');
    if (showBtn) {
      showBtn.addEventListener('click', function () {
        setTimeout(moveComments, 100);
        var tab = $('.hc-panel-tab[data-panel="comments"]');
        if (tab) tab.click();
      });
    }
  }

  function setupSidebarCollapse(sidebar, appBody) {
    var btn = sidebar._collapseBtn;
    if (!btn) return;
    btn.addEventListener('click', function () {
      appBody.classList.toggle('hc-sidebar-collapsed');
      btn.textContent = appBody.classList.contains('hc-sidebar-collapsed') ? '›' : '‹';
    });
  }

  function syncPanelVisibility() {
    var appBody = $('.hc-app-body');
  var inspectorBtn = document.getElementById('inspectorToggleBtn');
    if (!appBody) return;

    function update() {
      var hidden = document.body.classList.contains('hc-panel-hidden');
      appBody.classList.toggle('hc-panel-hidden', hidden);
    }

    if (inspectorBtn) {
      inspectorBtn.addEventListener('click', function () {
        setTimeout(update, 50);
      });
    }

    /* Add inspector panel toggle behavior — hide right panel */
    var origInspectorClick = inspectorBtn && inspectorBtn.onclick;
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'inspectorToggleBtn') {
        setTimeout(update, 80);
      }
    });

    update();
  }

  /* ── Verse Navigation ── */
  function setupVerseNavigation(sidebar) {
    var nav = $('#hcVerseNav');
    if (!nav) return;

    function rebuild() {
      nav.innerHTML = '';
      var verses = [];
      try {
        if (window.state && Array.isArray(window.state.verses)) {
          verses = window.state.verses;
        }
      } catch (e) { /* ignore */ }

      if (!verses.length) {
        nav.innerHTML = '<div class="hc-empty-state" style="padding:12px"><span style="font-size:12px;color:var(--hc-text-muted)">No verses loaded</span></div>';
        return;
      }

      verses.forEach(function (v, i) {
        var btn = el('button', 'hc-verse-nav-item');
        btn.type = 'button';
        btn.textContent = v.ref || 'Verse ' + (i + 1);
        btn.dataset.verseIndex = i;
        btn.addEventListener('click', function () {
          scrollToVerse(i);
          $all('.hc-verse-nav-item', nav).forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        nav.appendChild(btn);
      });
    }

    rebuild();
    window._hcRebuildVerseNav = rebuild;
  }

  function scrollToVerse(vi) {
    var editor = document.getElementById('editor');
    if (!editor) return;
    var refs = editor.querySelectorAll('.muted');
    var target = null;
    refs.forEach(function (ref, idx) {
      if (idx === vi) target = ref;
    });
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function hookRenderForSidebarNotes() {
    function rebuildNotes() {
      var box = $('#hcSidebarNotes');
      if (!box) return;
      var items = [];
      try {
        if (window.state && Array.isArray(window.state.verses)) {
          window.state.verses.forEach(function (v, vi) {
            v.clauses.forEach(function (c, ci) {
              c.words.forEach(function (w, wi) {
                if (w.note && String(w.note).trim()) {
                  items.push({ ref: v.ref, text: w.text, note: w.note, vi: vi, ci: ci, wi: wi });
                }
              });
            });
          });
        }
      } catch (e) { /* ignore */ }

      if (!items.length) {
        box.innerHTML = '<div class="hc-empty-placeholder">No notes yet.</div>';
        return;
      }

      box.innerHTML = '';
      items.forEach(function (item) {
        var btn = el('button', 'hc-sidebar-action');
        btn.type = 'button';
        btn.innerHTML = '<span><strong>' + item.text + '</strong> — ' + item.note.slice(0, 48) + (item.note.length > 48 ? '…' : '') + '</span>';
        btn.addEventListener('click', function () {
          if (typeof window.setWorkspaceTab === 'function') window.setWorkspaceTab('contour');
          try {
            window.state.selected = { v: item.vi, c: item.ci, w: item.wi };
            if (typeof window.render === 'function') window.render();
          } catch (e) { /* ignore */ }
        });
        box.appendChild(btn);
      });
    }

    rebuildNotes();
    window._hcRebuildSidebarNotes = rebuildNotes;

    if (typeof window.render !== 'function') {
      setTimeout(hookRenderForSidebarNotes, 500);
      return;
    }
    var origRender = window.render;
    if (!origRender._hcNotesHooked) {
      window.render = function () {
        var result = origRender.apply(this, arguments);
        if (typeof window._hcRebuildSidebarNotes === 'function') window._hcRebuildSidebarNotes();
        return result;
      };
      window.render._hcNotesHooked = true;
    }
  }

  function hookRenderForVerseNav() {
    if (typeof window.render !== 'function') {
      setTimeout(hookRenderForVerseNav, 500);
      return;
    }
    var origRender = window.render;
    window.render = function () {
      var result = origRender.apply(this, arguments);
      if (typeof window._hcRebuildVerseNav === 'function') {
        window._hcRebuildVerseNav();
      }
      updateRefDisplay();
      return result;
    };
  }

  function updateRefDisplay() {
    var refEl = $('#hcRefDisplay');
    if (!refEl) return;
    try {
      if (window.state && window.state.ref) {
        refEl.textContent = 'Ref: ' + window.state.ref;
      } else if (window.state && window.state.verses && window.state.verses[0]) {
        refEl.textContent = 'Ref: ' + window.state.verses[0].ref;
      }
    } catch (e) { /* ignore */ }
  }

  function syncProjectName() {
    function sync() {
      var cur = $('#currentProjectName');
      var top = $('#hcTopNavProjectName');
      var side = $('#hcSidebarProjectName');
      var name = cur ? cur.textContent : 'Untitled Project';
      if (top) top.textContent = name;
      if (side) side.textContent = name;

      var saveOrig = $('#saveStatus');
      var saveSide = $('#hcSidebarSaveStatus');
      if (saveOrig && saveSide) saveSide.textContent = saveOrig.textContent || 'All changes saved';
    }
    sync();
    setInterval(sync, 2000);
  }

  /* ── Status Bar ── */
  function buildStatusBar() {
    var bar = el('div', 'hc-status-bar');
    bar.setAttribute('role', 'status');

    var wordCount = el('span', 'hc-status-item');
    wordCount.id = 'hcStatusWords';
    wordCount.textContent = 'Words: —';

    var charCount = el('span', 'hc-status-item');
    charCount.id = 'hcStatusChars';
    charCount.textContent = 'Chars: —';

    var rowCount = el('span', 'hc-status-item');
    rowCount.id = 'hcStatusRows';
    rowCount.textContent = '';

    var spacer = el('span', 'hc-status-spacer');

    var autosave = el('span', 'hc-status-item');
    autosave.id = 'hcStatusAutosave';
    autosave.textContent = 'Autosaved';

    bar.appendChild(wordCount);
    bar.appendChild(charCount);
    bar.appendChild(rowCount);
    bar.appendChild(spacer);
    bar.appendChild(autosave);

    function updateCounts() {
      try {
        if (!window.state || !window.state.verses) return;
        var words = 0, chars = 0, rows = 0;
        window.state.verses.forEach(function (v) {
          v.clauses.forEach(function (c) {
            rows++;
            c.words.forEach(function (w) {
              if (!w.deleted) {
                words++;
                chars += (w.text || '').length;
              }
            });
          });
        });
        wordCount.textContent = 'Words: ' + words;
        charCount.textContent = 'Chars: ' + chars;
        rowCount.textContent = rows ? 'Rows: ' + rows : '';
      } catch (e) { /* ignore */ }
    }

    setInterval(updateCounts, 3000);
    setTimeout(updateCounts, 1500);

    return bar;
  }

  /* ── Boot ── */
  function boot() {
    var attempts = 0;
    function tryInit() {
      attempts++;
      var appRoot = document.getElementById('appRoot');
      if (!appRoot || appRoot.classList.contains('hidden')) {
        if (attempts < 40) setTimeout(tryInit, 200);
        return;
      }
      init();
    }
    tryInit();
    setTimeout(init, 500);
    setTimeout(init, 1500);
    setTimeout(init, 3000);
  }

  window.contourOnUnlock = (function (orig) {
    return function () {
      if (typeof orig === 'function') orig();
      setTimeout(init, 100);
      setTimeout(init, 500);
    };
  })(window.contourOnUnlock);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
