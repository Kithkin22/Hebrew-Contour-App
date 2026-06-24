#!/usr/bin/env python3
"""Parallel passage verse alignment: match by ref, manual pair, row gaps."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-verse-align */"

CSS_BLOCK = """
/* parallel-verse-align */
.parallel-verse-row{position:relative;}
.parallel-row-controls{position:absolute;left:50%;top:2px;transform:translateX(-50%);z-index:4;display:flex;gap:3px;opacity:0.4;pointer-events:auto;}
.parallel-verse-row:hover .parallel-row-controls,.parallel-verse-row:focus-within .parallel-row-controls{opacity:1;}
.parallel-row-btn{font:inherit;font-size:10px;padding:1px 5px;line-height:1.2;border:1px solid #c8daf0;border-radius:4px;background:#fff;color:#1f2d3d;cursor:pointer;}
.parallel-row-btn:hover{background:#eef5fc;border-color:#8ec5ff;}
.parallel-verse-ref.parallel-verse-pick{cursor:pointer;border-radius:3px;padding:1px 4px;display:inline-block;}
.parallel-verse-ref.parallel-verse-pick:hover{background:#eef5fc;}
.parallel-verse-ref.parallel-verse-picked{background:#fff3cd;outline:1px solid #e6c200;}
#parallelAlignHint{font-size:12px;}
body.dark-mode .parallel-row-btn{background:#17212b;border-color:#314253;color:#e8eef5;}
"""

HTML_OLD = """        <button type="button" class="btn" id="realignVersesBtn">Re-align verses</button>
        <span class="muted small">Desktop side-by-side. Click a pane header or any word to choose which passage receives Generate / Paste.</span>"""

HTML_NEW = """        <button type="button" class="btn" id="realignVersesBtn" title="Line up rows by chapter:verse number (e.g. Job 3:4 with Psalm 3:4). Hover a row for +L/+R gap controls; click verse labels in each column to pair manually.">Match by verse number</button>
        <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st verse with 1st verse, etc.)">Reset alignment</button>
        <span class="muted small" id="parallelAlignHint">Desktop side-by-side. Click a pane header or word to choose Generate / Paste target. <strong>Match by verse number</strong> aligns rows; click verse labels (e.g. Job 3:4) in each column to pair manually; hover a row for <strong>+L</strong> / <strong>+R</strong> gap controls.</span>"""

REPLACEMENTS = [
    (
        "let stateBundle={parallelEnabled:false,activePane:0,crossArcs:[],generatedRefsByPane:[[],[]],panes:[null,null]};",
        "let stateBundle={parallelEnabled:false,activePane:0,crossArcs:[],verseAlignPairs:null,generatedRefsByPane:[[],[]],panes:[null,null]};let versePairPick=null;",
    ),
    (
        "function computeVersePairs(){const left=stateBundle.panes[0].verses||[];const right=stateBundle.panes[1].verses||[];const n=Math.max(left.length,right.length,0);const pairs=[];for(let i=0;i<n;i++)pairs.push({leftVi:i<left.length?i:null,rightVi:i<right.length?i:null});return pairs;}",
        "function verseRefKey(ref,fallbackIdx){const s=String(ref||'').trim();let m=s.match(/(\\d+)\\s*:\\s*(\\d+)/);if(m)return+m[1]*1000+(+m[2]);m=s.match(/(\\d+)\\s*$/);if(m)return+m[1];return fallbackIdx!=null?fallbackIdx:0;}function defaultVersePairs(){const left=stateBundle.panes[0].verses||[];const right=stateBundle.panes[1].verses||[];const n=Math.max(left.length,right.length,0);const pairs=[];for(let i=0;i<n;i++)pairs.push({leftVi:i<left.length?i:null,rightVi:i<right.length?i:null});return pairs;}function sanitizeVersePairs(pairs){const leftN=(stateBundle.panes[0].verses||[]).length;const rightN=(stateBundle.panes[1].verses||[]).length;if(!Array.isArray(pairs))return defaultVersePairs();return pairs.map(p=>({leftVi:p.leftVi!=null&&p.leftVi>=0&&p.leftVi<leftN?p.leftVi:null,rightVi:p.rightVi!=null&&p.rightVi>=0&&p.rightVi<rightN?p.rightVi:null}));}function materializeVersePairs(){if(!stateBundle.verseAlignPairs)stateBundle.verseAlignPairs=defaultVersePairs();else stateBundle.verseAlignPairs=sanitizeVersePairs(stateBundle.verseAlignPairs);return stateBundle.verseAlignPairs;}function computeVersePairs(){if(!stateBundle.verseAlignPairs)return defaultVersePairs();return sanitizeVersePairs(stateBundle.verseAlignPairs);}function autoAlignVersePairsByRef(){ensureStateBundle();const left=stateBundle.panes[0].verses||[];const right=stateBundle.panes[1].verses||[];let li=0,ri=0;const pairs=[];while(li<left.length||ri<right.length){const lk=li<left.length?verseRefKey(left[li].ref,li):Infinity;const rk=ri<right.length?verseRefKey(right[ri].ref,ri):Infinity;if(li>=left.length){pairs.push({leftVi:null,rightVi:ri++});continue;}if(ri>=right.length){pairs.push({leftVi:li++,rightVi:null});continue;}if(lk===rk){pairs.push({leftVi:li++,rightVi:ri++});}else if(lk<rk){pairs.push({leftVi:li++,rightVi:null});}else{pairs.push({leftVi:null,rightVi:ri++});}}stateBundle.verseAlignPairs=pairs;versePairPick=null;if(autosaveReady)autoSaveProject();}function resetVersePairsToIndex(){stateBundle.verseAlignPairs=null;versePairPick=null;if(autosaveReady)autoSaveProject();}function findVersePairRow(pane,vi){const pairs=materializeVersePairs();const key=pane===0?'leftVi':'rightVi';for(let i=0;i<pairs.length;i++)if(pairs[i][key]===vi)return i;return-1;}function pairVersesOnRow(paneA,viA,paneB,viB){const pairs=materializeVersePairs();const rowA=findVersePairRow(paneA,viA);const rowB=findVersePairRow(paneB,viB);if(rowA<0||rowB<0)return;const kB=paneB===0?'leftVi':'rightVi';if(rowA===rowB)return;pairs[rowA][kB]=viB;pairs[rowB][kB]=null;if(autosaveReady)autoSaveProject();}function skipVerseToNextRow(row,pane){const pairs=materializeVersePairs();if(row<0||row>=pairs.length)return;const key=pane===0?'leftVi':'rightVi';const vi=pairs[row][key];if(vi==null)return;pairs[row][key]=null;pairs.splice(row+1,0,{leftVi:pane===0?vi:null,rightVi:pane===1?vi:null});if(autosaveReady)autoSaveProject();}function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}",
    ),
    (
        'let html=`<div class="muted parallel-verse-ref" dir="ltr">${esc(v.ref)}</div>`;',
        'const picked=versePairPick&&versePairPick.pane===pane&&versePairPick.vi===vi;let html=`<div class="muted parallel-verse-ref parallel-verse-pick${picked?" parallel-verse-picked":""}" dir="ltr" data-pane="${pane}" data-vi="${vi}" title="Click to pair with a verse in the other column">${esc(v.ref)}</div>`;',
    ),
    (
        'html+=`<div class="parallel-verse-row" data-row="${ri}">`;',
        'html+=`<div class="parallel-verse-row" data-row="${ri}"><div class="parallel-row-controls"><button type="button" class="parallel-row-btn" data-row="${ri}" data-gap="0" title="Push this left verse down one row (+L gap)">+L</button><button type="button" class="parallel-row-btn" data-row="${ri}" data-gap="1" title="Push this right verse down one row (+R gap)">+R</button></div>`;',
    ),
    (
        "rowsEl.innerHTML=html;attachParallelWordHandlers(rowsEl);requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();renderCrossArcOverlay();updateParallelModeUI();});",
        "rowsEl.innerHTML=html;attachParallelWordHandlers(rowsEl);attachParallelAlignHandlers(rowsEl);requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();renderCrossArcOverlay();updateParallelModeUI();});",
    ),
    (
        "function attachParallelWordHandlers(root){root.querySelectorAll('.word').forEach(el=>{el.onclick=(ev)=>{const pane=+el.dataset.pane;bindActivePane(pane);const clicked={v:+el.dataset.v,c:+el.dataset.c,w:+el.dataset.w};if(ev.shiftKey&&locOK(state.selected)){applyBracketRange(state.selected,clicked);return;}state.selected=clicked;renderParallelEditors();};});root.querySelectorAll('.clause').forEach(el=>{el.onclick=(ev)=>{if(ev.target.classList.contains('word'))return;bindActivePane(+el.dataset.pane);state.selected={v:+el.dataset.v,c:+el.dataset.c,w:0};renderParallelEditors();};});}",
        "function attachParallelWordHandlers(root){root.querySelectorAll('.word').forEach(el=>{el.onclick=(ev)=>{const pane=+el.dataset.pane;bindActivePane(pane);const clicked={v:+el.dataset.v,c:+el.dataset.c,w:+el.dataset.w};if(ev.shiftKey&&locOK(state.selected)){applyBracketRange(state.selected,clicked);return;}state.selected=clicked;renderParallelEditors();};});root.querySelectorAll('.clause').forEach(el=>{el.onclick=(ev)=>{if(ev.target.classList.contains('word'))return;bindActivePane(+el.dataset.pane);state.selected={v:+el.dataset.v,c:+el.dataset.c,w:0};renderParallelEditors();};});}function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-row-btn').forEach(btn=>{btn.onclick=(ev)=>{ev.stopPropagation();skipVerseToNextRow(+btn.dataset.row,+btn.dataset.gap);render();};});root.querySelectorAll('.parallel-verse-pick').forEach(el=>{el.onclick=(ev)=>{ev.stopPropagation();const pane=+el.dataset.pane,vi=+el.dataset.vi;if(!versePairPick){versePairPick={pane,vi};renderParallelEditors();return;}if(versePairPick.pane===pane){versePairPick={pane,vi};renderParallelEditors();return;}pairVersesOnRow(versePairPick.pane,versePairPick.vi,pane,vi);versePairPick=null;render();};});}",
    ),
    (
        "const realign=document.getElementById('realignVersesBtn');if(realign)realign.onclick=()=>{renderParallelEditors();};",
        "const realign=document.getElementById('realignVersesBtn');if(realign)realign.onclick=()=>{autoAlignVersePairsByRef();render();};const resetAlign=document.getElementById('resetVerseAlignBtn');if(resetAlign)resetAlign.onclick=()=>{resetVersePairsToIndex();render();};",
    ),
    (
        "function normalizeProjectState(st){ensureStateBundle();if(st&&Array.isArray(st.panes)&&st.panes.length>=2){return {parallelEnabled:!!st.parallelEnabled,activePane:st.activePane===1?1:0,crossArcs:Array.isArray(st.crossArcs)?st.crossArcs:[],panes:[Object.assign(freshPaneState(),st.panes[0]||{}),Object.assign(freshPaneState(),st.panes[1]||{})]};}",
        "function normalizeProjectState(st){ensureStateBundle();if(st&&Array.isArray(st.panes)&&st.panes.length>=2){return {parallelEnabled:!!st.parallelEnabled,activePane:st.activePane===1?1:0,crossArcs:Array.isArray(st.crossArcs)?st.crossArcs:[],verseAlignPairs:Array.isArray(st.verseAlignPairs)?st.verseAlignPairs:null,panes:[Object.assign(freshPaneState(),st.panes[0]||{}),Object.assign(freshPaneState(),st.panes[1]||{})]};}",
    ),
    (
        "function resetParallelProjectState(){stateBundle={parallelEnabled:false,activePane:0,crossArcs:[],generatedRefsByPane:[[],[]],panes:[freshProjectState(),freshProjectState()]};state=stateBundle.panes[0];generatedRefs=[];const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=false;}",
        "function resetParallelProjectState(){stateBundle={parallelEnabled:false,activePane:0,crossArcs:[],verseAlignPairs:null,generatedRefsByPane:[[],[]],panes:[freshProjectState(),freshProjectState()]};versePairPick=null;state=stateBundle.panes[0];generatedRefs=[];const toggle=document.getElementById('parallelModeToggle');if(toggle)toggle.checked=false;}",
    ),
    (
        "state:{parallelEnabled:stateBundle.parallelEnabled,activePane:stateBundle.activePane,crossArcs:stateBundle.crossArcs,panes:stateBundle.panes}",
        "state:{parallelEnabled:stateBundle.parallelEnabled,activePane:stateBundle.activePane,crossArcs:stateBundle.crossArcs,verseAlignPairs:stateBundle.verseAlignPairs,panes:stateBundle.panes}",
    ),
    (
        "stateBundle.crossArcs=normalized.crossArcs;stateBundle.panes=normalized.panes;",
        "stateBundle.crossArcs=normalized.crossArcs;stateBundle.verseAlignPairs=normalized.verseAlignPairs||null;versePairPick=null;stateBundle.panes=normalized.panes;",
    ),
    (
        "function freshProjectBundle(){return {parallelEnabled:false,activePane:0,crossArcs:[],generatedRefsByPane:[[],[]],panes:[freshPaneState(),freshPaneState()]};}",
        "function freshProjectBundle(){return {parallelEnabled:false,activePane:0,crossArcs:[],verseAlignPairs:null,generatedRefsByPane:[[],[]],panes:[freshPaneState(),freshPaneState()]};}",
    ),
    (
        "stateBundle.panes[pi]=extracted.pane;stateBundle.generatedRefsByPane[pi]=extracted.generatedRefs;",
        "stateBundle.panes[pi]=extracted.pane;stateBundle.generatedRefsByPane[pi]=extracted.generatedRefs;clearVerseAlignState();",
    ),
    (
        "state.verses=lines.map((line,i)=>({ref:(generatedRefs[i]|| (ref?ref+(text.includes('\\n')?' line '+(i+1):''):'Line '+(i+1))),clauses:[{indent:0,words:line.trim().split(/\\s+/).filter(Boolean).map(w=>({text:w,deleted:false,specials:[],note:'',translation:'',color:''})),ann:{}}]})).filter(v=>v.clauses[0].words.length);state.selected=null;render();",
        "state.verses=lines.map((line,i)=>({ref:(generatedRefs[i]|| (ref?ref+(text.includes('\\n')?' line '+(i+1):''):'Line '+(i+1))),clauses:[{indent:0,words:line.trim().split(/\\s+/).filter(Boolean).map(w=>({text:w,deleted:false,specials:[],note:'',translation:'',color:''})),ann:{}}]})).filter(v=>v.clauses[0].words.length);state.selected=null;if(stateBundle&&stateBundle.parallelEnabled)clearVerseAlignState();render();",
    ),
]


def verify(html: str) -> None:
    size = len(html.encode("utf-8"))
    if size < 15_000_000:
        raise SystemExit(f"index.html too small after patch ({size} bytes)")
    for needle in (
        MARKER,
        "autoAlignVersePairsByRef",
        "resetVerseAlignBtn",
        "attachParallelAlignHandlers",
        "verseAlignPairs",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel verse align already applied.")
        return

    if "computeVersePairs" not in html:
        raise SystemExit("Parallel passages not found — run apply_parallel_passages.py first")

    css_anchor = "/* parallel-pane-load */"
    if css_anchor not in html:
        css_anchor = "/* Parallel passages (desktop) */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel CSS anchor")
    html = html.replace(css_anchor, MARKER + "\n" + CSS_BLOCK + css_anchor, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel mode bar HTML anchor")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Could not find replacement anchor:\n{old[:120]}...")
        html = html.replace(old, new, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel verse align ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
