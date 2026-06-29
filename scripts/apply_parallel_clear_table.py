#!/usr/bin/env python3
"""Clear Table submenu: left pane, right pane, or all (parallel mode)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-clear-table-v1 */"

HTML_OLD = """            <li role="none"><button type="button" class="file-menu-item" data-action="settings-clear" role="menuitem">Clear Table</button></li>"""

HTML_NEW = """            <li role="none" class="file-menu-has-submenu" id="clearTableMenuItem">
              <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Clear Table <span class="file-menu-chevron" aria-hidden="true">›</span></button>
              <ul class="file-submenu" id="clearTableSubmenu" role="menu">
                <li role="none" id="clearTableLeftItem"><button type="button" class="file-menu-item" data-action="settings-clear-left" role="menuitem">Clear Left Pane</button></li>
                <li role="none" id="clearTableRightItem"><button type="button" class="file-menu-item" data-action="settings-clear-right" role="menuitem">Clear Right Pane</button></li>
                <li role="none" id="clearTableAllItem"><button type="button" class="file-menu-item" data-action="settings-clear-all" role="menuitem">Clear All Panes</button></li>
                <li role="none" id="clearTableSingleItem"><button type="button" class="file-menu-item" data-action="settings-clear" role="menuitem">Clear Table</button></li>
              </ul>
            </li>"""

MENU_FN = (
    "function updateClearTableMenu(){const parallel=!!(stateBundle&&stateBundle.parallelEnabled);"
    "const left=document.getElementById('clearTableLeftItem');"
    "const right=document.getElementById('clearTableRightItem');"
    "const all=document.getElementById('clearTableAllItem');"
    "const single=document.getElementById('clearTableSingleItem');"
    "if(left)left.style.display=parallel?'':'none';"
    "if(right)right.style.display=parallel?'':'none';"
    "if(all)all.style.display=parallel?'':'none';"
    "if(single)single.style.display=parallel?'none':'';}"
)

RENDER_OLD = "function renderProjectFileSubmenus(){const recentList=document.getElementById('recentProjectsSubmenu');"
RENDER_NEW = MENU_FN + "function renderProjectFileSubmenus(){updateClearTableMenu();const recentList=document.getElementById('recentProjectsSubmenu');"

RENDER_END_OLD = "recentList.appendChild(li);});}"
RENDER_END_NEW = "recentList.appendChild(li);});updateClearTableMenu();}"

CLEAR_OLD = (
    "function clearTableProject(silent){if(!silent&&!confirm('Clear all text, annotations, and table content in this project?'))return;"
    "state=freshProjectState();generatedRefs=[];stateBundle.panes[stateBundle.activePane]=state;"
    "stateBundle.generatedRefsByPane[stateBundle.activePane]=generatedRefs;const pasteBox=document.getElementById('pasteBox');"
    "const refBox=document.getElementById('refBox');if(pasteBox)pasteBox.value='';if(refBox)refBox.value='';"
    "persistCurrentProject(true);const wasReady=autosaveReady;autosaveReady=false;render();autosaveReady=wasReady;updateSaveStatus('Table cleared.');}"
)

CLEAR_NEW = (
    "function clearTableProject(silent,target){ensureStateBundle();const parallel=!!stateBundle.parallelEnabled;"
    "let which=target;if(which===undefined||which===null)which=parallel?stateBundle.activePane:'single';"
    "const msg=which==='all'?'Clear all text, annotations, and table content in BOTH panes?':"
    "which===0?'Clear all text, annotations, and table content in the LEFT pane?':"
    "which===1?'Clear all text, annotations, and table content in the RIGHT pane?':"
    "'Clear all text, annotations, and table content in this project?';"
    "if(!silent&&!confirm(msg))return;"
    "const wipePane=function(pi){stateBundle.panes[pi]=freshPaneState();stateBundle.generatedRefsByPane[pi]=[];pruneCrossArcsForPane(pi);};"
    "if(which==='all'){wipePane(0);wipePane(1);stateBundle.crossArcs=[];stateBundle.verseAlignPairs=null;versePairPick=null;}"
    "else if(parallel&&(which===0||which===1)){wipePane(which);stateBundle.verseAlignPairs=null;versePairPick=null;}"
    "else{state=freshProjectState();generatedRefs=[];stateBundle.panes[stateBundle.activePane]=state;"
    "stateBundle.generatedRefsByPane[stateBundle.activePane]=generatedRefs;}"
    "bindActivePane(stateBundle.activePane);syncGeneratorFieldsFromActivePane();"
    "const pasteBox=document.getElementById('pasteBox');const refBox=document.getElementById('refBox');"
    "if(pasteBox&&!state.verses.length)pasteBox.value='';if(refBox&&!state.ref)refBox.value='';"
    "clearUndoStack();persistCurrentProject(true);const wasReady=autosaveReady;autosaveReady=false;render();"
    "autosaveReady=wasReady;const status=which==='all'?'Both panes cleared.':which===0?'Left pane cleared.':"
    "which===1?'Right pane cleared.':'Table cleared.';updateSaveStatus(status);}"
)

HANDLE_OLD = (
    "case 'settings-clear':clearTableProject(false);break;case 'settings-delete':deleteCurrentProject();break;"
)

HANDLE_NEW = (
    "case 'settings-clear':clearTableProject(false);break;case 'settings-clear-left':clearTableProject(false,0);break;"
    "case 'settings-clear-right':clearTableProject(false,1);break;case 'settings-clear-all':clearTableProject(false,'all');break;"
    "case 'settings-delete':deleteCurrentProject();break;"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "updateClearTableMenu",
        "settings-clear-left",
        "Clear Left Pane",
        "clearTableProject(false,'all')",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel clear table v1 already applied.")
        return

    if "parallel-pair-feedback-v1" not in html:
        raise SystemExit("Run apply_parallel_pair_feedback.py first")

    css_anchor = "/* parallel-pair-feedback-v1 */"
    html = html.replace(css_anchor, css_anchor + "\n" + MARKER + "\n", 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find Clear Table menu item")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find renderProjectFileSubmenus")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    if RENDER_END_OLD not in html:
        raise SystemExit("Could not find renderProjectFileSubmenus end")
    html = html.replace(RENDER_END_OLD, RENDER_END_NEW, 1)

    if CLEAR_OLD not in html:
        raise SystemExit("Could not find clearTableProject")
    html = html.replace(CLEAR_OLD, CLEAR_NEW, 1)

    if HANDLE_OLD not in html:
        raise SystemExit("Could not find handleProjectFileAction clear case")
    html = html.replace(HANDLE_OLD, HANDLE_NEW, 1)

    PAR_UI_OLD = (
        "if(typeof updateOpenRecentMenuLabel==='function')updateOpenRecentMenuLabel();"
        "document.querySelectorAll('.parallel-verse-cell')"
    )
    PAR_UI_NEW = (
        "if(typeof updateOpenRecentMenuLabel==='function')updateOpenRecentMenuLabel();"
        "if(typeof updateClearTableMenu==='function')updateClearTableMenu();"
        "document.querySelectorAll('.parallel-verse-cell')"
    )
    if PAR_UI_OLD in html:
        html = html.replace(PAR_UI_OLD, PAR_UI_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel clear table v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
