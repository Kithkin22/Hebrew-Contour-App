#!/usr/bin/env python3
"""Add desktop parallel passages: dual panes, verse alignment, cross-pane arcs."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SNIPPET = Path(__file__).resolve().parent / "parallel_passages.snippet.js"

CSS = """
/* Parallel passages (desktop) */
.parallel-mode-bar{display:none;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px 0;padding:10px 12px;background:#f0f6fc;border:1px solid #c8daf0;border-radius:8px;}
.parallel-mode-bar label{font-weight:700;display:flex;align-items:center;gap:8px;cursor:pointer;}
#activePaneIndicator{font-size:13px;}
#parallelCompareWrap.hidden,#singleEditorSection.hidden{display:none!important;}
.parallel-compare{position:relative;margin-bottom:12px;}
.parallel-compare-head{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px;}
.parallel-pane-head{padding:8px 10px;border:2px solid #d8dee6;border-radius:8px;background:#fafafa;font-weight:700;font-size:14px;cursor:pointer;text-align:center;}
.parallel-pane-head.parallel-pane-active{border-color:#2b67a5;background:#eef5fc;box-shadow:0 0 0 1px #2b67a5 inset;}
.parallel-scroll-area{position:relative;}
#crossArcLayer{position:absolute;inset:0;pointer-events:none;z-index:5;}
#crossArcSvg{width:100%;height:100%;overflow:visible;}
#parallelVerseRows{position:relative;z-index:1;}
.parallel-verse-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch;margin-bottom:10px;}
.parallel-verse-cell{border:1px solid #e3e8ef;border-radius:8px;padding:8px 10px;background:#fff;min-height:48px;}
.parallel-verse-cell.pane-active{outline:2px solid #8ec5ff;background:#fbfdff;}
.parallel-pane-arc-wrap{position:relative;}
.parallel-pane-arc-wrap .paneArcSvg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3;}
.parallel-verse-body{position:relative;z-index:2;}
.parallel-verse-ref{margin-bottom:4px;font-size:12px;}
.parallel-empty-verse{padding:12px 0;color:#999;}
.parallel-table-block{margin-bottom:24px;}
.parallel-table-title{margin:0 0 8px 0;font-size:18px;}
@media(min-width:1024px){.parallel-mode-bar{display:flex;}}
@media(max-width:1023px){#parallelCompareWrap{display:none!important;}}
"""

PARALLEL_HTML = """
      <div class="parallel-mode-bar desktop-only" id="parallelModeBar">
        <label><input type="checkbox" id="parallelModeToggle"> Parallel passages</label>
        <span id="activePaneIndicator" class="muted"></span>
        <button type="button" class="btn" id="realignVersesBtn">Re-align verses</button>
        <span class="muted small">Desktop side-by-side. Click a pane header or any word to choose which passage receives Generate / Paste.</span>
      </div>
      <div id="parallelCompareWrap" class="parallel-compare hidden">
        <div class="parallel-compare-head">
          <div class="parallel-pane-head" data-pane="0" id="parallelPaneHead0">Left passage</div>
          <div class="parallel-pane-head" data-pane="1" id="parallelPaneHead1">Right passage</div>
        </div>
        <div class="parallel-scroll-area">
          <div id="crossArcLayer"><svg id="crossArcSvg" aria-hidden="true"></svg></div>
          <div id="parallelVerseRows"></div>
        </div>
      </div>
      <div id="singleEditorSection">
"""

EXPORT_MODAL = """
<div class="modal" id="exportScopeModal" aria-hidden="true" role="dialog" aria-labelledby="exportScopeTitle">
  <div class="panel help-panel">
    <h3 id="exportScopeTitle">Export which passage?</h3>
    <p class="muted">Choose one passage or both for this export.</p>
    <div class="row">
      <button type="button" class="btn" id="exportScopeLeft">Left passage only</button>
      <button type="button" class="btn" id="exportScopeRight">Right passage only</button>
      <button type="button" class="btn primary" id="exportScopeBoth">Both passages</button>
      <button type="button" class="btn" id="exportScopeCancel">Cancel</button>
    </div>
  </div>
</div>
"""

REPLACEMENTS = [
    (
        "function render(){applyLanguageLayout();renderEditor();renderTable();renderLegendEditor();renderInclusioManager();renderCommentsPanel();setTimeout(updateCommentPopover,0);if(autosaveReady)autoSaveProject();}",
        "function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive()){renderParallelEditors();renderDualTables();}else{renderEditor();renderTable();}renderLegendEditor();renderInclusioManager();renderCommentsPanel();setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();else if(typeof renderArcManager==='function')renderArcManager();if(autosaveReady)autoSaveProject();}",
    ),
    (
        "function locOK(l){return l&&state.verses[l.v]&&state.verses[l.v].clauses[l.c]&&state.verses[l.v].clauses[l.c].words[l.w];}",
        "function locOK(l,pane){if(pane!=null||(l&&l.pane!=null))return locOKInPane(l,pane!=null?pane:l.pane);return l&&state.verses[l.v]&&state.verses[l.v].clauses[l.c]&&state.verses[l.v].clauses[l.c].words[l.w];}",
    ),
    (
        'function wordElForLoc(l){if(!locOK(l))return null;return document.querySelector(`.word[data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`);}',
        'function wordElForLoc(l,pane){const p=pane!=null?pane:(l&&l.pane!=null?l.pane:stateBundle.activePane);if(isParallelActive()){if(!locOKInPane({v:l.v,c:l.c,w:l.w},p))return null;return document.querySelector(`.word[data-pane="${p}"][data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`);}if(!locOK(l))return null;return document.querySelector(`.word[data-v="${l.v}"][data-c="${l.c}"][data-w="${l.w}"]`);}',
    ),
    (
        "function locFromWordEl(el){if(!el)return null;return {v:+el.dataset.v,c:+el.dataset.c,w:+el.dataset.w};}",
        "function locFromWordEl(el){return locFromWordElWithPane(el);}",
    ),
    (
        "function addArcFromLocs(start,end){ensureArcs();if(!locOK(start)||!locOK(end))return null;if(sameLoc(start,end)){updateArcStatus('Drag to a different word to create an arc.');return null;}let arc={id:nextArcId(),start:cloneLoc(start),end:cloneLoc(end),color:arcColorValue(),label:arcLabelValue()};state.arcs.push(arc);state.activeArcId=arc.id;autoSaveProject();return arc;}",
        "function addArcFromLocs(start,end){if(isParallelActive()){const s=Object.assign({pane:start.pane!=null?+start.pane:stateBundle.activePane},start);const e=Object.assign({pane:end.pane!=null?+end.pane:stateBundle.activePane},end);return addArcFromLocsParallel(s,e);}ensureArcs();if(!locOK(start)||!locOK(end))return null;if(sameLoc(start,end)){updateArcStatus('Drag to a different word to create an arc.');return null;}let arc={id:nextArcId(),start:cloneLoc(start),end:cloneLoc(end),color:arcColorValue(),label:arcLabelValue()};state.arcs.push(arc);state.activeArcId=arc.id;autoSaveProject();return arc;}",
    ),
    (
        "function deleteSelectedArc(id){ensureArcs();let target=id||state.activeArcId;if(!target){alert('Select an arc in the Arc connectors list first.');return;}state.arcs=state.arcs.filter(a=>a.id!==target);if(state.activeArcId===target)state.activeArcId=null;autoSaveProject();render();}",
        "function deleteSelectedArc(id){if(isParallelActive()&&String(id||state.activeArcId||'').startsWith('crossarc-')){deleteSelectedArcParallel(id);return;}ensureArcs();let target=id||state.activeArcId;if(!target){alert('Select an arc in the Arc connectors list first.');return;}state.arcs=state.arcs.filter(a=>a.id!==target);if(state.activeArcId===target)state.activeArcId=null;autoSaveProject();render();}",
    ),
    (
        "function renderArcOverlay(){ensureArcs();let svg=document.getElementById('arcSvg'),wrap=document.getElementById('editorWrap'),ed=document.getElementById('editor');if(!svg||!wrap||!ed)return;svg.innerHTML='';renderArcManager();",
        "function renderArcOverlay(){if(isParallelActive()){renderParallelArcOverlays();renderCrossArcOverlay();renderArcManagerParallel();return;}ensureArcs();let svg=document.getElementById('arcSvg'),wrap=document.getElementById('editorWrap'),ed=document.getElementById('editor');if(!svg||!wrap||!ed)return;svg.innerHTML='';renderArcManager();",
    ),
    (
        "function nearestWordLocFromPoint(x,y){let fromPoint=(document.elementsFromPoint?document.elementsFromPoint(x,y):[]).find(el=>el.classList&&el.classList.contains('word'));if(fromPoint)return locFromWordEl(fromPoint);let words=[...document.querySelectorAll('#editor .word')];",
        "function nearestWordLocFromPoint(x,y){if(isParallelActive())return nearestWordLocFromPointParallel(x,y);let fromPoint=(document.elementsFromPoint?document.elementsFromPoint(x,y):[]).find(el=>el.classList&&el.classList.contains('word'));if(fromPoint)return locFromWordEl(fromPoint);let words=[...document.querySelectorAll('#editor .word')];",
    ),
    (
        "function setArcStart(){if(!locOK(state.selected)){alert('Select the word where the arc should begin.');return;}arcAnchorStart=cloneLoc(state.selected);updateArcStatus('Arc start set. Select the ending word, then click Set Arc End.');}",
        "function setArcStart(){if(!locOK(state.selected)){alert('Select the word where the arc should begin.');return;}arcAnchorStart=isParallelActive()?cloneLocWithPane(Object.assign({pane:stateBundle.activePane},state.selected)):cloneLoc(state.selected);updateArcStatus('Arc start set. Select the ending word, then click Set Arc End.');}",
    ),
    (
        "function setArcEnd(){if(!locOK(arcAnchorStart)){setArcStart();return;}if(!locOK(state.selected)){alert('Select the word where the arc should end.');return;}let arc=addArcFromLocs(arcAnchorStart,state.selected);arcAnchorStart=null;if(arc)updateArcStatus('Arc connector added.');render();}",
        "function setArcEnd(){if(!arcAnchorStart){setArcStart();return;}if(!locOK(state.selected)){alert('Select the word where the arc should end.');return;}const end=isParallelActive()?Object.assign({pane:stateBundle.activePane},state.selected):state.selected;let arc=addArcFromLocs(arcAnchorStart,end);arcAnchorStart=null;if(arc)updateArcStatus(arc.start&&arc.start.pane!=null&&arc.end&&arc.end.pane!=null&&arc.start.pane!==arc.end.pane?'Cross-pane arc added.':'Arc connector added.');render();}",
    ),
    (
        "function projectPayload(){return {app:'Hebrew Contour Table App',version:'1.3.7',savedAt:new Date().toISOString(),state:state,generatedRefs:generatedRefs};}",
        "function projectPayload(){return projectPayloadParallel();}",
    ),
    (
        "function restoreProjectPayload(payload){\n  try{\n    let data=(payload&&payload.state)?payload:{state:payload};\n    if(!data.state||!Array.isArray(data.state.verses))throw new Error('Missing project state');\n    state=data.state;\n    generatedRefs=Array.isArray(data.generatedRefs)?data.generatedRefs:[];\n    if(!state.columns)state.columns=[];\n    if(!Array.isArray(state.arcs))state.arcs=[];\n    state.activeArcId=null;\n    state.selected=null;\n    if(document.getElementById('textSource')){document.getElementById('textSource').value=state.language==='greek'?'greek':'hebrew';setupBooks();}\n    if(document.getElementById('pasteBox')){const pb=document.getElementById('pasteBox');pb.dir=state.language==='greek'?'ltr':'rtl';pb.classList.remove('heb','greek');pb.classList.add(state.language==='greek'?'greek':'heb');}\n    render();\n    updateSaveStatus('Project loaded.');\n    return true;\n  }catch(e){alert('Could not load that project file/save.');return false;}\n}",
        "function restoreProjectPayload(payload){\n  try{\n    let data=(payload&&payload.state)?payload:{state:payload};\n    if(data.state&&Array.isArray(data.state.verses)&&!data.state.panes){data={state:data.state,generatedRefs:data.generatedRefs||payload.generatedRefs};}\n    applyProjectPayloadParallel(data);\n    render();\n    updateSaveStatus('Project loaded.');\n    return true;\n  }catch(e){alert('Could not load that project file/save.');return false;}\n}",
    ),
    (
        "function exportContourDocx(){\n  if(!state.verses.length){alert('Create or generate text first.');return;}",
        "function exportContourDocx(){\n  if(isParallelActive()){exportContourDocxParallel();return;}\n  if(!state.verses.length){alert('Create or generate text first.');return;}",
    ),
    (
        "function exportContourPdf(){\n  if(!state.verses.length){alert('Create or generate text first.');return;}",
        "function exportContourPdf(){\n  if(isParallelActive()){exportContourPdfParallel();return;}\n  if(!state.verses.length){alert('Create or generate text first.');return;}",
    ),
    (
        "function freshProjectState(){return {ref:'',verses:[],selected:null,columns:[],language:'hebrew',legend:[],inclusios:[],comments:[],activeCommentId:null,arcs:[],activeArcId:null};}",
        "function freshProjectState(){return {ref:'',verses:[],selected:null,columns:[],language:'hebrew',legend:[],inclusios:[],comments:[],activeCommentId:null,arcs:[],activeArcId:null};}\nfunction freshProjectBundle(){return {parallelEnabled:false,activePane:0,crossArcs:[],generatedRefsByPane:[[],[]],panes:[freshProjectState(),freshProjectState()]};}",
    ),
]

CONTOUR_TAB_OLD = """      <div class="row" style="margin-bottom:10px">
        <button class="btn good" id="contourDocxExport">Export Contour to Word</button>
        <button class="btn good" id="contourPdfExport">Export Contour to PDF</button>
        <button class="btn" id="showCommentsPanel">💬 Show Comments</button>
      </div>
      <div class="contour-with-comments">
        <div id="editorWrap" class="editor-arc-wrap"><svg id="arcSvg" aria-hidden="true"></svg><div id="editor"></div></div>
        <aside id="commentsPanel" class="comments-panel"></aside>
      </div>"""

CONTOUR_TAB_NEW = PARALLEL_HTML + """      <div class="row" style="margin-bottom:10px">
        <button class="btn good" id="contourDocxExport">Export Contour to Word</button>
        <button class="btn good" id="contourPdfExport">Export Contour to PDF</button>
        <button class="btn" id="showCommentsPanel">💬 Show Comments</button>
      </div>
      <div class="contour-with-comments">
        <div id="editorWrap" class="editor-arc-wrap"><svg id="arcSvg" aria-hidden="true"></svg><div id="editor"></div></div>
        <aside id="commentsPanel" class="comments-panel"></aside>
      </div>
      </div>"""

HELP_OLD = "The app opens with a blank table. Use Generate text, Paste text, or Load sample to load a passage. Table edits autosave during your session; use Project → Save Project to keep work after refresh."
HELP_NEW = "The app opens with a blank table. Use Generate text, Paste text, or Load sample to load a passage. Enable <strong>Parallel passages</strong> (desktop) for side-by-side comparison with verse alignment and cross-pane arcs. Table edits autosave; use Project → Save Project to keep work after refresh."


def verify(html: str) -> None:
    size = len(html.encode("utf-8"))
    if size < 15_000_000:
        raise SystemExit(f"index.html too small after patch ({size} bytes) — aborting to avoid corruption")
    for needle in ("exportContourDocx", "parallelCompareWrap", "WLC_TEXT", "function renderEditor"):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    original_size = len(html.encode("utf-8"))

    if "parallelCompareWrap" in html:
        print("Parallel passages already applied.")
        return

    snippet = SNIPPET.read_text(encoding="utf-8").strip()

    if CONTOUR_TAB_OLD not in html:
        raise SystemExit("Could not find contour tab HTML anchor")

    html = html.replace(CONTOUR_TAB_OLD, CONTOUR_TAB_NEW, 1)

    css_anchor = "/* 1.3.7 Word-style comments panel */"
    if css_anchor not in html:
        raise SystemExit("Could not find CSS anchor")
    html = html.replace(css_anchor, CSS + "\n" + css_anchor, 1)

    if "exportScopeModal" not in html:
        html = html.replace(
            '<div class="modal" id="feedbackModal"',
            EXPORT_MODAL + '\n<div class="modal" id="feedbackModal"',
            1,
        )

    insert_after = "let state={ref:'',verses:[],selected:null,columns:[],language:'hebrew',legend:[],inclusios:[],comments:[],activeCommentId:null,arcs:[],activeArcId:null};"
    if insert_after not in html:
        raise SystemExit("Could not find state declaration")
    html = html.replace(insert_after, insert_after + "\n" + snippet + "\n", 1)

    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Replacement anchor not found: {old[:80]}...")
        html = html.replace(old, new, 1)

    html = html.replace(
        "function startApp(){\n  if(appStarted)return;\n  appStarted=true;\n  autosaveReady=false;\n  render();",
        "function startApp(){\n  if(appStarted)return;\n  appStarted=true;\n  autosaveReady=false;\n  initParallelMode();\n  render();",
        1,
    )

    if HELP_OLD in html:
        html = html.replace(HELP_OLD, HELP_NEW, 1)

    table_docx_old = "document.getElementById('docxExport').onclick=()=>{let files="
    table_docx_new = "document.getElementById('docxExport').onclick=()=>{if(isParallelActive()){exportTableDocxParallel();return;}let files="
    if table_docx_old in html:
        html = html.replace(table_docx_old, table_docx_new, 1)

    html = html.replace(
        "document.getElementById('tablePdfExport').onclick=exportTablePdf;",
        "document.getElementById('tablePdfExport').onclick=()=>{if(isParallelActive()){exportTablePdfParallel();return;}exportTablePdf();};",
        1,
    )

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    new_size = len(html.encode("utf-8"))
    print(f"Applied parallel passages to index.html ({original_size} -> {new_size} bytes)")


if __name__ == "__main__":
    main()
