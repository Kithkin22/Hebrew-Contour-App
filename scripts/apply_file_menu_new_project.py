#!/usr/bin/env python3
"""File menu UX: New Project confirmation, remove Clear Table, restructure menu."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "/* file-menu-new-project-v1 */"

MENU_OLD = """        <li role="none" class="file-menu-separator" aria-hidden="true"></li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Project Settings <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" role="menu">
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-rename" role="menuitem">Rename Project</button></li>
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-duplicate" role="menuitem">Duplicate Project</button></li>
            <li role="none" class="file-menu-has-submenu" id="clearTableMenuItem">
              <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Clear Table <span class="file-menu-chevron" aria-hidden="true">›</span></button>
              <ul class="file-submenu" id="clearTableSubmenu" role="menu">
                <li role="none" id="clearTableLeftItem"><button type="button" class="file-menu-item" data-action="settings-clear-left" role="menuitem">Clear Left Pane</button></li>
                <li role="none" id="clearTableRightItem"><button type="button" class="file-menu-item" data-action="settings-clear-right" role="menuitem">Clear Right Pane</button></li>
                <li role="none" id="clearTableAllItem"><button type="button" class="file-menu-item" data-action="settings-clear-all" role="menuitem">Clear All Panes</button></li>
                <li role="none" id="clearTableSingleItem"><button type="button" class="file-menu-item" data-action="settings-clear" role="menuitem">Clear Table</button></li>
              </ul>
            </li>
            <li role="none"><button type="button" class="file-menu-item" data-action="settings-delete" role="menuitem">Delete Project</button></li>
          </ul>
        </li>"""

MENU_NEW = """        <li role="none" class="file-menu-separator" aria-hidden="true"></li>
        <li role="none"><button type="button" class="file-menu-item" data-action="settings-rename" role="menuitem">Rename Project</button></li>
        <li role="none"><button type="button" class="file-menu-item" data-action="settings-duplicate" role="menuitem">Duplicate Project</button></li>
        <li role="none"><button type="button" class="file-menu-item" data-action="settings-delete" role="menuitem">Delete Project</button></li>
        <li role="none" class="file-menu-separator" aria-hidden="true"></li>
        <li role="none" class="file-menu-has-submenu">
          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Project Settings <span class="file-menu-chevron" aria-hidden="true">›</span></button>
          <ul class="file-submenu" id="projectSettingsSubmenu" role="menu">
            <li role="none"><span class="file-menu-empty">No additional settings.</span></li>
          </ul>
        </li>"""

MODAL_ANCHOR = '</div>\n\n<div class="modal" id="feedbackModal"'
MODAL_INSERT = (
    '</div>\n\n'
    '<div class="modal" id="newProjectModal" aria-hidden="true" role="dialog" aria-labelledby="newProjectModalTitle">\n'
    '  <div class="panel help-panel">\n'
    '    <h3 id="newProjectModalTitle">Create a new project?</h3>\n'
    '    <p class="muted">This will clear the current contour/table, comments, annotations, and project data.</p>\n'
    '    <div class="row">\n'
    '      <button type="button" class="btn primary" id="newProjectSave">Save Current Project</button>\n'
    '      <button type="button" class="btn" id="newProjectDontSave">Don\'t Save</button>\n'
    '      <button type="button" class="btn" id="newProjectCancel">Cancel</button>\n'
    '    </div>\n'
    '  </div>\n'
    '</div>\n\n'
    '<div class="modal" id="feedbackModal"'
)

RENDER_OLD = (
    "function updateClearTableMenu(){const parallel=!!(stateBundle&&stateBundle.parallelEnabled);"
    "const left=document.getElementById('clearTableLeftItem');"
    "const right=document.getElementById('clearTableRightItem');"
    "const all=document.getElementById('clearTableAllItem');"
    "const single=document.getElementById('clearTableSingleItem');"
    "if(left)left.style.display=parallel?'':'none';"
    "if(right)right.style.display=parallel?'':'none';"
    "if(all)all.style.display=parallel?'':'none';"
    "if(single)single.style.display=parallel?'none':'';}"
    "function renderProjectFileSubmenus(){updateClearTableMenu();"
)
RENDER_NEW = "function renderProjectFileSubmenus(){"

RENDER_TAIL_OLD = "recentList.appendChild(li);});updateClearTableMenu();}"
RENDER_TAIL_NEW = "recentList.appendChild(li);});}"

CREATE_OLD = (
    "function createNewProject(name){persistCurrentProject(true);const id=newProjectId();"
    "const now=new Date().toISOString();"
    "const n=uniqueProjectName((name||'').trim()||'Untitled Project');"
    "stateBundle=freshProjectBundle();state=stateBundle.panes[0];"
    "generatedRefs=stateBundle.generatedRefsByPane[0]=[];"
    "const pasteBox=document.getElementById('pasteBox');const refBox=document.getElementById('refBox');"
    "if(pasteBox){pasteBox.value='';pasteBox.dir='rtl';}if(refBox)refBox.value='';"
    "syncStateBundle();"
    "projectStore.projects[id]={id,name:n,createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:projectPayloadParallel()};"
    "projectStore.currentProjectId=id;writeProjectStore();"
    "const wasReady=autosaveReady;autosaveReady=false;render();autosaveReady=wasReady;"
    "updateCurrentProjectLabel();renderProjectFileSubmenus();updateSaveStatus('New project: '+n);}"
)

CREATE_NEW = (
    "function resetManualInspectorState(){try{localStorage.setItem('contour4_manual_inspector_entries','{}');"
    "}catch(e){}window.CONTOUR_MANUAL_INSPECTOR={};}"
    "function createNewProject(opts){const saveCurrent=!(opts&&opts.saveCurrent===false);"
    "if(saveCurrent)persistCurrentProject(true);const id=newProjectId();const now=new Date().toISOString();"
    "const n=uniqueProjectName('Untitled Project');stateBundle=freshProjectBundle();"
    "state=stateBundle.panes[0];generatedRefs=stateBundle.generatedRefsByPane[0]=[];"
    "versePairPick=null;commentAnchorStart=null;clearUndoStack();resetManualInspectorState();"
    "bindActivePane(0);syncGeneratorFieldsFromActivePane();"
    "const pasteBox=document.getElementById('pasteBox');const refBox=document.getElementById('refBox');"
    "if(pasteBox){pasteBox.value='';pasteBox.dir='rtl';}if(refBox)refBox.value='';"
    "const parallelToggle=document.getElementById('parallelModeToggle');"
    "if(parallelToggle)parallelToggle.checked=false;syncStateBundle();"
    "projectStore.projects[id]={id,name:n,createdAt:now,updatedAt:now,appVersion:APP_VERSION,payload:projectPayloadParallel()};"
    "projectStore.currentProjectId=id;writeProjectStore();const wasReady=autosaveReady;autosaveReady=false;"
    "render();autosaveReady=wasReady;updateCurrentProjectLabel();renderProjectFileSubmenus();"
    "updateSaveStatus('New project: '+n);}"
)

PROMPT_OLD = (
    "function newProjectPrompt(){promptModal('New project','Name this passage worksheet:',"
    "'Untitled Project',name=>{if((name||'').trim()){createNewProject(name);closeProjectFileMenu();}});}"
)

PROMPT_NEW = (
    "function newProjectPrompt(){const modal=document.getElementById('newProjectModal');"
    "if(!modal){createNewProject({saveCurrent:false});return;}"
    "const shut=()=>{modal.classList.remove('show');modal.setAttribute('aria-hidden','true');};"
    "document.getElementById('newProjectSave').onclick=()=>{shut();"
    "try{persistCurrentProject(false);}catch(e){alert('Could not save in this browser. Try Export JSON instead.');return;}"
    "createNewProject({saveCurrent:false});};"
    "document.getElementById('newProjectDontSave').onclick=()=>{shut();createNewProject({saveCurrent:false});};"
    "document.getElementById('newProjectCancel').onclick=shut;"
    "modal.classList.add('show');modal.setAttribute('aria-hidden','false');}"
)

DELETE_OLD = "}else{createNewProject('Untitled Project');updateSaveStatus('Project deleted. Started a new blank project.');}"
DELETE_NEW = "}else{createNewProject({saveCurrent:false});updateSaveStatus('Project deleted. Started a new blank project.');}"

HANDLE_OLD = (
    "case 'settings-clear':clearTableProject(false);break;"
    "case 'settings-clear-left':clearTableProject(false,0);break;"
    "case 'settings-clear-right':clearTableProject(false,1);break;"
    "case 'settings-clear-all':clearTableProject(false,'all');break;"
)

HANDLE_NEW = ""


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")
    if MARKER in text:
        print("apply_file_menu_new_project: already applied")
        return

    if MENU_OLD not in text:
        if MENU_NEW in text:
            print("apply_file_menu_new_project: menu already updated")
        else:
            raise SystemExit("Could not find file menu HTML block")

    changes = 0

    if MENU_OLD in text:
        text = text.replace(MENU_OLD, MENU_NEW, 1)
        changes += 1

    if 'id="newProjectModal"' not in text:
        if MODAL_ANCHOR not in text:
            raise SystemExit("Could not find modal anchor for newProjectModal")
        text = text.replace(MODAL_ANCHOR, MODAL_INSERT, 1)
        changes += 1

    if RENDER_OLD in text:
        text = text.replace(RENDER_OLD, RENDER_NEW, 1)
        changes += 1
    elif RENDER_NEW in text and "updateClearTableMenu" not in text:
        pass
    else:
        raise SystemExit("Could not find renderProjectFileSubmenus / updateClearTableMenu")

    if RENDER_TAIL_OLD in text:
        text = text.replace(RENDER_TAIL_OLD, RENDER_TAIL_NEW, 1)
        changes += 1

    if CREATE_OLD in text:
        text = text.replace(CREATE_OLD, CREATE_NEW, 1)
        changes += 1
    elif "function resetManualInspectorState" in text:
        pass
    else:
        raise SystemExit("Could not find createNewProject")

    if PROMPT_OLD in text:
        text = text.replace(PROMPT_OLD, PROMPT_NEW, 1)
        changes += 1
    elif "newProjectModal" in text and "newProjectSave" in text:
        pass
    else:
        raise SystemExit("Could not find newProjectPrompt")

    if DELETE_OLD in text:
        text = text.replace(DELETE_OLD, DELETE_NEW, 1)
        changes += 1

    if HANDLE_OLD in text:
        text = text.replace(HANDLE_OLD, HANDLE_NEW, 1)
        changes += 1

    if MARKER not in text:
        text = text.replace(
            "function initProjectFileMenu(){",
            MARKER + "\nfunction initProjectFileMenu(){",
            1,
        )

    text = text.replace(
        "localStorage.setItem('contour4_manual_inspector_entries','{}');}}catch",
        "localStorage.setItem('contour4_manual_inspector_entries','{}');}catch",
    )

    INDEX.write_text(text, encoding="utf-8")
    print(f"apply_file_menu_new_project: applied ({changes} replacements)")


if __name__ == "__main__":
    main()
