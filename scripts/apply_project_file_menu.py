#!/usr/bin/env python3
"""Replace Project panel with Word/macOS-style File dropdown menu."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SNIPPET = Path(__file__).resolve().parent / "project_manager.js.snippet"

PROJECT_HTML_OLD = """  <div class="card compact-card" data-menu="project">
    <strong class="save-tools-title menu-trigger">Project</strong>
    <div class="top-menu-panel">
    <p id="currentProjectLabel" class="project-current-label">Current: <span id="currentProjectName">Untitled Project</span></p>
    <div class="project-recent-row">
      <label class="muted" for="recentProjectsSelect">Open recent</label>
      <select id="recentProjectsSelect" aria-label="Open recent project">
        <option value="">— select a saved project —</option>
      </select>
      <button class="btn primary" id="openRecentProjectBtn" type="button">Open</button>
    </div>
    <div class="row project-actions-row">
      <button class="btn good" id="newProjectBtn">New Project</button>
      <button class="btn good" id="saveLocalBtn">Save Project</button>
      <button class="btn" id="renameProjectBtn">Rename</button>
      <button class="btn" id="duplicateProjectBtn">Duplicate</button>
      <button class="btn good" id="downloadProjectBtn">Export JSON</button>
      <button class="btn" id="importProjectBtn">Import JSON</button>
      <input type="file" id="projectFileInput" accept="application/json,.json" class="hidden">
      <button class="btn danger" id="deleteProjectBtn">Delete Project</button>
      <button class="btn danger" id="clearTableBtn">Clear Table</button>
    </div>
    <p id="saveStatus" class="muted small">Each passage is its own project. Work autosaves; use Open recent to switch between them.</p>
    </div>
  </div>"""

PROJECT_HTML_NEW = """  <div class="card compact-card file-menu-card" data-menu="project" id="projectFileMenuCard">
    <strong class="save-tools-title menu-trigger" id="projectMenuTrigger">File</strong>
    <div class="file-menu-dropdown" id="projectFileMenuDropdown" role="menu" aria-hidden="true">
      <div class="file-menu-current">Current: <span id="currentProjectName">Untitled Project</span></div>
      <ul class="file-menu-list" role="none">
        <li role="none"><button type="button" class="file-menu-item" data-action="new-project" role="menuitem">New Project</button></li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Open Recent <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" id="recentProjectsSubmenu" role="menu"></ul>
        </li>
        <li role="none"><button type="button" class="file-menu-item" data-action="save-project" role="menuitem">Save Project</button></li>
        <li role="none"><button type="button" class="file-menu-item" data-action="save-as" role="menuitem">Save As…</button></li>
        <li role="none" class="file-menu-separator" aria-hidden="true"></li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Export <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" role="menu">
            <li role="none"><button type="button" class="file-menu-item" data-action="export-contour-pdf" role="menuitem">Contour as PDF</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="export-contour-word" role="menuitem">Contour as Word</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="export-contour-html" role="menuitem">Contour as HTML</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="export-table-pdf" role="menuitem">Table as PDF</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="export-table-word" role="menuitem">Table as Word</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="export-project-json" role="menuitem">Project as JSON</button></li>
          </ul>
        </li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Import <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" role="menu">
            <li role="none"><button type="button" class="file-menu-item" data-action="import-text" role="menuitem">Import Text</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="import-project" role="menuitem">Import Project File</button></li>
          </ul>
        </li>
        <li role="none" class="file-menu-separator" aria-hidden="true"></li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Project Settings <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" role="menu">
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-rename" role="menuitem">Rename Project</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-duplicate" role="menuitem">Duplicate Project</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-clear" role="menuitem">Clear Table</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-delete" role="menuitem">Delete Project</button></li>
          </ul>
        </li>
      </ul>
      <p id="saveStatus" class="file-menu-status muted small"></p>
    </div>
    <input type="file" id="projectFileInput" accept="application/json,.json" class="hidden">
  </div>"""

OLD_PROJECT_CSS = """.project-current-label{margin:6px 0 10px;font-size:14px;color:var(--ui-muted,#64748b);}
.project-current-label #currentProjectName{color:var(--ui-text,#1f2d3d);font-weight:700;}
.project-recent-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;}
.project-recent-row label{font-size:13px;font-weight:700;white-space:nowrap;}
.project-recent-row select{flex:1 1 220px;min-width:180px;max-width:100%;font:inherit;padding:8px 10px;border:1px solid var(--ui-line,#d8e1ea);border-radius:8px;background:var(--ui-surface,#fff);color:var(--ui-text,#1f2d3d);}
.project-actions-row{flex-wrap:wrap;}
.top-stack .card.compact-card[data-menu="project"].menu-open::before{min-height:320px;}
body.dark-mode .project-current-label #currentProjectName{color:#e8eef5;}
body.dark-mode .project-recent-row select{background:#17212b;border-color:#314253;color:#e8eef5;}
"""

FILE_MENU_CSS = """
.file-menu-card{position:relative!important;overflow:visible!important;}
.file-menu-card.menu-open{z-index:4001!important;}
.file-menu-card > .file-menu-dropdown{display:none;}
.file-menu-card.menu-open > .file-menu-dropdown{display:block;}
.file-menu-dropdown{
  position:absolute;top:calc(100% + 4px);left:0;min-width:248px;max-width:min(320px,92vw);
  background:var(--ui-surface,#fff);border:1px solid var(--ui-line,#d8e1ea);border-radius:10px;
  box-shadow:0 12px 32px rgba(15,39,64,.16);padding:6px 0;z-index:4002;
}
.file-menu-current{padding:8px 14px 6px;font-size:12px;color:var(--ui-muted,#64748b);border-bottom:1px solid var(--ui-line,#d8e1ea);margin-bottom:4px;}
.file-menu-current #currentProjectName{color:var(--ui-text,#1f2d3d);font-weight:700;}
.file-menu-list,.file-submenu{list-style:none;margin:0;padding:0;}
.file-menu-list > li,.file-submenu > li{position:relative;margin:0;padding:0;}
.file-menu-item{
  display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;box-sizing:border-box;
  border:0;background:transparent;color:var(--ui-text,#1f2d3d);font:inherit;font-size:13px;text-align:left;
  padding:8px 14px;cursor:pointer;white-space:nowrap;
}
.file-menu-item:hover,.file-menu-item:focus{background:#eef5fb;outline:none;}
.file-menu-item.is-current{font-weight:700;}
.file-menu-chevron{color:var(--ui-muted,#64748b);font-size:15px;line-height:1;margin-left:12px;}
.file-menu-meta{display:block;font-size:11px;font-weight:400;color:var(--ui-muted,#64748b);margin-top:2px;white-space:normal;}
.file-menu-empty{display:block;padding:8px 14px;font-size:12px;color:var(--ui-muted,#64748b);}
.file-menu-separator{height:1px;margin:4px 0;background:var(--ui-line,#d8e1ea);}
.file-menu-status{padding:6px 14px 8px;margin:0;font-size:11px;border-top:1px solid var(--ui-line,#d8e1ea);}
.file-submenu{
  display:none;position:absolute;left:100%;top:-4px;min-width:220px;max-width:min(320px,88vw);
  background:var(--ui-surface,#fff);border:1px solid var(--ui-line,#d8e1ea);border-radius:10px;
  box-shadow:0 12px 32px rgba(15,39,64,.16);padding:6px 0;z-index:4003;
}
.file-menu-has-submenu:hover > .file-submenu,
.file-menu-has-submenu.submenu-open > .file-submenu,
.file-menu-has-submenu:focus-within > .file-submenu{display:block;}
.file-menu-has-submenu > .file-menu-item{padding-right:10px;}
.top-stack .card.compact-card.file-menu-card.menu-open::before,
.top-stack .card.compact-card.file-menu-card.menu-open::after{display:none!important;content:none!important;}
.top-stack .card.compact-card.file-menu-card.menu-open{
  position:relative!important;left:auto!important;top:auto!important;transform:none!important;
  width:auto!important;min-width:0!important;max-height:none!important;overflow:visible!important;
  box-shadow:none!important;padding:0!important;border:0!important;background:transparent!important;
}
body.dark-mode .file-menu-dropdown,body.dark-mode .file-submenu{background:#17212b;border-color:#314253;}
body.dark-mode .file-menu-item{color:#e8eef5;}
body.dark-mode .file-menu-item:hover,body.dark-mode .file-menu-item:focus{background:#233241;}
body.dark-mode .file-menu-current #currentProjectName{color:#e8eef5;}
"""

INIT_TOPMENUS_OLD = """  function initTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card .menu-trigger').forEach(function(trigger){"""

INIT_TOPMENUS_NEW = """  function initTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card:not(.file-menu-card) .menu-trigger').forEach(function(trigger){"""

CLOSE_TOPMENUS_OLD = """  function closeTopMenus(){
    document.querySelectorAll('.top-stack .card.compact-card.menu-open').forEach(function(card){"""

CLOSE_TOPMENUS_NEW = """  function closeTopMenus(){
    if(typeof closeProjectFileMenu==='function')closeProjectFileMenu();
    document.querySelectorAll('.top-stack .card.compact-card.menu-open').forEach(function(card){"""

OPENTOPMENU_OLD = """  window.openTopMenu=function(name){
    closeTopMenus();"""

OPENTOPMENU_NEW = """  window.openTopMenu=function(name){
    if(typeof closeProjectFileMenu==='function')closeProjectFileMenu();
    closeTopMenus();"""

EXPORT_HTML_FN = """
function exportContourHtml(){
  if(isParallelActive()){alert('For parallel passages, export each pane separately or use Word export.');return;}
  if(!state.verses.length){alert('Create or generate text first.');return;}
  const fname=askExportFilename(suggestedExportBase('contour-editor'),'html');if(!fname)return;
  const editorHtml=document.getElementById('editor').innerHTML;
  const isGreek=state.language==='greek';
  const textDir=isGreek?'ltr':'rtl';
  const textAlign=isGreek?'left':'right';
  const textFont=isGreek?"'SBL Greek','Gentium Plus','Times New Roman',serif":"'SBL BibLit','SBL Hebrew','Ezra SIL','Times New Roman',serif";
  const html='<!doctype html><html><head><meta charset="utf-8"><title>'+xmlEscape(state.ref||'Contour Export')+'</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#222}.export-title{font-weight:bold;margin-bottom:14px}#printEditor{direction:'+textDir+';text-align:'+textAlign+';font-size:26px;line-height:2.1;font-family:'+textFont+'}.clause,.word{font-family:'+textFont+'}</style></head><body><div class="export-title">'+xmlEscape(state.ref||'Contour Export')+'</div>'+legendHtmlForExport()+'<div id="printEditor" dir="'+textDir+'">'+editorHtml+'</div>'+commentsHtmlForExport()+arcsHtmlForExport()+'</body></html>';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
  a.download=fname;
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
}
"""

HELP_OLD = "Use Generate text, Paste text, or Load sample to load a passage. Each passage can be saved as its own project (Job, Psalms, etc.). Work autosaves; use Project → <strong>Open recent</strong> to switch between them. Enable <strong>Parallel passages</strong> (desktop) for side-by-side comparison."
HELP_NEW = "Use Generate text, Paste text, or Load sample to load a passage. Each passage is its own project — use <strong>Project</strong> (File menu) to save, open recent, export, and import. Enable <strong>Parallel passages</strong> (desktop) for side-by-side comparison."


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def extract_project_js(text):
    start = text.find("function freshProjectState(){return freshPaneState();}")
    end = text.find("document.getElementById('clearTableBtn').onclick=()=>clearTableProject(false);")
    if start < 0 or end < 0:
        raise SystemExit("Could not locate project JS block")
    end += len("document.getElementById('clearTableBtn').onclick=()=>clearTableProject(false);")
    return text[start:end]


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if 'id="projectFileMenuCard"' in text:
        print("Project file menu already applied.")
        return

    old_js = extract_project_js(text)
    new_js = SNIPPET.read_text(encoding="utf-8").strip()

    text = replace_once(text, PROJECT_HTML_OLD, PROJECT_HTML_NEW, "project HTML")
    text = replace_once(text, old_js, new_js, "project JS")
    text = replace_once(text, INIT_TOPMENUS_OLD, INIT_TOPMENUS_NEW, "initTopMenus")
    text = replace_once(text, CLOSE_TOPMENUS_OLD, CLOSE_TOPMENUS_NEW, "closeTopMenus")
    text = replace_once(text, OPENTOPMENU_OLD, OPENTOPMENU_NEW, "openTopMenu")

    if OLD_PROJECT_CSS in text:
        text = text.replace(OLD_PROJECT_CSS, FILE_MENU_CSS, 1)
    elif ".file-menu-dropdown" not in text:
        anchor = "body.dark-mode .admin-link:hover,body.dark-mode"
        text = text.replace(anchor, FILE_MENU_CSS + anchor, 1)

    if "function exportContourHtml()" not in text:
        anchor = "function exportContourPdf(){"
        if anchor not in text:
            raise SystemExit("exportContourPdf anchor not found")
        text = text.replace(anchor, EXPORT_HTML_FN.strip() + "\n" + anchor, 1)

    if HELP_OLD in text:
        text = replace_once(text, HELP_OLD, HELP_NEW, "help text")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: {orig_len} -> {len(text)} bytes")


if __name__ == "__main__":
    main()
