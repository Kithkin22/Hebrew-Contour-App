(function () {
  var PASS = 'AMBS';
  var KEY = 'hebrewContourAccessGranted';

  function norm(value) {
    return String(value || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  function matches(value) {
    return norm(value).toUpperCase() === PASS;
  }

  function unlock() {
    try {
      sessionStorage.setItem(KEY, 'true');
    } catch (e) {}

    var gate = document.getElementById('passwordGate');
    var app = document.getElementById('appRoot');
    if (gate) {
      gate.classList.add('hidden');
      gate.style.display = 'none';
      gate.setAttribute('aria-hidden', 'true');
    }
    if (app) {
      app.classList.remove('hidden');
      app.style.display = 'flex';
      app.style.flexDirection = 'column';
      app.setAttribute('aria-hidden', 'false');
    }

    if (typeof window.contourOnUnlock === 'function') {
      window.contourOnUnlock();
    } else {
      window.__contourPendingUnlock = true;
    }
  }

  function init() {
    try {
      if (sessionStorage.getItem(KEY) === 'true') {
        unlock();
        return;
      }
    } catch (e) {}

    var app = document.getElementById('appRoot');
    if (app) {
      app.classList.add('hidden');
      app.style.display = 'none';
    }

    var form = document.getElementById('passwordGateForm');
    var input = document.getElementById('appPasswordInput');
    var error = document.getElementById('passwordGateError');
    if (!input) return;

    function tryUnlock(e) {
      if (e) e.preventDefault();
      if (matches(input.value)) {
        if (error) error.classList.add('hidden');
        unlock();
      } else if (error) {
        error.textContent = 'Incorrect password.';
        error.classList.remove('hidden');
        input.focus();
        input.select();
      }
      return false;
    }

    if (form) form.addEventListener('submit', tryUnlock);
    var btn = document.getElementById('appPasswordSubmit');
    if (btn) btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryUnlock(e);
    });
    input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
