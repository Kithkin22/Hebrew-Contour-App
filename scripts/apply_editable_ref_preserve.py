#!/usr/bin/env python3
"""Editable parallel pane reference + preserve annotations when range changes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* editable-ref-preserve-v1 */"

CSS_BLOCK = """
/* editable-ref-preserve-v1 */
.parallel-pane-ref-input{width:100%;box-sizing:border-box;font:inherit;font-weight:700;font-size:14px;text-align:center;border:2px solid #d8dee6;border-radius:8px;background:#fafafa;padding:8px 10px;cursor:text;}
.parallel-pane-ref-input.parallel-pane-active,.parallel-pane-cell:focus-within .parallel-pane-ref-input{border-color:#2b67a5;background:#eef5fc;box-shadow:0 0 0 1px #2b67a5 inset;}
body.dark-mode .parallel-pane-ref-input{background:#1a2332;border-color:#3d4f63;color:#e8eef5;}
"""

HTML_OLD = """            <div class="parallel-pane-head" data-pane="0" id="parallelPaneHead0">Left passage</div>
            <select class="parallel-pane-load" data-pane="0" id="parallelPaneLoad0" aria-label="Load saved project into left pane"><option value="">Load saved project…</option></select>
          </div>
          <div class="parallel-pane-cell" data-pane="1">
            <div class="parallel-pane-head" data-pane="1" id="parallelPaneHead1">Right passage</div>"""

HTML_NEW = """            <input type="text" class="parallel-pane-head parallel-pane-ref-input" data-pane="0" id="parallelPaneRef0" id="parallelPaneHead0" aria-label="Reference for left passage" title="Edit reference and press Enter to reload (annotations kept on matching verses)" placeholder="Left passage">
            <select class="parallel-pane-load" data-pane="0" id="parallelPaneLoad0" aria-label="Load saved project into left pane"><option value="">Load saved project…</option></select>
          </div>
          <div class="parallel-pane-cell" data-pane="1">
            <input type="text" class="parallel-pane-head parallel-pane-ref-input" data-pane="1" id="parallelPaneRef1" aria-label="Reference for right passage" title="Edit reference and press Enter to reload (annotations kept on matching verses)" placeholder="Right passage">"""

# fix duplicate id in HTML_NEW - remove id="parallelPaneHead0" duplicate
HTML_NEW = HTML_NEW.replace(' id="parallelPaneHead0"', '')

HELP_OLD = """        <span class="muted small" id="parallelAlignHint">Click a pane header or word to choose Generate / Paste target.</span>"""
HELP_NEW = """        <span class="muted small" id="parallelAlignHint">Edit a pane reference and press Enter to reload that passage (annotations kept on matching verses). Click a word to annotate.</span>"""

MERGE_FUNCS = r"""function copyWordAnnotations(src,dst){dst.note=src.note||'';dst.translation=src.translation||'';dst.color=src.color||'';dst.deleted=!!src.deleted;dst.specials=(src.specials||[]).slice();if(src.format)dst.format=JSON.parse(JSON.stringify(src.format));else delete dst.format;if(src.bracketStart)dst.bracketStart=src.bracketStart;else delete dst.bracketStart;if(src.bracketEnd)dst.bracketEnd=src.bracketEnd;else delete dst.bracketEnd;}
function verseRefMatchKey(ref,fallbackIdx){const s=String(ref||'').trim();let m=s.match(/(\d+)\s*:\s*(\d+)/);if(m)return m[1]+':'+m[2];if(fallbackIdx!=null)return 'i'+fallbackIdx;return s.toLowerCase();}
function findVerseIndexByRef(verses,ref){const key=verseRefMatchKey(ref);for(let i=0;i<verses.length;i++){if(verseRefMatchKey(verses[i].ref,i)===key)return i;if(String(verses[i].ref||'').trim()===String(ref||'').trim())return i;}return-1;}
function mergeVerseData(oldV,newV){if(!oldV||!newV)return;if(oldV.clauses.length===newV.clauses.length){for(let ci=0;ci<newV.clauses.length;ci++){const oc=oldV.clauses[ci],nc=newV.clauses[ci];if(!oc||!nc)continue;nc.indent=oc.indent;nc.ann=Object.assign({},oc.ann||{});const min=Math.min(oc.words.length,nc.words.length);for(let wi=0;wi<min;wi++){const ow=oc.words[wi],nw=nc.words[wi];if(ow.text===nw.text||normalizeHebrewWord(ow.text)===normalizeHebrewWord(nw.text))copyWordAnnotations(ow,nw);}}return;}const ow=oldV.clauses.flatMap(c=>c.words),nw=newV.clauses.flatMap(c=>c.words);let oi=0;for(let ni=0;ni<nw.length;ni++){const ntxt=normalizeHebrewWord(nw[ni].text);while(oi<ow.length&&normalizeHebrewWord(ow[oi].text)!==ntxt)oi++;if(oi<ow.length){copyWordAnnotations(ow[oi],nw[ni]);oi++;}}}
function remapLocByVerseRef(oldVerses,newVerses,loc){if(!loc||loc.v==null)return null;const ov=oldVerses[loc.v];if(!ov)return null;const nvIdx=findVerseIndexByRef(newVerses,ov.ref);if(nvIdx<0)return null;const ow=ov.clauses[loc.c]&&ov.clauses[loc.c].words[loc.w];if(!ow){const nc=newVerses[nvIdx].clauses[loc.c];if(nc&&nc.words[loc.w])return{v:nvIdx,c:loc.c,w:loc.w};return{v:nvIdx,c:0,w:0};}const nv=newVerses[nvIdx];for(let ci=0;ci<nv.clauses.length;ci++){const words=nv.clauses[ci].words;for(let wi=0;wi<words.length;wi++){if(words[wi].text===ow.text||normalizeHebrewWord(words[wi].text)===normalizeHebrewWord(ow.text))return{v:nvIdx,c:ci,w:wi};}}return{v:nvIdx,c:0,w:0};}
function remapPaneAnnotations(oldVerses,newVerses,panest){const r=l=>remapLocByVerseRef(oldVerses,newVerses,l);if(Array.isArray(panest.comments))panest.comments=panest.comments.map(cm=>{const s=r(cm.start),e=r(cm.end);if(!s||!e)return null;return Object.assign({},cm,{start:s,end:e});}).filter(Boolean);if(Array.isArray(panest.arcs))panest.arcs=panest.arcs.map(arc=>{const s=r(arc.start),e=r(arc.end);if(!s||!e)return null;return Object.assign({},arc,{start:s,end:e});}).filter(Boolean);if(Array.isArray(panest.inclusios))panest.inclusios=panest.inclusios.map(inc=>{const s=r(inc.start),e=r(inc.end);if(!s||!e)return null;return Object.assign({},inc,{start:s,end:e});}).filter(Boolean);if(panest.selected){const s=r(panest.selected);panest.selected=s||null;}if(panest.activeCommentId&&!panest.comments.some(c=>c.id===panest.activeCommentId))panest.activeCommentId=null;if(panest.activeArcId&&!panest.arcs.some(a=>a.id===panest.activeArcId))panest.activeArcId=null;}
async function applyPaneReferenceFromInput(pane,refStr){if(!refStr)return;const st=stateBundle.panes[pane];if(st&&st.ref===refStr)return;const parsed=parseBibleReference(refStr);if(!parsed){updateSaveStatus('Could not read that reference. Try Job 10:1-10 or Ruth 3:4-18.');return;}markUndo();bindActivePane(pane);let verses=[];try{if(parsed.source==='greek'){verses=await getSblgntText(parsed.bookId,parsed.sc,parsed.sv,parsed.ec,parsed.ev);state.language='greek';}else if(parsed.source==='hebrew-bhsa'){verses=await getBhsaText(parsed.bookId,parsed.sc,parsed.sv,parsed.ec,parsed.ev);state.language='hebrew-bhsa';}else{verses=getWlcText(parsed.bookId,parsed.sc,parsed.sv,parsed.ec,parsed.ev);state.language='hebrew';}}catch(e){updateSaveStatus('Could not load text for that reference.');return;}if(!verses.length){updateSaveStatus('No text found for that reference.');return;}const refs=verses.map(v=>parsed.bookName+' '+v.chapter+':'+v.verse);const text=verses.map(v=>v.text).join('\n');const rangeRef=parsed.bookName+' '+parsed.sc+':'+parsed.sv+((parsed.sc!==parsed.ec||parsed.sv!==parsed.ev)?'-'+parsed.ec+':'+parsed.ev:'');stateBundle.generatedRefsByPane[pane]=refs;generatedRefs=refs;parseText(text,rangeRef,true);stateBundle.panes[pane]=state;stateBundle.generatedRefsByPane[pane]=refs;if(stateBundle.activePane===pane)syncGeneratorFieldsFromActivePane();if(autosaveReady)autoSaveProject();updateSaveStatus('Updated '+paneLabel(pane)+' to '+rangeRef+' — annotations kept on matching verses.');render();}
function bindParallelPaneRefInputs(){document.querySelectorAll('.parallel-pane-ref-input').forEach(inp=>{if(inp.dataset.refBound)return;inp.dataset.refBound='1';inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}});inp.addEventListener('blur',()=>{const val=inp.value.trim();if(val)applyPaneReferenceFromInput(+inp.dataset.pane,val);});inp.addEventListener('click',e=>{e.stopPropagation();bindActivePane(+inp.dataset.pane);});});}"""

PARSE_OLD = (
    "function parseText(text,ref){state.legend=state.legend||[];state.inclusios=[];state.comments=[];"
    "state.arcs=[];state.activeArcId=null;state.activeCommentId=null;state.ref=ref||'';syncLanguageFromSource();"
    "const lines=text.split(/\\n+/);state.verses=lines.map((line,i)=>({ref:(generatedRefs[i]|| "
    "(ref?ref+(text.includes('\\n')?' line '+(i+1):''):'Line '+(i+1))),clauses:[{indent:0,words:"
    "line.trim().split(/\\s+/).filter(Boolean).map(w=>({text:w,deleted:false,specials:[],note:'',"
    "translation:'',color:''})),ann:{}}]})).filter(v=>v.clauses[0].words.length);state.selected=null;"
    "if(stateBundle&&stateBundle.parallelEnabled)clearVerseAlignState();render();}"
)

PARSE_NEW = (
    "function parseText(text,ref,preserve){const keep=preserve!==false&&state.verses&&state.verses.length;"
    "const snap=keep?{verses:JSON.parse(JSON.stringify(state.verses)),comments:JSON.parse(JSON.stringify(state.comments||[])),"
    "arcs:JSON.parse(JSON.stringify(state.arcs||[])),inclusios:JSON.parse(JSON.stringify(state.inclusios||[])),"
    "legend:state.legend}:null;state.legend=snap?snap.legend:(state.legend||[]);"
    "if(!keep){state.inclusios=[];state.comments=[];state.arcs=[];state.activeArcId=null;state.activeCommentId=null;}"
    "state.ref=ref||'';syncLanguageFromSource();const lines=text.split(/\\n+/);"
    "state.verses=lines.map((line,i)=>({ref:(generatedRefs[i]|| "
    "(ref?ref+(text.includes('\\n')?' line '+(i+1):''):'Line '+(i+1))),clauses:[{indent:0,words:"
    "line.trim().split(/\\s+/).filter(Boolean).map(w=>({text:w,deleted:false,specials:[],note:'',"
    "translation:'',color:''})),ann:{}}]})).filter(v=>v.clauses[0].words.length);"
    "if(snap){state.verses.forEach(nv=>{const oi=findVerseIndexByRef(snap.verses,nv.ref);if(oi>=0)mergeVerseData(snap.verses[oi],nv);});"
    "state.comments=snap.comments;state.arcs=snap.arcs;state.inclusios=snap.inclusios;"
    "remapPaneAnnotations(snap.verses,state.verses,state);}"
    "state.selected=null;if(stateBundle&&stateBundle.parallelEnabled){if(!keep)clearVerseAlignState();"
    "else if(stateBundle.verseAlignPairs)stateBundle.verseAlignPairs=sanitizeVersePairs(stateBundle.verseAlignPairs);}"
    "render();}"
)

RENDER_HEAD_OLD = (
    "const head=document.getElementById('parallelPaneHead'+pane);if(head){const st=stateBundle.panes[pane];"
    "head.textContent=st.ref||paneLabel(pane);head.classList.toggle('parallel-pane-active',stateBundle.activePane===pane);}"
)

RENDER_HEAD_NEW = (
    "const refIn=document.getElementById('parallelPaneRef'+pane);const head=document.getElementById('parallelPaneHead'+pane);"
    "const st=stateBundle.panes[pane];if(refIn){if(document.activeElement!==refIn)refIn.value=st.ref||'';"
    "refIn.classList.toggle('parallel-pane-active',stateBundle.activePane===pane);}"
    "else if(head){head.textContent=st.ref||paneLabel(pane);"
    "head.classList.toggle('parallel-pane-active',stateBundle.activePane===pane);}"
)

INIT_PARALLEL_OLD = (
    "function initParallelMode(){ensureStateBundle();stateBundle.panes[0]=state;"
    "stateBundle.generatedRefsByPane[0]=generatedRefs;const toggle=document.getElementById('parallelModeToggle');"
)

INIT_PARALLEL_NEW = (
    "function initParallelMode(){ensureStateBundle();stateBundle.panes[0]=state;"
    "stateBundle.generatedRefsByPane[0]=generatedRefs;bindParallelPaneRefInputs();const toggle=document.getElementById('parallelModeToggle');"
)

GENERATE_PARSE_OLD = "parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value);"
GENERATE_PARSE_NEW = "parseText(document.getElementById('pasteBox').value,document.getElementById('refBox').value,true);"

MAKE_TEXT_OLD = "parseText(cleaned,document.getElementById('refBox').value);closeTopMenus();"
MAKE_TEXT_NEW = "parseText(cleaned,document.getElementById('refBox').value,true);closeTopMenus();"

MERGE_ANCHOR = "function parseText(text,ref){"

RENDER_AFTER_OLD = (
    "attachParallelAlignHandlers(rowsEl);requestAnimationFrame(()=>{equalizeParallelRowHeights();"
)

RENDER_AFTER_NEW = (
    "attachParallelAlignHandlers(rowsEl);bindParallelPaneRefInputs();requestAnimationFrame(()=>{equalizeParallelRowHeights();"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "applyPaneReferenceFromInput",
        "mergeVerseData",
        "parallel-pane-ref-input",
        "parseText(text,ref,preserve)",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Editable ref preserve v1 already applied.")
        return

    if "parallel-verse-nudge-v1" not in html:
        raise SystemExit("Run apply_parallel_verse_nudge.py first")

    css_anchor = "/* parallel-verse-nudge-v1 */"
    if css_anchor not in html:
        raise SystemExit("Could not find CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel pane head HTML")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if HELP_OLD not in html:
        raise SystemExit("Could not find parallelAlignHint")
    html = html.replace(HELP_OLD, HELP_NEW, 1)

    if MERGE_ANCHOR not in html:
        raise SystemExit("Could not find parseText anchor")
    html = html.replace(MERGE_ANCHOR, MERGE_FUNCS + "function parseText(text,ref){", 1)

    if PARSE_OLD not in html:
        raise SystemExit("Could not find parseText body")
    html = html.replace(PARSE_OLD, PARSE_NEW, 1)

    if RENDER_HEAD_OLD not in html:
        raise SystemExit("Could not find renderParallelEditors head anchor")
    html = html.replace(RENDER_HEAD_OLD, RENDER_HEAD_NEW, 1)

    if INIT_PARALLEL_OLD not in html:
        raise SystemExit("Could not find initParallelMode anchor")
    html = html.replace(INIT_PARALLEL_OLD, INIT_PARALLEL_NEW, 1)

    if GENERATE_PARSE_OLD not in html:
        raise SystemExit("Could not find generateWlc parseText call")
    html = html.replace(GENERATE_PARSE_OLD, GENERATE_PARSE_NEW, 1)
    if GENERATE_PARSE_OLD in html:
        html = html.replace(GENERATE_PARSE_OLD, GENERATE_PARSE_NEW, 1)

    if MAKE_TEXT_OLD not in html:
        raise SystemExit("Could not find makeText parseText call")
    html = html.replace(MAKE_TEXT_OLD, MAKE_TEXT_NEW, 1)

    if RENDER_AFTER_OLD not in html:
        raise SystemExit("Could not find renderParallelEditors attach anchor")
    html = html.replace(RENDER_AFTER_OLD, RENDER_AFTER_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied editable ref preserve v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
