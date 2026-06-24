#!/usr/bin/env python3
"""Parallel pane verse/clause trim: remove whole verses or sections per pane."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-verse-trim-v1 */"

CSS_BLOCK = """
/* parallel-verse-trim-v1 */
.parallel-verse-remove{font:inherit;font-size:14px;line-height:1;padding:0 6px;border:1px solid #d4a5a5;border-radius:3px;background:#fff;color:#a33;cursor:pointer;margin-left:auto;flex-shrink:0;}
.parallel-verse-remove:hover{background:#fde8e8;border-color:#c77;}
body.dark-mode .parallel-verse-remove{background:#17212b;border-color:#6a3a3a;color:#f5a5a5;}
body.dark-mode .parallel-verse-remove:hover{background:#2a1a1a;}
"""

TRIM_FUNCTIONS = r"""function remapPaneLocAfterVerseRemoval(l,removedVi){if(!l||l.v==null)return null;if(l.v===removedVi)return null;if(l.v>removedVi)return{v:l.v-1,c:l.c,w:l.w};return{v:l.v,c:l.c,w:l.w};}function remapPaneLocAfterClauseRemoval(l,vi,removedCi){if(!l||l.v==null)return null;if(l.v!==vi)return{v:l.v,c:l.c,w:l.w};if(l.c===removedCi)return null;if(l.c>removedCi)return{v:vi,c:l.c-1,w:l.w};return{v:vi,c:l.c,w:l.w};}function remapPaneStateLocs(st,remapFn){if(Array.isArray(st.comments))st.comments=st.comments.map(cm=>{const start=remapFn(cm.start),end=remapFn(cm.end);if(!start||!end)return null;return Object.assign({},cm,{start,end});}).filter(Boolean);if(Array.isArray(st.arcs))st.arcs=st.arcs.map(arc=>{const start=remapFn(arc.start),end=remapFn(arc.end);if(!start||!end)return null;return Object.assign({},arc,{start,end});}).filter(Boolean);if(Array.isArray(st.inclusios))st.inclusios=st.inclusios.map(inc=>{const start=remapFn(inc.start),end=remapFn(inc.end);if(!start||!end)return null;return Object.assign({},inc,{start,end});}).filter(Boolean);if(st.selected){const sel=remapFn(st.selected);st.selected=sel||null;}if(st.activeCommentId&&(!st.comments||!st.comments.some(c=>c.id===st.activeCommentId)))st.activeCommentId=null;if(st.activeArcId&&(!st.arcs||!st.arcs.some(a=>a.id===st.activeArcId)))st.activeArcId=null;}function adjustVersePairsAfterVerseRemoval(pane,removedVi){const key=pane===0?'leftVi':'rightVi';const pairs=materializeVersePairs();pairs.forEach(p=>{const vi=p[key];if(vi===removedVi)p[key]=null;else if(vi!=null&&vi>removedVi)p[key]=vi-1;});stateBundle.verseAlignPairs=pairs;}function pruneCrossArcsForPane(pane){ensureCrossArcs();stateBundle.crossArcs=stateBundle.crossArcs.filter(arc=>{const sp=arc.start.pane!=null?+arc.start.pane:0;const ep=arc.end.pane!=null?+arc.end.pane:1;if(sp===pane&&!locOKInPane(arc.start,pane))return false;if(ep===pane&&!locOKInPane(arc.end,pane))return false;return true;});}function removeVerseFromPane(pane,vi,skipConfirm){ensureStateBundle();const st=stateBundle.panes[pane];if(!st||!st.verses[vi])return;const ref=st.verses[vi].ref||'this verse';if(!skipConfirm&&!confirm('Remove '+ref+' from '+paneLabel(pane)+'? Annotations on this verse will be removed.'))return;const remap=l=>remapPaneLocAfterVerseRemoval(l,vi);remapPaneStateLocs(st,remap);st.verses.splice(vi,1);if(Array.isArray(stateBundle.generatedRefsByPane[pane]))stateBundle.generatedRefsByPane[pane].splice(vi,1);adjustVersePairsAfterVerseRemoval(pane,vi);pruneCrossArcsForPane(pane);if(versePairPick&&versePairPick.pane===pane&&versePairPick.vi===vi)versePairPick=null;else if(versePairPick&&versePairPick.pane===pane&&versePairPick.vi>vi)versePairPick.vi--;if(stateBundle.activePane===pane){state=st;if(typeof applyInclusioBrackets==='function')applyInclusioBrackets(false);}if(autosaveReady)autoSaveProject();updateSaveStatus('Removed '+ref+' from '+paneLabel(pane)+'. Reload the passage to restore it.');render();}function removeClauseFromPane(pane,v,ci){ensureStateBundle();const st=stateBundle.panes[pane];if(!st||!st.verses[v]||!st.verses[v].clauses[ci])return;const verse=st.verses[v];if(verse.clauses.length===1){removeVerseFromPane(pane,v,true);return;}const remap=l=>remapPaneLocAfterClauseRemoval(l,v,ci);remapPaneStateLocs(st,remap);verse.clauses.splice(ci,1);pruneCrossArcsForPane(pane);if(stateBundle.activePane===pane){state=st;if(typeof applyInclusioBrackets==='function')applyInclusioBrackets(false);}if(autosaveReady)autoSaveProject();updateSaveStatus('Removed section from '+verse.ref+'.');render();}function removeClauseFromActivePane(){if(!state.selected||!locOK(state.selected))return;removeClauseFromPane(stateBundle.activePane,state.selected.v,state.selected.c);}"""

CLEAR_ANCHOR = "function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}"
CLEAR_WITH_TRIM = CLEAR_ANCHOR + TRIM_FUNCTIONS

RENDER_OLD = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr"><span class="muted parallel-verse-ref '
    'parallel-verse-pick${picked?" parallel-verse-picked":""}" data-pane="${pane}" data-vi="${vi}" '
    'title="Click two verse labels to pair one row">${esc(v.ref)}</span></div>`;'
)

RENDER_NEW = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr"><span class="muted parallel-verse-ref '
    'parallel-verse-pick${picked?" parallel-verse-picked":""}" data-pane="${pane}" data-vi="${vi}" '
    'title="Click two verse labels to pair one row">${esc(v.ref)}</span>'
    '<button type="button" class="parallel-verse-remove" data-pane="${pane}" data-vi="${vi}" '
    'title="Remove this verse from this pane">×</button></div>`;'
)

ATTACH_OLD = (
    "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-verse-pick').forEach(el=>{"
)

ATTACH_NEW = (
    "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-verse-remove').forEach(btn=>{"
    "btn.onclick=(ev)=>{ev.stopPropagation();removeVerseFromPane(+btn.dataset.pane,+btn.dataset.vi);};});"
    "root.querySelectorAll('.parallel-verse-pick').forEach(el=>{"
)

STATUS_OLD = (
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move it (Alt+↑ / Alt+↓). "
    "Click two verse labels to pair one row.';if(off>0)msg+=' "
    '<button type="button" class="linkish-btn" id="resetVerseAlignLink">Reset</button>\';'
    "el.innerHTML=msg;const reset=document.getElementById('resetVerseAlignLink');"
    "if(reset)reset.onclick=(e)=>{e.preventDefault();resetVersePairsToIndex();render();};"
)

STATUS_NEW = (
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move it (Alt+↑ / Alt+↓). "
    "Click two verse labels to pair one row.';if(off>0)msg+=' "
    '<button type="button" class="linkish-btn" id="resetVerseAlignLink">Reset</button>\';'
    "if(state.selected&&locOK(state.selected)&&stateBundle.activePane!=null)"
    "msg+=' <button type=\"button\" class=\"linkish-btn\" id=\"removeClauseSectionBtn\">Remove this section</button>';"
    "el.innerHTML=msg;const reset=document.getElementById('resetVerseAlignLink');"
    "if(reset)reset.onclick=(e)=>{e.preventDefault();resetVersePairsToIndex();render();};"
    "const trimBtn=document.getElementById('removeClauseSectionBtn');"
    "if(trimBtn)trimBtn.onclick=(e)=>{e.preventDefault();removeClauseFromActivePane();};"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "removeVerseFromPane",
        "removeClauseFromPane",
        "parallel-verse-remove",
        "removeClauseSectionBtn",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel verse trim v1 already applied.")
        return

    if "parallel-align-simplify-v3" not in html:
        raise SystemExit("Run apply_parallel_align_simplify.py first")

    css_anchor = "/* parallel-align-simplify-v3 */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-align-simplify-v3 CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if CLEAR_ANCHOR not in html:
        raise SystemExit("Could not find clearVerseAlignState anchor")
    html = html.replace(CLEAR_ANCHOR, CLEAR_WITH_TRIM, 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find renderVerseBlock ref-bar anchor")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    if ATTACH_OLD not in html:
        raise SystemExit("Could not find attachParallelAlignHandlers anchor")
    html = html.replace(ATTACH_OLD, ATTACH_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus anchor")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel verse trim v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
