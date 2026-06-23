#!/usr/bin/env python3
"""Add multi-project save/open/rename/export/import (Susan's Job + Psalms workflow)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SNIPPET = Path(__file__).resolve().parent / "project_manager.js.snippet"

PROJECT_HTML_OLD = """  <div class="card compact-card" data-menu="project">
    <strong class="save-tools-title menu-trigger">Project</strong>
    <div class="row">
      <button class="btn good" id="saveLocalBtn">Save Project</button>
      <button class="btn" id="loadLocalBtn">Load Saved Project</button>
      <button class="btn good" id="downloadProjectBtn">Download Project (.json)</button>
      <button class="btn" id="importProjectBtn">Import Project (.json)</button>
      <input type="file" id="projectFileInput" accept="application/json,.json" class="hidden">
      <button class="btn danger" id="clearTableBtn">Clear Table</button>
      <button class="btn danger" id="clearAutosaveBtn">Clear Autosave</button>
    </div>
    <p id="saveStatus" class="muted small">Opens with a blank table. Use Save Project to keep work in this browser.</p>
  </div>"""

PROJECT_HTML_NEW = """  <div class="card compact-card" data-menu="project">
    <strong class="save-tools-title menu-trigger">Project</strong>
    <p id="currentProjectLabel" class="project-current-label">Current project: <span id="currentProjectName">Untitled Project</span></p>
    <div class="row project-actions-row">
      <button class="btn good" id="newProjectBtn">New Project</button>
      <button class="btn" id="openProjectBtn">Open Project</button>
      <button class="btn good" id="saveLocalBtn">Save Project</button>
      <button class="btn" id="renameProjectBtn">Rename</button>
      <button class="btn" id="duplicateProjectBtn">Duplicate</button>
      <button class="btn good" id="downloadProjectBtn">Export JSON</button>
      <button class="btn" id="importProjectBtn">Import JSON</button>
      <input type="file" id="projectFileInput" accept="application/json,.json" class="hidden">
      <button class="btn danger" id="deleteProjectBtn">Delete Project</button>
      <button class="btn danger" id="clearTableBtn">Clear Table</button>
    </div>
    <p id="saveStatus" class="muted small">Each passage is its own project. Work autosaves; reopening restores your last project.</p>
  </div>"""

PROJECT_MODAL = """
<div class="modal" id="projectPickerModal" aria-hidden="true" role="dialog" aria-labelledby="projectPickerTitle">
  <div class="panel help-panel">
    <h3 id="projectPickerTitle">Open project</h3>
    <p class="muted">Choose a saved passage worksheet. Your current project is saved before switching.</p>
    <ul id="projectPickerList" class="project-list"></ul>
    <div class="row"><button class="btn" id="projectPickerCloseBtn" type="button">Close</button></div>
  </div>
</div>
"""

CSS_ANCHOR = "body.dark-mode .admin-link:hover,body.dark-mode"
CSS_BLOCK = """
.project-current-label{margin:6px 0 10px;font-size:14px;color:var(--ui-muted,#64748b);}
.project-current-label #currentProjectName{color:var(--ui-text,#1f2d3d);font-weight:700;}
.project-actions-row{flex-wrap:wrap;}
.project-list{list-style:none;margin:0;padding:0;max-height:min(60vh,420px);overflow:auto;}
.project-list li{border:1px solid var(--ui-line,#d8e1ea);border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;}
.project-list li:hover,.project-list li:focus{background:#f0f7ff;border-color:#9fc8ee;outline:none;}
.project-list .project-list-name{font-weight:700;display:block;}
.project-list .project-list-meta{font-size:12px;color:var(--ui-muted,#64748b);white-space:nowrap;}
.project-list-empty{cursor:default;border-style:dashed;}
body.dark-mode .project-list li:hover,body.dark-mode .project-list li:focus{background:#233241;}
.top-stack .card.compact-card[data-menu="project"].menu-open::before{min-height:260px;}
"""

START_APP_OLD = """// Always open with a blank table; use Save Project / Load Saved Project manually.
let appStarted=false;
function startApp(){
  if(appStarted)return;
  appStarted=true;
  autosaveReady=false;
  render();
  autosaveReady=true;
}"""

START_APP_NEW = """let appStarted=false;
function startApp(){
  if(appStarted)return;
  appStarted=true;
  autosaveReady=false;
  initProjectManager();
  render();
  autosaveReady=true;
}"""

HELP_TEXT_OLD = "The app opens with a blank table. Use Generate text, Paste text, or Load sample to load a passage. Table edits autosave during your session; use Project → Save Project to keep work after refresh."
HELP_TEXT_NEW = "Use Generate text, Paste text, or Load sample to load a passage. Each passage can be saved as its own project (Job, Psalms, etc.). Work autosaves; use Project → Open Project to switch between them."


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def extract_old_project_js(text):
    start = text.find("const PROJECT_STORAGE_KEY")
    end = text.find("document.getElementById('clearAutosaveBtn').onclick=clearAutosave;")
    if start < 0 or end < 0:
        raise SystemExit("Could not locate legacy project JS block")
    end += len("document.getElementById('clearAutosaveBtn').onclick=clearAutosave;")
    return text[start:end]


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if "hebrewContourApp.projects.v1" in text:
        print("Project manager already applied.")
        return

    old_js = extract_old_project_js(text)
    new_js = SNIPPET.read_text(encoding="utf-8").strip()

    text = replace_once(text, PROJECT_HTML_OLD, PROJECT_HTML_NEW, "project HTML")
    text = replace_once(text, old_js, new_js, "project JS")
    text = replace_once(text, START_APP_OLD, START_APP_NEW, "startApp")

    if HELP_TEXT_OLD in text:
        text = replace_once(text, HELP_TEXT_OLD, HELP_TEXT_NEW, "help text")

    if CSS_ANCHOR in text and ".project-current-label" not in text:
        text = text.replace(CSS_ANCHOR, CSS_BLOCK + CSS_ANCHOR, 1)

    modal_anchor = '<div class="modal" id="feedbackModal"'
    if 'id="projectPickerModal"' not in text:
        if modal_anchor not in text:
            raise SystemExit("Could not find feedbackModal anchor for project picker modal")
        text = text.replace(modal_anchor, PROJECT_MODAL.strip() + "\n\n" + modal_anchor, 1)

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: {orig_len} -> {len(text)} bytes")


if __name__ == "__main__":
    main()
