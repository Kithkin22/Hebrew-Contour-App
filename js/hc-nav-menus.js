/**
 * HCDS v1.0 — Top navigation menus
 * Anchors existing Generate / Paste / File panels to nav buttons.
 * Export flyout calls existing handleProjectFileAction handlers.
 */
(function () {
  'use strict';

  var anchors = {};
  var exportMenuEl = null;
  var activeNav = null;

  var EXPORT_ITEMS = [
    { action: 'export-contour-pdf', label: 'Contour PDF' },
    { action: 'export-contour-word', label: 'Contour DOCX' },
    { action: 'export-table-pdf', label: 'Table PDF' },
    { action: 'export-table-word', label: 'Table DOCX' },
    { action: 'export-contour-html', label: 'HTML' },
    { action: 'export-project-json', label: 'Project JSON' }
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function setNavActive(key) {
    activeNav = key;
    document.querySelectorAll('.hc-nav-menu-btn').forEach(function (btn) {
      var on = btn.dataset.hcMenu === key;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  function clearNavActive() {
    activeNav = null;
    document.querySelectorAll('.hc-nav-menu-btn').forEach(function (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function positionCard(card, anchorKey) {
    if (!card) return;
    var btn = anchors[anchorKey];
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var left = Math.max(8, rect.left);
    var top = rect.bottom + 4;
    var maxW = Math.min(
      anchorKey === 'file' ? 280 : anchorKey === 'paste' ? 560 : 720,
      window.innerWidth - left - 12
    );
    card.style.position = 'fixed';
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.transform = 'none';
    card.style.right = 'auto';
    card.style.width = maxW + 'px';
    card.style.maxWidth = 'calc(100vw - 16px)';
    card.style.zIndex = '5001';
  }

  function closeExportMenu() {
    if (!exportMenuEl) return;
    exportMenuEl.classList.add('hidden');
    exportMenuEl.setAttribute('aria-hidden', 'true');
    if (activeNav === 'export') clearNavActive();
  }

  function openExportMenu() {
    if (typeof window.closeTopMenus === 'function') window.closeTopMenus();
    if (typeof window.closeProjectFileMenu === 'function') window.closeProjectFileMenu();
    if (!exportMenuEl) buildExportMenu();
    var btn = anchors.export;
    if (!btn || !exportMenuEl) return;
    var rect = btn.getBoundingClientRect();
    exportMenuEl.style.left = Math.max(8, rect.left) + 'px';
    exportMenuEl.style.top = (rect.bottom + 4) + 'px';
    exportMenuEl.classList.remove('hidden');
    exportMenuEl.setAttribute('aria-hidden', 'false');
    setNavActive('export');
    document.body.classList.add('top-menu-open');
    var backdrop = document.getElementById('topMenuBackdrop');
    if (backdrop) {
      backdrop.classList.add('show');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function buildExportMenu() {
    exportMenuEl = document.createElement('div');
    exportMenuEl.id = 'hcExportMenuDropdown';
    exportMenuEl.className = 'hc-flyout-menu hidden';
    exportMenuEl.setAttribute('role', 'menu');
    exportMenuEl.setAttribute('aria-label', 'Export');
    var list = document.createElement('ul');
    list.className = 'hc-flyout-menu-list';
    EXPORT_ITEMS.forEach(function (item) {
      var li = document.createElement('li');
      li.setAttribute('role', 'none');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hc-flyout-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.dataset.action = item.action;
      btn.textContent = item.label;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeExportMenu();
        document.body.classList.remove('top-menu-open');
        var backdrop = document.getElementById('topMenuBackdrop');
        if (backdrop) {
          backdrop.classList.remove('show');
          backdrop.setAttribute('aria-hidden', 'true');
        }
        if (typeof window.handleProjectFileAction === 'function') {
          window.handleProjectFileAction(item.action);
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    exportMenuEl.appendChild(list);
    document.body.appendChild(exportMenuEl);
  }

  function captureMenuOrigins() {
    if (!window._hcNavMenuOrig) window._hcNavMenuOrig = {};
    var o = window._hcNavMenuOrig;
    if (typeof window.openProjectFileMenu === 'function' && !window.openProjectFileMenu._hcNavWrapped) {
      o.openProjectFileMenu = window.openProjectFileMenu;
    }
    if (typeof window.closeProjectFileMenu === 'function' && !window.closeProjectFileMenu._hcNavWrapped) {
      o.closeProjectFileMenu = window.closeProjectFileMenu;
    }
    if (typeof window.openTopMenu === 'function' && !window.openTopMenu._hcNavWrapped) {
      o.openTopMenu = window.openTopMenu;
    }
    if (typeof window.closeTopMenus === 'function' && !window.closeTopMenus._hcNavWrapped) {
      o.closeTopMenus = window.closeTopMenus;
    }
  }

  function patchMenuOpeners() {
    captureMenuOrigins();
    var o = window._hcNavMenuOrig || {};

    if (typeof o.openProjectFileMenu === 'function') {
      var openFile = function () {
        if (typeof window.closeTopMenus === 'function') window.closeTopMenus();
        closeExportMenu();
        o.openProjectFileMenu();
        setNavActive('file');
        requestAnimationFrame(function () {
          positionCard(document.getElementById('projectFileMenuCard'), 'file');
        });
      };
      openFile._hcNavWrapped = true;
      openFile._hcNavBase = o.openProjectFileMenu;
      window.openProjectFileMenu = openFile;
    }

    if (typeof o.closeProjectFileMenu === 'function') {
      var closeFile = function () {
        o.closeProjectFileMenu();
        if (activeNav === 'file') clearNavActive();
      };
      closeFile._hcNavWrapped = true;
      closeFile._hcNavBase = o.closeProjectFileMenu;
      window.closeProjectFileMenu = closeFile;
    }

    if (typeof o.openTopMenu === 'function') {
      var openTop = function (name) {
        closeExportMenu();
        o.openTopMenu(name);
        setNavActive(name);
        requestAnimationFrame(function () {
          var card = document.querySelector('.top-stack .card.compact-card[data-menu="' + name + '"]');
          positionCard(card, name);
        });
      };
      openTop._hcNavWrapped = true;
      openTop._hcNavBase = o.openTopMenu;
      window.openTopMenu = openTop;
    }

    if (typeof o.closeTopMenus === 'function') {
      var closeTop = function () {
        o.closeTopMenus();
        closeExportMenu();
        clearNavActive();
      };
      closeTop._hcNavWrapped = true;
      closeTop._hcNavBase = o.closeTopMenus;
      window.closeTopMenus = closeTop;
    }
  }

  window.reapplyHcNavMenuPatches = function () {
    captureMenuOrigins();
    patchMenuOpeners();
  };

  function bindNavButtons() {
    document.querySelectorAll('.hc-nav-menu-btn').forEach(function (btn) {
      var key = btn.dataset.hcMenu;
      anchors[key] = btn;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (key === 'file') {
          if (activeNav === 'file' && typeof window.closeProjectFileMenu === 'function') {
            window.closeProjectFileMenu();
          } else if (typeof window.openProjectFileMenu === 'function') {
            window.openProjectFileMenu();
          }
        } else if (key === 'generate' || key === 'paste') {
          if (activeNav === key && typeof window.closeTopMenus === 'function') {
            window.closeTopMenus();
          } else if (typeof window.openTopMenu === 'function') {
            window.openTopMenu(key);
          }
        } else if (key === 'export') {
          if (activeNav === 'export') closeExportMenu();
          else openExportMenu();
        }
      });
    });

    window.addEventListener('resize', function () {
      if (activeNav === 'file') {
        positionCard(document.getElementById('projectFileMenuCard'), 'file');
      } else if (activeNav === 'generate' || activeNav === 'paste') {
        positionCard(document.querySelector('.top-stack .card[data-menu="' + activeNav + '"]'), activeNav);
      } else if (activeNav === 'export' && exportMenuEl && anchors.export) {
        var rect = anchors.export.getBoundingClientRect();
        exportMenuEl.style.left = Math.max(8, rect.left) + 'px';
        exportMenuEl.style.top = (rect.bottom + 4) + 'px';
      }
    });

    document.addEventListener('click', function (e) {
      if (exportMenuEl && !exportMenuEl.classList.contains('hidden')) {
        if (!exportMenuEl.contains(e.target) && !(anchors.export && anchors.export.contains(e.target))) {
          closeExportMenu();
          document.body.classList.remove('top-menu-open');
          var backdrop = document.getElementById('topMenuBackdrop');
          if (backdrop) {
            backdrop.classList.remove('show');
            backdrop.setAttribute('aria-hidden', 'true');
          }
        }
      }
    });
  }

  window.setupHcNavMenus = function (navButtons) {
    if (navButtons) {
      Object.keys(navButtons).forEach(function (k) {
        anchors[k] = navButtons[k];
      });
    }
    patchMenuOpeners();
    bindNavButtons();
    buildExportMenu();
  };

  window.openHcExportMenu = openExportMenu;
})();
