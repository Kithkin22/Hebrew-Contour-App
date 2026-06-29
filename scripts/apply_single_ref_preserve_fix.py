#!/usr/bin/env python3
"""Fix annotation preservation when single-mode reference changes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "/* single-ref-preserve-fix-v1 */"

HELPERS = r"""function normalizeWordForMatch(s){return normalizeHebrewWord(s);}
function verseWordsFlat(v){return(v.clauses||[]).flatMap(c=>c.words||[]).filter(w=>!w.deleted);}
function verseWordSignature(v){return verseWordsFlat(v).map(w=>normalizeWordForMatch(w.text)).join('|');}
function versesWordsMatch(a,b){if(!a||!b)return false;const sa=verseWordSignature(a),sb=verseWordSignature(b);return sa.length>0&&sa===sb;}
function findMatchingVerseIndex(searchVerses,matchVerse,matchIdx,otherVerses){let i=findVerseIndexByRef(searchVerses,matchVerse.ref);if(i>=0)return i;if(searchVerses.length===1&&otherVerses.length===1)return 0;if(matchIdx<searchVerses.length&&versesWordsMatch(searchVerses[matchIdx],matchVerse))return matchIdx;for(let j=0;j<searchVerses.length;j++){if(versesWordsMatch(searchVerses[j],matchVerse))return j;}return-1;}
"""

MERGE_OLD = (
    "function mergeVerseData(oldV,newV){if(!oldV||!newV)return;if(oldV.clauses.length===newV.clauses.length){"
    "for(let ci=0;ci<newV.clauses.length;ci++){const oc=oldV.clauses[ci],nc=newV.clauses[ci];if(!oc||!nc)continue;"
    "nc.indent=oc.indent;nc.ann=Object.assign({},oc.ann||{});const min=Math.min(oc.words.length,nc.words.length);"
    "for(let wi=0;wi<min;wi++){const ow=oc.words[wi],nw=nc.words[wi];"
    "if(ow.text===nw.text||normalizeHebrewWord(ow.text)===normalizeHebrewWord(nw.text))copyWordAnnotations(ow,nw);}}"
    "return;}const ow=oldV.clauses.flatMap(c=>c.words),nw=newV.clauses.flatMap(c=>c.words);let oi=0;"
    "for(let ni=0;ni<nw.length;ni++){const ntxt=normalizeHebrewWord(nw[ni].text);"
    "while(oi<ow.length&&normalizeHebrewWord(ow[oi].text)!==ntxt)oi++;"
    "if(oi<ow.length){copyWordAnnotations(ow[oi],nw[ni]);oi++;}}}"
)

MERGE_NEW = (
    "function mergeVerseData(oldV,newV){if(!oldV||!newV)return;if(oldV.clauses.length===newV.clauses.length){"
    "for(let ci=0;ci<newV.clauses.length;ci++){const oc=oldV.clauses[ci],nc=newV.clauses[ci];if(!oc||!nc)continue;"
    "nc.indent=oc.indent;nc.ann=Object.assign({},oc.ann||{});const min=Math.min(oc.words.length,nc.words.length);"
    "for(let wi=0;wi<min;wi++){const ow=oc.words[wi],nw=nc.words[wi];"
    "if(ow.text===nw.text||normalizeWordForMatch(ow.text)===normalizeWordForMatch(nw.text))copyWordAnnotations(ow,nw);}}"
    "return;}const ow=oldV.clauses.flatMap(c=>c.words),nw=newV.clauses.flatMap(c=>c.words);let oi=0;"
    "for(let ni=0;ni<nw.length;ni++){const ntxt=normalizeWordForMatch(nw[ni].text);"
    "while(oi<ow.length&&normalizeWordForMatch(ow[oi].text)!==ntxt)oi++;"
    "if(oi<ow.length){copyWordAnnotations(ow[oi],nw[ni]);oi++;}}}"
)

REMAP_REF_OLD = "const nvIdx=findVerseIndexByRef(newVerses,ov.ref);if(nvIdx<0)return null;"
REMAP_REF_NEW = "const nvIdx=findMatchingVerseIndex(newVerses,ov,loc.v,oldVerses);if(nvIdx<0)return null;"

REMAP_WORD_OLD = (
    "if(words[wi].text===ow.text||normalizeHebrewWord(words[wi].text)===normalizeHebrewWord(ow.text))"
)
REMAP_WORD_NEW = (
    "if(words[wi].text===ow.text||normalizeWordForMatch(words[wi].text)===normalizeWordForMatch(ow.text))"
)

PARSE_MERGE_OLD = (
    "if(snap){state.verses.forEach(nv=>{const oi=findVerseIndexByRef(snap.verses,nv.ref);"
    "if(oi>=0)mergeVerseData(snap.verses[oi],nv);});"
)
PARSE_MERGE_NEW = (
    "if(snap){state.verses.forEach((nv,ni)=>{const oi=findMatchingVerseIndex(snap.verses,nv,ni,state.verses);"
    "if(oi>=0)mergeVerseData(snap.verses[oi],nv);});"
)

SYNC_OLD = (
    "function syncGeneratorFieldsFromActivePane(){const refBox=document.getElementById('refBox');"
    "const pasteBox=document.getElementById('pasteBox');const textSource=document.getElementById('textSource');"
    "if(refBox)refBox.value=state.ref||'';if(pasteBox&&state.verses&&state.verses.length){"
)
SYNC_NEW = (
    "function syncGeneratorFieldsFromActivePane(){const refBox=document.getElementById('refBox');"
    "const pasteBox=document.getElementById('pasteBox');const textSource=document.getElementById('textSource');"
    "const passageRef=document.getElementById('passageReference');"
    "if(refBox)refBox.value=state.ref||'';"
    "if(passageRef&&document.activeElement!==passageRef)passageRef.value=state.ref||'';"
    "if(pasteBox&&state.verses&&state.verses.length){"
)

BIND_SINGLE_OLD = (
    "function bindParallelPaneRefInputs(){document.querySelectorAll('.parallel-pane-ref-input').forEach(inp=>{"
)
BIND_SINGLE_NEW = (
    "function bindSinglePassageRefInput(){const inp=document.getElementById('passageReference');"
    "if(!inp||inp.dataset.refBound)return;inp.dataset.refBound='1';"
    "inp.addEventListener('blur',()=>{if(stateBundle&&stateBundle.parallelEnabled&&isParallelActive())return;"
    "const val=inp.value.trim();if(val&&val!==(state.ref||''))applyPaneReferenceFromInput(stateBundle.activePane||0,val);});}"
    "function bindParallelPaneRefInputs(){document.querySelectorAll('.parallel-pane-ref-input').forEach(inp=>{"
)

GEN_UNDO_OLD = "if(!verses.length){status.textContent='No text found for that range.';return;}\n  generatedRefs=verses.map"
GEN_UNDO_NEW = (
    "if(!verses.length){status.textContent='No text found for that range.';return;}\n"
    "  if(state.verses&&state.verses.length)markUndo();\n"
    "  generatedRefs=verses.map"
)

MAKE_TEXT_OLD = (
    "document.getElementById('makeText').onclick=()=>{generatedRefs=[];const box=document.getElementById('pasteBox');"
    "const cleaned=cleanLogosPaste(box.value);box.value=cleaned;"
    "parseText(cleaned,document.getElementById('refBox').value,true);closeTopMenus();};"
)
MAKE_TEXT_NEW = (
    "document.getElementById('makeText').onclick=()=>{const box=document.getElementById('pasteBox');"
    "const cleaned=cleanLogosPaste(box.value);box.value=cleaned;"
    "if((!generatedRefs||!generatedRefs.length)&&state.verses&&state.verses.length)"
    "generatedRefs=state.verses.map(v=>v.ref);"
    "parseText(cleaned,document.getElementById('refBox').value,true);closeTopMenus();};"
)

INIT_SINGLE_OLD = (
    "document.getElementById('passageReference').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();generateFromReference();}});\n"
    "document.getElementById('textSource').onchange"
)
INIT_SINGLE_NEW = (
    "document.getElementById('passageReference').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();generateFromReference();}});\n"
    "bindSinglePassageRefInput();\n"
    "document.getElementById('textSource').onchange"
)

PROJECT_REF_OLD = "const refBox=document.getElementById('refBox');if(refBox)refBox.value=state.ref||'';const toggle=document.getElementById('parallelModeToggle');"
PROJECT_REF_NEW = (
    "const refBox=document.getElementById('refBox');if(refBox)refBox.value=state.ref||'';"
    "const passageRef=document.getElementById('passageReference');if(passageRef)passageRef.value=state.ref||'';"
    "const toggle=document.getElementById('parallelModeToggle');"
)


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("single-ref-preserve-fix v1 already applied.")
        return
    if "editable-ref-preserve-v1" not in html:
        raise SystemExit("Run apply_editable_ref_preserve.py first")

    anchor = "function findVerseIndexByRef(verses,ref){"
    if anchor not in html:
        raise SystemExit("findVerseIndexByRef anchor missing")
    html = html.replace(anchor, HELPERS + anchor, 1)

    for old, new, label in (
        (MERGE_OLD, MERGE_NEW, "mergeVerseData"),
        (REMAP_REF_OLD, REMAP_REF_NEW, "remapLocByVerseRef"),
        (REMAP_WORD_OLD, REMAP_WORD_NEW, "remapLoc word match"),
        (PARSE_MERGE_OLD, PARSE_MERGE_NEW, "parseText merge"),
        (SYNC_OLD, SYNC_NEW, "syncGeneratorFieldsFromActivePane"),
        (BIND_SINGLE_OLD, BIND_SINGLE_NEW, "bindSinglePassageRefInput"),
        (GEN_UNDO_OLD, GEN_UNDO_NEW, "generateWlc markUndo"),
        (MAKE_TEXT_OLD, MAKE_TEXT_NEW, "makeText"),
        (INIT_SINGLE_OLD, INIT_SINGLE_NEW, "init bindSingle"),
        (PROJECT_REF_OLD, PROJECT_REF_NEW, "applyProjectPayloadParallel"),
    ):
        if old not in html:
            raise SystemExit(f"Missing anchor: {label}")
        html = html.replace(old, new, 1)

    css_anchor = "/* editable-ref-preserve-v1 */"
    html = html.replace(css_anchor, css_anchor + "\n" + MARKER, 1)

    for needle in (
        MARKER,
        "findMatchingVerseIndex",
        "bindSinglePassageRefInput",
        "normalizeWordForMatch",
    ):
        if needle not in html:
            raise SystemExit(f"Missing after patch: {needle}")

    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied single-ref-preserve-fix v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
