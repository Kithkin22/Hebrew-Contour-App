#!/usr/bin/env python3
"""Shift entire right parallel column up/down while left stays fixed (Susan workflow)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-shift-right-v1 */"

CSS_BLOCK = """
/* parallel-shift-right-v1 */
.parallel-shift-group{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;}
.parallel-offset-count{font-size:12px;min-width:7em;}
"""

HTML_OLD = """          <button type="button" class="btn" id="realignVersesBtn" title="Auto-align only when both passages share the same chapter:verse numbers. For different books (Job vs Psalms), click verse labels to link them instead.">Match by verse number</button>
        </div>"""

HTML_NEW = """          <button type="button" class="btn" id="realignVersesBtn" title="Only when both passages share chapter:verse numbers (e.g. Job 3:4 with Job 3:4). For different books (Job vs Psalms), use Shift right or click verse labels to link pairs.">Match by verse number</button>
          <span class="parallel-shift-group">
            <button type="button" class="btn" id="shiftRightDownBtn" title="Move the whole right passage down one row; left column stays put">Shift right ↓</button>
            <button type="button" class="btn" id="shiftRightUpBtn" title="Move the whole right passage up one row (undo a leading offset)">Shift right ↑</button>
            <span class="muted small parallel-offset-count" id="rightOffsetCount" aria-live="polite"></span>
          </span>
        </div>"""

JS_INSERT_AFTER = (
    "function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}"
)

JS_INSERT_NEW = (
    "function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}"
    "function countLeadingRightOffset(){const pairs=materializeVersePairs();let n=0;"
    "for(let i=0;i<pairs.length;i++){if(pairs[i].leftVi!=null&&pairs[i].rightVi==null)n++;"
    "else if(pairs[i].rightVi!=null)break;}return n;}"
    "function shiftRightColumnDown(){const pairs=materializeVersePairs();if(!pairs.length)return;"
    "const rights=pairs.map(p=>p.rightVi);for(let i=0;i<pairs.length;i++)pairs[i].rightVi=null;"
    "for(let i=0;i<rights.length;i++){if(rights[i]==null)continue;const target=i+1;"
    "while(target>=pairs.length)pairs.push({leftVi:null,rightVi:null});pairs[target].rightVi=rights[i];}"
    "if(autosaveReady)autoSaveProject();}"
    "function shiftRightColumnUp(){if(countLeadingRightOffset()<=0)return;const pairs=materializeVersePairs();"
    "const rights=[];for(const p of pairs)if(p.rightVi!=null)rights.push(p.rightVi);"
    "for(const p of pairs)p.rightVi=null;"
    "for(let i=0;i<rights.length;i++){if(i>=pairs.length)pairs.push({leftVi:null,rightVi:null});pairs[i].rightVi=rights[i];}"
    "if(autosaveReady)autoSaveProject();}"
    "function updateRightOffsetLabel(){const el=document.getElementById('rightOffsetCount');if(!el)return;"
    "if(!isParallelActive()){el.textContent='';return;}const n=countLeadingRightOffset();"
    "el.textContent=n?('Offset: '+n+' row'+(n===1?'':'s')):'';}"
)

STATUS_OLD = (
    "el.innerHTML='<strong>Adjust verse alignment:</strong> click a verse label (e.g. <em>Job 10:18</em>), "
    "then click the partner in the other column (e.g. <em>Psalm 39:5</em>) to line them up on the same row. "
    "Use <strong>↓</strong> beside a label to insert a gap on that side.';"
)

STATUS_NEW = (
    "const off=countLeadingRightOffset();"
    "el.innerHTML='<strong>Cross-column alignment:</strong> use <strong>Shift right ↓</strong> / "
    "<strong>↑</strong> to move the whole right passage while the left stays fixed'"
    "+(off?' ('+off+' row offset)':'')+'. Click verse labels (e.g. <em>Job 10:18</em> then <em>Psalm 39:5</em>) "
    "to pair specific verses on the same row. <strong>Match by verse number</strong> only when both books share "
    "chapter:verse refs.';"
)

INIT_OLD = (
    "const resetAlign=document.getElementById('resetVerseAlignBtn');"
    "if(resetAlign)resetAlign.onclick=()=>{resetVersePairsToIndex();render();};"
)

INIT_NEW = (
    "const resetAlign=document.getElementById('resetVerseAlignBtn');"
    "if(resetAlign)resetAlign.onclick=()=>{resetVersePairsToIndex();render();};"
    "const shiftDn=document.getElementById('shiftRightDownBtn');"
    "if(shiftDn)shiftDn.onclick=()=>{shiftRightColumnDown();updateSaveStatus('Right passage shifted down.');render();};"
    "const shiftUp=document.getElementById('shiftRightUpBtn');"
    "if(shiftUp)shiftUp.onclick=()=>{shiftRightColumnUp();updateSaveStatus('Right passage shifted up.');render();};"
)

RAF_OLD = (
    "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();"
    "renderCrossArcOverlay();updateParallelModeUI();updateParallelAlignStatus();});"
)

RAF_NEW = (
    "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();"
    "renderCrossArcOverlay();updateParallelModeUI();updateParallelAlignStatus();updateRightOffsetLabel();});"
)

NUDGE_TITLE_OLD = 'title="Insert a blank row on this side (push this verse down)"'
NUDGE_TITLE_NEW = (
    'title="Nudge this one verse down on this side (fine-tune after Shift right)"'
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "shiftRightColumnDown",
        "shiftRightColumnUp",
        "countLeadingRightOffset",
        "shiftRightDownBtn",
        "Shift right ↓",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel shift-right v1 already applied.")
        return

    if "parallel-align-ux-v2" not in html:
        raise SystemExit("Run apply_parallel_align_ux.py first")

    css_anchor = "/* parallel-align-ux-v2 */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-align-ux-v2 CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel toolbar HTML anchor")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if JS_INSERT_AFTER not in html:
        raise SystemExit("Could not find clearVerseAlignState anchor")
    html = html.replace(JS_INSERT_AFTER, JS_INSERT_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus message anchor")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    if INIT_OLD not in html:
        raise SystemExit("Could not find initParallelMode anchor")
    html = html.replace(INIT_OLD, INIT_NEW, 1)

    if RAF_OLD not in html:
        raise SystemExit("Could not find renderParallelEditors rAF anchor")
    html = html.replace(RAF_OLD, RAF_NEW, 1)

    if NUDGE_TITLE_OLD in html:
        html = html.replace(NUDGE_TITLE_OLD, NUDGE_TITLE_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel shift-right v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
