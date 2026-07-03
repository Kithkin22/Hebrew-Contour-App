/**
 * Aleph Contour — desktop menu bar (Edit, Insert, View, Help)
 * Proxies to existing handlers; no workflow changes.
 */
(function () {
  'use strict';

  var openFlyout = null;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function closeFlyouts() {
    document.querySelectorAll('.hc-aleph-flyout').forEach(function (f) {
      f.classList.add('hidden');
    });
    document.querySelectorAll('.hc-aleph-menu-btn').forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-expanded', 'false');
    });
    openFlyout = null;
  }

  function positionFlyout(flyout, anchor) {
    var r = anchor.getBoundingClientRect();
    flyout.style.left = Math.max(8, r.left) + 'px';
    flyout.style.top = (r.bottom + 4) + 'px';
  }

  function makeFlyout(id, items, anchor) {
    var existing = document.getElementById(id);
    if (existing) existing.remove();

    var flyout = el('div', 'hc-aleph-flyout hidden');
    flyout.id = id;
    flyout.setAttribute('role', 'menu');

    items.forEach(function (item) {
      if (item === 'sep') {
        flyout.appendChild(el('div', 'hc-aleph-flyout-sep'));
        return;
      }
      var btn = el('button', 'hc-aleph-flyout-item');
      btn.type = 'button';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      if (item.shortcut) {
        var kbd = document.createElement('span');
        kbd.className = 'hc-aleph-flyout-kbd';
        kbd.textContent = item.shortcut;
        btn.appendChild(kbd);
      }
      if (item.disabled) btn.disabled = true;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeFlyouts();
        if (item.action) item.action();
      });
      flyout.appendChild(btn);
    });

    document.body.appendChild(flyout);
    positionFlyout(flyout, anchor);
    flyout.classList.remove('hidden');
    openFlyout = flyout;
    anchor.classList.add('active');
    anchor.setAttribute('aria-expanded', 'true');
    return flyout;
  }

  function toggleFlyout(id, items, anchor) {
    if (openFlyout && openFlyout.id === id) {
      closeFlyouts();
      return;
    }
    closeFlyouts();
    if (typeof window.closeTopMenus === 'function') window.closeTopMenus();
    if (typeof window.closeProjectFileMenu === 'function') window.closeProjectFileMenu();
    makeFlyout(id, items, anchor);
  }

  function clickTab(name) {
    var btn = document.querySelector('.tabs button[data-tab="' + name + '"]');
    if (btn) btn.click();
  }

  window.setupAlephMenus = function (container) {
    if (!container || container.dataset.alephMenusBound) return;
    container.dataset.alephMenusBound = '1';

    var menus = [
      { key: 'edit', label: 'Edit', items: [
        { label: 'Undo', shortcut: '⌘Z', action: function () {
          if (typeof window.undoLastChange === 'function') window.undoLastChange();
        }}
      ]},
      { key: 'insert', label: 'Insert', items: [
        { label: 'Generate Passage…', action: function () {
          if (typeof window.openTopMenu === 'function') window.openTopMenu('generate');
        }},
        { label: 'Paste Text…', action: function () {
          if (typeof window.openTopMenu === 'function') window.openTopMenu('paste');
        }},
        'sep',
        { label: 'Load Sample', action: function () {
          var btn = document.getElementById('sampleText');
          if (btn) btn.click();
        }}
      ]},
      { key: 'view', label: 'View', items: [
        { label: 'Contour View', action: function () { clickTab('contour'); }},
        { label: 'Table View', action: function () { clickTab('table'); }},
        'sep',
        { label: 'Toggle Inspector', action: function () {
          var btn = document.getElementById('inspectorToggleBtn');
          if (btn) btn.click();
        }},
        { label: 'Toggle Dark Mode', action: function () {
          var btn = document.getElementById('themeToggleBtn');
          if (btn) btn.click();
        }}
      ]},
      { key: 'help', label: 'Help', items: [
        { label: 'Keyboard Shortcuts…', action: function () {
          var btn = document.getElementById('helpBtn');
          if (btn) btn.click();
        }},
        { label: 'Send Feedback…', action: function () {
          var btn = document.getElementById('feedbackBtn');
          if (btn) btn.click();
        }}
      ]}
    ];

    menus.forEach(function (m) {
      var btn = el('button', 'hc-aleph-menu-btn');
      btn.type = 'button';
      btn.textContent = m.label;
      btn.dataset.alephMenu = m.key;
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFlyout('hcAlephFlyout' + m.key, m.items, btn);
      });
      container.appendChild(btn);
    });

    document.addEventListener('click', function (e) {
      if (!openFlyout) return;
      if (openFlyout.contains(e.target)) return;
      if (e.target.closest('.hc-aleph-menu-btn')) return;
      closeFlyouts();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeFlyouts();
    });
  };
})();
