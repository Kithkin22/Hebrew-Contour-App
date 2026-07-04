/* Project header — visible name, confirmed rename, save indicator, Cmd/Ctrl+S */
(function () {
  let saveIndicator = { mode: 'idle', at: null };
  let saveIndicatorTimer = null;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatSaveRelative(ts) {
    if (!ts) return '';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 12) return 'just now';
    if (diffSec < 60) return diffSec + ' seconds ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + ' minute' + (diffMin === 1 ? '' : 's') + ' ago';
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function saveIndicatorText() {
    const { mode, at } = saveIndicator;
    if (mode === 'saving') return 'Saving…';
    if (mode === 'manual-saved') return 'Saved ' + formatSaveRelative(at);
    if (mode === 'autosaved') return 'Autosaved ' + formatSaveRelative(at);
    if (mode === 'saved' && at) return 'Last saved ' + formatSaveRelative(at);
    return 'Not saved yet';
  }

  function refreshSaveIndicatorUI() {
    const text = saveIndicatorText();
    const el = document.getElementById('headerSaveStatus');
    if (el) {
      el.textContent = text;
      el.dataset.mode = saveIndicator.mode;
    }
    document.querySelectorAll('[data-save-indicator]').forEach(node => {
      node.textContent = text;
    });
    const shellName = document.querySelector('.hc-top-nav-project-name[data-project-header]');
    if (shellName && typeof getCurrentProjectRecord === 'function') {
      const rec = getCurrentProjectRecord();
      if (rec) shellName.textContent = rec.name || 'Untitled Project';
    }
  }

  function scheduleSaveIndicatorRefresh() {
    if (saveIndicatorTimer) clearInterval(saveIndicatorTimer);
    saveIndicatorTimer = setInterval(() => {
      if (saveIndicator.mode === 'saving') return;
      if (saveIndicator.at) refreshSaveIndicatorUI();
    }, 15000);
  }

  window.setSaveIndicator = function (mode, opts) {
    opts = opts || {};
    saveIndicator.mode = mode || 'idle';
    if (opts.at != null) saveIndicator.at = opts.at;
    else if (mode === 'manual-saved' || mode === 'autosaved' || mode === 'saved') {
      saveIndicator.at = Date.now();
    }
    refreshSaveIndicatorUI();
    scheduleSaveIndicatorRefresh();
  };

  window.updateProjectHeaderName = function () {
    const rec = typeof getCurrentProjectRecord === 'function' ? getCurrentProjectRecord() : null;
    const name = rec ? (rec.name || 'Untitled Project') : 'Untitled Project';
    const nameEl = document.getElementById('headerProjectName');
    if (nameEl) nameEl.textContent = name;
    const shell = document.querySelector('.hc-top-nav-project-name[data-project-header]');
    if (shell) shell.textContent = name;
    const fileMenu = document.getElementById('currentProjectName');
    if (fileMenu) fileMenu.textContent = name;
  };

  function applyProjectRename(newName) {
    const cur = typeof getCurrentProjectRecord === 'function' ? getCurrentProjectRecord() : null;
    if (!cur) return false;
    const n = String(newName || '').trim();
    if (!n) return false;
    cur.name = n;
    if (typeof writeProjectStore === 'function') writeProjectStore();
    updateProjectHeaderName();
    if (typeof renderProjectFileSubmenus === 'function') renderProjectFileSubmenus();
    if (typeof updateSaveStatus === 'function') {
      updateSaveStatus('Renamed to: ' + n);
    }
    return true;
  }

  function showRenameConfirmModal(oldName, newName, onConfirm) {
    const modal = document.getElementById('renameProjectModal');
    const text = document.getElementById('renameProjectConfirmText');
    if (!modal || !text) {
      if (confirm('Change project name from "' + oldName + '" to "' + newName + '"?')) onConfirm();
      return;
    }
    text.textContent =
      'Are you sure you want to change the project name from "' +
      oldName +
      '" to "' +
      newName +
      '"?';
    const shut = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    };
    const confirmBtn = document.getElementById('renameProjectConfirm');
    const cancelBtn = document.getElementById('renameProjectCancel');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        shut();
        onConfirm();
      };
    }
    if (cancelBtn) cancelBtn.onclick = shut;
    modal.onclick = e => {
      if (e.target === modal) shut();
    };
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    if (confirmBtn) confirmBtn.focus();
  }

  window.requestProjectRename = function () {
    const cur = typeof getCurrentProjectRecord === 'function' ? getCurrentProjectRecord() : null;
    if (!cur) return;
    const oldName = cur.name || 'Untitled Project';
    if (typeof promptModal !== 'function') return;
    promptModal('Rename project', 'Project name:', oldName, draft => {
      const newName = String(draft || '').trim();
      if (!newName || newName === oldName) return;
      showRenameConfirmModal(oldName, newName, () => applyProjectRename(newName));
    });
  };

  function mountProjectHeader() {
    if (document.getElementById('projectHeaderBlock')) return;

    const topStack = document.querySelector('.top-stack');
    const shellCenter = document.querySelector('.hc-top-nav-center');
    const actions = document.getElementById('appToolbarActions');

    const block = document.createElement('div');
    block.id = 'projectHeaderBlock';
    block.className = 'project-header-block';
    block.innerHTML =
      '<div class="project-header-title-row">' +
      '<span id="headerProjectName" class="header-project-name" title="Current project">Untitled Project</span>' +
      '<button type="button" class="btn project-rename-btn" id="headerProjectRenameBtn" title="Rename project" aria-label="Rename project">Rename</button>' +
      '</div>' +
      '<div id="headerSaveStatus" class="header-save-status" aria-live="polite" data-save-indicator></div>';

    if (topStack && actions) {
      topStack.insertBefore(block, actions);
    } else if (shellCenter) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'hc-top-nav-project-name';
      nameSpan.dataset.projectHeader = '1';
      nameSpan.id = 'headerProjectName';
      shellCenter.appendChild(nameSpan);
      const status = document.createElement('div');
      status.id = 'headerSaveStatus';
      status.className = 'header-save-status hc-shell-save-status';
      status.setAttribute('aria-live', 'polite');
      status.dataset.saveIndicator = '1';
      shellCenter.appendChild(status);
    } else {
      return;
    }

    const renameBtn = document.getElementById('headerProjectRenameBtn');
    if (renameBtn) renameBtn.onclick = () => requestProjectRename();

    const nameEl = document.getElementById('headerProjectName');
    if (nameEl) {
      nameEl.addEventListener('dblclick', e => {
        e.preventDefault();
        requestProjectRename();
      });
    }
  }

  window.initProjectHeader = function () {
    mountProjectHeader();
    updateProjectHeaderName();
    const rec = typeof getCurrentProjectRecord === 'function' ? getCurrentProjectRecord() : null;
    if (rec && rec.updatedAt) {
      setSaveIndicator('saved', { at: new Date(rec.updatedAt).getTime() });
    } else {
      refreshSaveIndicatorUI();
    }
    scheduleSaveIndicatorRefresh();
  };

  function boot() {
    if (typeof getCurrentProjectRecord === 'function') initProjectHeader();
    else setTimeout(boot, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
