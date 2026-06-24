#!/usr/bin/env python3
"""Multi-project store + Open recent dropdown (Word-style)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SNIPPET = Path(__file__).resolve().parent / "project_manager.js.snippet"

PROJECT_HTML_OLD = """  <div class="card compact-card" data-menu="project">
    <strong class="save-tools-title menu-trigger">Project</strong>
    <div class="top-menu-panel">
    <div class="row project-actions-row">
      <button class="btn good" id="saveLocalBtn">Save Project</button>
      <button class="btn" id="loadLocalBtn">Load Saved Project</button>
      <button class="btn good" id="downloadProjectBtn">Download Project (.json)</button>
      <button class="btn" id="importProjectBtn">Import Project (.json)</button>
      <input type="file" id="projectFileInput" accept="application/json,.json" class="hidden">
      <button class="btn danger" id="clearTableBtn">Clear Table</button>
      <button class="btn danger" id="clearAutosaveBtn">Clear Autosave</button>
    </div>
    <p id="saveStatus" class="muted small">Opens with a blank table. Use Save Project to keep work in this browser.</p>
    </div>
  </div>"""

PROJECT_HTML_NEW = """  <div class="card compact-card" data-menu="project">
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

CSS_ANCHOR = "body.dark-mode .admin-link:hover,body.dark-mode"
CSS_BLOCK = """
.project-current-label{margin:6px 0 10px;font-size:14px;color:var(--ui-muted,#64748b);}
.project-current-label #currentProjectName{color:var(--ui-text,#1f2d3d);font-weight:700;}
.project-recent-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;}
.project-recent-row label{font-size:13px;font-weight:700;white-space:nowrap;}
.project-recent-row select{flex:1 1 220px;min-width:180px;max-width:100%;font:inherit;padding:8px 10px;border:1px solid var(--ui-line,#d8e1ea);border-radius:8px;background:var(--ui-surface,#fff);color:var(--ui-text,#1f2d3d);}
.project-actions-row{flex-wrap:wrap;}
.top-stack .card.compact-card[data-menu="project"].menu-open::before{min-height:320px;}
body.dark-mode .project-current-label #currentProjectName{color:#e8eef5;}
body.dark-mode .project-recent-row select{background:#17212b;border-color:#314253;color:#e8eef5;}
"""

START_APP_OLD = """// Always open with a blank table; use Save Project / Load Saved Project manually.
let appStarted=false;
function startApp(){
  if(appStarted)return;
  appStarted=true;
  autosaveReady=false;
  initParallelMode();
  render();
  autosaveReady=true;
}"""

START_APP_NEW = """let appStarted=false;
function startApp(){
  if(appStarted)return;
  appStarted=true;
  autosaveReady=false;
  initParallelMode();
  initProjectManager();
  render();
  autosaveReady=true;
}"""

HELP_TEXT_OLD = "The app opens with a blank table. Use Generate text, Paste text, or Load sample to load a passage. Enable <strong>Parallel passages</strong> (desktop) for side-by-side comparison with verse alignment and cross-pane arcs. Table edits autosave; use Project → Save Project to keep work after refresh."
HELP_TEXT_NEW = "Use Generate text, Paste text, or Load sample to load a passage. Each passage can be saved as its own project (Job, Psalms, etc.). Work autosaves; use Project → <strong>Open recent</strong> to switch between them. Enable <strong>Parallel passages</strong> (desktop) for side-by-side comparison."


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

    if CSS_ANCHOR in text and ".project-recent-row" not in text:
        text = text.replace(CSS_ANCHOR, CSS_BLOCK + CSS_ANCHOR, 1)

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: {orig_len} -> {len(text)} bytes")


if __name__ == "__main__":
    main()
