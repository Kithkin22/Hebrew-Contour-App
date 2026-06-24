#!/usr/bin/env python3
"""Load saved projects into one parallel pane without replacing the other."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SNIPPET = Path(__file__).resolve().parent / "parallel_pane_load.snippet.js"

MARKER = "/* parallel-pane-load */"

CSS_BLOCK = """
/* parallel-pane-load */
.parallel-pane-cell{display:flex;flex-direction:column;gap:6px;min-width:0;}
.parallel-pane-load{width:100%;font:inherit;font-size:12px;padding:5px 8px;border:1px solid #d8dee6;border-radius:6px;background:#fff;color:#1f2d3d;cursor:pointer;}
.parallel-pane-load:focus{outline:2px solid #8ec5ff;border-color:#8ec5ff;}
body.dark-mode .parallel-pane-load{background:#17212b;border-color:#314253;color:#e8eef5;}
"""

HTML_OLD = """        <div class="parallel-compare-head">
          <div class="parallel-pane-head" data-pane="0" id="parallelPaneHead0">Left passage</div>
          <div class="parallel-pane-head" data-pane="1" id="parallelPaneHead1">Right passage</div>
        </div>"""

HTML_NEW = """        <div class="parallel-compare-head">
          <div class="parallel-pane-cell" data-pane="0">
            <div class="parallel-pane-head" data-pane="0" id="parallelPaneHead0">Left passage</div>
            <select class="parallel-pane-load" data-pane="0" id="parallelPaneLoad0" aria-label="Load saved project into left pane"><option value="">Load saved project…</option></select>
          </div>
          <div class="parallel-pane-cell" data-pane="1">
            <div class="parallel-pane-head" data-pane="1" id="parallelPaneHead1">Right passage</div>
            <select class="parallel-pane-load" data-pane="1" id="parallelPaneLoad1" aria-label="Load saved project into right pane"><option value="">Load saved project…</option></select>
          </div>
        </div>"""

FILE_MENU_OLD = """          <button type="button" class="file-menu-item" role="menuitem" aria-haspopup="true">Open Recent <span class="file-menu-chevron" aria-hidden="true">›</span></button>"""

FILE_MENU_NEW = """          <button type="button" class="file-menu-item" id="openRecentMenuBtn" role="menuitem" aria-haspopup="true">Open Recent <span class="file-menu-chevron" aria-hidden="true">›</span></button>"""

REPLACEMENTS = [
    (
        "function openProjectById(id){if(!id)return;if(id===projectStore.currentProjectId){const curRec=getCurrentProjectRecord();updateSaveStatus('Already open: '+(curRec?curRec.name:'project'));closeProjectFileMenu();return;}switchToProject(id);closeProjectFileMenu();}",
        "function extractPaneFromPayload(payload,preferPane){const data=(payload&&payload.state)?payload:{state:payload||{}};const st=data.state||{};const pi=preferPane===1?1:0;if(st&&Array.isArray(st.panes)&&st.panes.length){const pane=Object.assign(freshPaneState(),st.panes[pi]||st.panes[0]||{});const refs=(Array.isArray(payload.generatedRefsByPane)&&payload.generatedRefsByPane[pi])||(Array.isArray(payload.generatedRefsByPane)&&payload.generatedRefsByPane[0])||payload.generatedRefs||data.generatedRefs||[];return{pane,generatedRefs:Array.isArray(refs)?refs.slice():[]};}return{pane:Object.assign(freshPaneState(),st),generatedRefs:Array.isArray(data.generatedRefs)?data.generatedRefs.slice():(Array.isArray(payload.generatedRefs)?payload.generatedRefs.slice():[])}};}\nfunction loadProjectIntoPane(paneIndex,projectId){const pi=paneIndex===1?1:0;const rec=projectStore.projects[projectId];if(!rec||!rec.payload)return false;ensureStateBundle();syncStateBundle();const extracted=extractPaneFromPayload(rec.payload,pi);stateBundle.panes[pi]=extracted.pane;stateBundle.generatedRefsByPane[pi]=extracted.generatedRefs;if(stateBundle.activePane===pi){bindActivePane(pi);}else{stateBundle.panes[stateBundle.activePane]=state;}if(!stateBundle.parallelEnabled){stateBundle.parallelEnabled=true;const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=true;}if(autosaveReady)autoSaveProject();render();updateSaveStatus('Loaded \"'+rec.name+'\" into '+paneLabel(pi));return true;}\nfunction openProjectInActivePane(id){if(!id)return;if(stateBundle.parallelEnabled){loadProjectIntoPane(stateBundle.activePane,id);closeProjectFileMenu();return;}openProjectById(id);}\nfunction openProjectById(id){if(!id)return;if(id===projectStore.currentProjectId){const curRec=getCurrentProjectRecord();updateSaveStatus('Already open: '+(curRec?curRec.name:'project'));closeProjectFileMenu();return;}switchToProject(id);closeProjectFileMenu();}",
    ),
    (
        "function renderProjectFileSubmenus(){const recentList=document.getElementById('recentProjectsSubmenu');const entries=sortedProjectEntries();const cur=projectStore.currentProjectId;if(!recentList)return;recentList.innerHTML='';if(!entries.length){recentList.innerHTML='<li role=\"none\"><span class=\"file-menu-empty\">'+esc('No recent projects yet.')+'</span></li>';return;}entries.forEach(function(p){const li=document.createElement('li');li.setAttribute('role','none');const btn=document.createElement('button');btn.type='button';btn.className='file-menu-item'+(p.id===cur?' is-current':'');btn.setAttribute('role','menuitem');btn.dataset.projectId=p.id;const when=new Date(p.updatedAt||p.createdAt).toLocaleString();btn.innerHTML=esc(p.name||'Untitled Project')+(p.id===cur?' <span class=\"file-menu-meta\">(current)</span>':'')+'<span class=\"file-menu-meta\">'+esc(when)+'</span>';btn.onclick=function(e){e.stopPropagation();openProjectById(p.id);};li.appendChild(btn);recentList.appendChild(li);});}",
        "function updateOpenRecentMenuLabel(){const btn=document.getElementById('openRecentMenuBtn');if(!btn)return;const parallel=!!(stateBundle&&stateBundle.parallelEnabled);const label=parallel?'Open Recent in Active Pane':'Open Recent';const chev=btn.querySelector('.file-menu-chevron');btn.textContent=label+' ';if(chev)btn.appendChild(chev);}\nfunction renderPaneProjectDropdowns(){document.querySelectorAll('.parallel-pane-load').forEach(sel=>{const pane=+sel.dataset.pane;const prev=sel.value;sel.innerHTML='<option value=\"\">Load saved project…</option>';sortedProjectEntries().forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name||'Untitled Project';sel.appendChild(opt);});sel.value=prev&&projectStore.projects[prev]?prev:'';if(!sel.dataset.bound){sel.dataset.bound='1';sel.onchange=()=>{const id=sel.value;if(!id)return;loadProjectIntoPane(pane,id);sel.value='';};}});}\nfunction renderProjectFileSubmenus(){const recentList=document.getElementById('recentProjectsSubmenu');const entries=sortedProjectEntries();const cur=projectStore.currentProjectId;const parallel=!!(stateBundle&&stateBundle.parallelEnabled);updateOpenRecentMenuLabel();renderPaneProjectDropdowns();if(!recentList)return;recentList.innerHTML='';if(!entries.length){recentList.innerHTML='<li role=\"none\"><span class=\"file-menu-empty\">'+esc('No recent projects yet.')+'</span></li>';return;}entries.forEach(function(p){const li=document.createElement('li');li.setAttribute('role','none');const btn=document.createElement('button');btn.type='button';btn.className='file-menu-item'+(p.id===cur&&!parallel?' is-current':'');btn.setAttribute('role','menuitem');btn.dataset.projectId=p.id;const when=new Date(p.updatedAt||p.createdAt).toLocaleString();btn.innerHTML=esc(p.name||'Untitled Project')+(p.id===cur&&!parallel?' <span class=\"file-menu-meta\">(current)</span>':'')+'<span class=\"file-menu-meta\">'+esc(when)+'</span>';btn.onclick=function(e){e.stopPropagation();if(parallel)openProjectInActivePane(p.id);else openProjectById(p.id);};li.appendChild(btn);recentList.appendChild(li);});}",
    ),
    (
        "document.querySelectorAll('.parallel-pane-head').forEach(h=>{h.onclick=()=>{bindActivePane(+h.dataset.pane);renderParallelEditors();};});",
        "document.querySelectorAll('.parallel-pane-head').forEach(h=>{h.onclick=()=>{bindActivePane(+h.dataset.pane);renderParallelEditors();};});renderPaneProjectDropdowns();",
    ),
    (
        "function updateParallelModeUI(){const ind=document.getElementById('activePaneIndicator');const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=!!stateBundle.parallelEnabled;if(ind){if(isParallelActive())ind.textContent='Annotating: '+paneLabel(stateBundle.activePane);else if(stateBundle.parallelEnabled)ind.textContent='Parallel mode (widen window for side-by-side)';else ind.textContent='';}",
        "function updateParallelModeUI(){const ind=document.getElementById('activePaneIndicator');const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=!!stateBundle.parallelEnabled;if(ind){if(isParallelActive())ind.textContent='Annotating: '+paneLabel(stateBundle.activePane);else if(stateBundle.parallelEnabled)ind.textContent='Parallel mode (widen window for side-by-side)';else ind.textContent='';}if(typeof updateOpenRecentMenuLabel==='function')updateOpenRecentMenuLabel();",
    ),
]


def verify(html: str) -> None:
    size = len(html.encode("utf-8"))
    if size < 15_000_000:
        raise SystemExit(f"index.html too small after patch ({size} bytes)")
    for needle in (
        "loadProjectIntoPane",
        "parallelPaneLoad0",
        "openProjectInActivePane",
        MARKER,
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel pane load already applied.")
        return

    if "loadProjectIntoPane" in html:
        raise SystemExit("loadProjectIntoPane already exists without marker")

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel pane head HTML anchor")

    html = html.replace(HTML_OLD, HTML_NEW, 1)
    html = html.replace(FILE_MENU_OLD, FILE_MENU_NEW, 1)

    css_anchor = "/* Parallel passages (desktop) */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel CSS anchor")
    html = html.replace(css_anchor, MARKER + "\n" + CSS_BLOCK + css_anchor, 1)

    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Could not find replacement anchor:\n{old[:120]}...")
        html = html.replace(old, new, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")

    SNIPPET.write_text(
        "/* Pane load helpers — canonical copy; inlined in index.html */\n"
        + REPLACEMENTS[0][1].split("function openProjectById")[0].strip()
        + "\n",
        encoding="utf-8",
    )
    print(f"Applied parallel pane load ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
