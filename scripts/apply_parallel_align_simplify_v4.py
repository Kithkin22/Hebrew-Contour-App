#!/usr/bin/env python3
"""Further simplify parallel alignment: one stepper, status-led help, Alt+arrows."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-align-simplify-v4 */"

CSS_BLOCK = """
/* parallel-align-simplify-v4 */
.parallel-offset-stepper{display:inline-flex;align-items:center;gap:4px;}
.parallel-step-btn{min-width:2em;padding:2px 10px;font-weight:700;line-height:1.3;}
"""

HTML_OLD = """        <div class="parallel-align-toolbar">
          <strong class="parallel-align-heading">Line up passages</strong>
          <span class="parallel-shift-group">
            <button type="button" class="btn" id="shiftRightDownBtn" title="Move the whole right passage down one row; left column stays fixed">Shift right down</button>
            <button type="button" class="btn" id="shiftRightUpBtn" title="Move the whole right passage up one row (undo offset)">Shift right up</button>
            <span class="muted small parallel-offset-count" id="rightOffsetCount" aria-live="polite"></span>
          </span>
          <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st with 1st, 2nd with 2nd)">Reset</button>
        </div>
        <p class="parallel-align-status" id="parallelAlignStatus" role="status" aria-live="polite"></p>"""

HTML_NEW = """        <div class="parallel-align-toolbar">
          <span class="parallel-offset-stepper" title="Move the right passage up or down; left column stays fixed">
            <span class="parallel-align-heading">Move right</span>
            <button type="button" class="btn parallel-step-btn" id="shiftRightUpBtn" aria-label="Move right passage up one row" title="Up one row (Alt+↑)">−</button>
            <button type="button" class="btn parallel-step-btn" id="shiftRightDownBtn" aria-label="Move right passage down one row" title="Down one row (Alt+↓)">+</button>
          </span>
        </div>
        <p class="parallel-align-status" id="parallelAlignStatus" role="status" aria-live="polite" tabindex="-1"></p>"""

STATUS_OLD = (
    "function updateParallelAlignStatus(){const el=document.getElementById('parallelAlignStatus');if(!el)return;"
    "if(!isParallelActive()){el.textContent='';return;}if(versePairPick){const st=stateBundle.panes[versePairPick.pane];"
    "const ref=(st.verses[versePairPick.vi]&&st.verses[versePairPick.vi].ref)||'verse';"
    "el.innerHTML='<strong>Link verses:</strong> selected <strong>'+esc(ref)+'</strong>. Now click the matching verse label in the other column. "
    "<button type=\"button\" class=\"linkish-btn\" id=\"cancelVersePickBtn\">Cancel</button>';"
    "const cancel=document.getElementById('cancelVersePickBtn');if(cancel)cancel.onclick=(e)=>{e.preventDefault();versePairPick=null;render();};return;}"
    "const off=countLeadingRightOffset();"
    "el.innerHTML='Use <strong>Shift right down</strong> / <strong>up</strong> to line up the right passage "
    "with the left'+(off?' (offset: '+off+' row'+(off===1?'':'s')+')':'')+'. "
    "Click two verse labels to pair one row.';}"
)

STATUS_NEW = (
    "function updateParallelAlignStatus(){const el=document.getElementById('parallelAlignStatus');if(!el)return;"
    "if(!stateBundle.parallelEnabled){el.textContent='';return;}"
    "if(!isParallelActive()){el.textContent='Parallel passages on — widen the window for side-by-side view.';return;}"
    "if(versePairPick){const st=stateBundle.panes[versePairPick.pane];"
    "const ref=(st.verses[versePairPick.vi]&&st.verses[versePairPick.vi].ref)||'verse';"
    "el.innerHTML='Selected <strong>'+esc(ref)+'</strong> — click the matching verse in the other column. "
    "<button type=\"button\" class=\"linkish-btn\" id=\"cancelVersePickBtn\">Cancel</button>';"
    "const cancel=document.getElementById('cancelVersePickBtn');if(cancel)cancel.onclick=(e)=>{e.preventDefault();versePairPick=null;render();};return;}"
    "const off=countLeadingRightOffset();"
    "let msg=off?('Right passage is '+off+' row'+(off===1?'':'s')+' below the left.'):'Right passage lines up with the left.';"
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move it (Alt+↑ / Alt+↓). Click two verse labels to pair one row.';"
    "if(off>0)msg+=' <button type=\"button\" class=\"linkish-btn\" id=\"resetVerseAlignLink\">Reset</button>';"
    "el.innerHTML=msg;const reset=document.getElementById('resetVerseAlignLink');"
    "if(reset)reset.onclick=(e)=>{e.preventDefault();resetVersePairsToIndex();render();};}"
)

OFFSET_FN_OLD = (
    "function updateRightOffsetLabel(){const el=document.getElementById('rightOffsetCount');if(!el)return;"
    "if(!isParallelActive()){el.textContent='';return;}const n=countLeadingRightOffset();"
    "el.textContent=n?('Offset: '+n+' row'+(n===1?'':'s')):'';}"
)

INIT_OLD = (
    "const toggle=document.getElementById('parallelModeToggle');if(toggle){toggle.onchange=()=>{syncStateBundle();"
    "stateBundle.parallelEnabled=!!toggle.checked;render();};}"
    "const resetAlign=document.getElementById('resetVerseAlignBtn');"
    "if(resetAlign)resetAlign.onclick=()=>{resetVersePairsToIndex();render();};"
    "const shiftDn=document.getElementById('shiftRightDownBtn');"
    "if(shiftDn)shiftDn.onclick=()=>{shiftRightColumnDown();updateSaveStatus('Right passage shifted down.');render();};"
    "const shiftUp=document.getElementById('shiftRightUpBtn');"
    "if(shiftUp)shiftUp.onclick=()=>{shiftRightColumnUp();updateSaveStatus('Right passage shifted up.');render();};"
)

INIT_NEW = (
    "const toggle=document.getElementById('parallelModeToggle');if(toggle){toggle.onchange=()=>{syncStateBundle();"
    "stateBundle.parallelEnabled=!!toggle.checked;render();"
    "if(stateBundle.parallelEnabled){requestAnimationFrame(()=>{const st=document.getElementById('parallelAlignStatus');"
    "if(st)st.focus({preventScroll:true});});}};}"
    "const shiftDn=document.getElementById('shiftRightDownBtn');"
    "if(shiftDn)shiftDn.onclick=()=>{shiftRightColumnDown();render();};"
    "const shiftUp=document.getElementById('shiftRightUpBtn');"
    "if(shiftUp)shiftUp.onclick=()=>{shiftRightColumnUp();render();};"
    "if(!window._parallelAlignKeysBound){window._parallelAlignKeysBound=1;"
    "document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable]'))return;"
    "if(!stateBundle.parallelEnabled||!isParallelActive()||!e.altKey)return;"
    "if(e.key==='ArrowDown'){e.preventDefault();shiftRightColumnDown();render();}"
    "else if(e.key==='ArrowUp'){e.preventDefault();shiftRightColumnUp();render();}});}"
)

RAF_OLD = (
    "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();"
    "renderCrossArcOverlay();updateParallelModeUI();updateParallelAlignStatus();updateRightOffsetLabel();});"
)

RAF_NEW = (
    "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();"
    "renderCrossArcOverlay();updateParallelModeUI();updateParallelAlignStatus();});"
)

RENDER_OLD = (
    "function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive()){renderParallelEditors();renderDualTables();}"
    "else{renderEditor();renderTable();}renderLegendEditor();renderInclusioManager();renderCommentsPanel();"
    "setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();"
    "else if(typeof renderArcManager==='function')renderArcManager();if(autosaveReady)autoSaveProject();}"
)

RENDER_NEW = (
    "function render(){applyLanguageLayout();syncStateBundle();if(isParallelActive()){renderParallelEditors();renderDualTables();}"
    "else{renderEditor();renderTable();}renderLegendEditor();renderInclusioManager();renderCommentsPanel();"
    "setTimeout(updateCommentPopover,0);if(isParallelActive())renderArcManagerParallel();"
    "else if(typeof renderArcManager==='function')renderArcManager();"
    "if(stateBundle.parallelEnabled)updateParallelAlignStatus();if(autosaveReady)autoSaveProject();}"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "parallel-offset-stepper",
        "Move right",
        "Right passage is ",
        "Right passage lines up with the left",
        "resetVerseAlignLink",
        "_parallelAlignKeysBound",
        "Alt+↑",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")
    for gone in (
        "Shift right down",
        "Shift right up",
        "resetVerseAlignBtn",
        "rightOffsetCount",
        "updateRightOffsetLabel",
        "Line up passages",
    ):
        if gone in html:
            raise SystemExit(f"Expected removed content still present: {gone}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel align simplify v4 already applied.")
        return

    if "parallel-align-simplify-v3" not in html:
        raise SystemExit("Run apply_parallel_align_simplify.py first")

    css_anchor = "/* parallel-align-simplify-v3 */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-align-simplify-v3 CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel toolbar HTML anchor")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus anchor")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    if OFFSET_FN_OLD not in html:
        raise SystemExit("Could not find updateRightOffsetLabel anchor")
    html = html.replace(OFFSET_FN_OLD, "", 1)

    if INIT_OLD not in html:
        raise SystemExit("Could not find initParallelMode anchor")
    html = html.replace(INIT_OLD, INIT_NEW, 1)

    if RAF_OLD not in html:
        raise SystemExit("Could not find renderParallelEditors rAF anchor")
    html = html.replace(RAF_OLD, RAF_NEW, 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find render() anchor")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel align simplify v4 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
