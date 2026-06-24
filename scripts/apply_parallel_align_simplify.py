#!/usr/bin/env python3
"""Simplify parallel alignment UI: shift-right up/down, optional click-to-pair."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-align-simplify-v3 */"

CSS_BLOCK = """
/* parallel-align-simplify-v3 */
.parallel-nudge-btn,.parallel-row-controls{display:none!important;}
"""

HTML_OLD = """        <div class="parallel-align-toolbar">
          <strong class="parallel-align-heading">Adjust verse alignment</strong>
          <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st with 1st, 2nd with 2nd)">Reset</button>
          <button type="button" class="btn" id="realignVersesBtn" title="Only when both passages share chapter:verse numbers (e.g. Job 3:4 with Job 3:4). For different books (Job vs Psalms), use Shift right or click verse labels to link pairs.">Match by verse number</button>
          <span class="parallel-shift-group">
            <button type="button" class="btn" id="shiftRightDownBtn" title="Move the whole right passage down one row; left column stays put">Shift right ↓</button>
            <button type="button" class="btn" id="shiftRightUpBtn" title="Move the whole right passage up one row (undo a leading offset)">Shift right ↑</button>
            <span class="muted small parallel-offset-count" id="rightOffsetCount" aria-live="polite"></span>
          </span>
        </div>"""

HTML_NEW = """        <div class="parallel-align-toolbar">
          <strong class="parallel-align-heading">Line up passages</strong>
          <span class="parallel-shift-group">
            <button type="button" class="btn" id="shiftRightDownBtn" title="Move the whole right passage down one row; left column stays fixed">Shift right down</button>
            <button type="button" class="btn" id="shiftRightUpBtn" title="Move the whole right passage up one row (undo offset)">Shift right up</button>
            <span class="muted small parallel-offset-count" id="rightOffsetCount" aria-live="polite"></span>
          </span>
          <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st with 1st, 2nd with 2nd)">Reset</button>
        </div>"""

STATUS_OLD = (
    "const off=countLeadingRightOffset();"
    "el.innerHTML='<strong>Cross-column alignment:</strong> use <strong>Shift right ↓</strong> / "
    "<strong>↑</strong> to move the whole right passage while the left stays fixed'"
    "+(off?' ('+off+' row offset)':'')+'. Click verse labels (e.g. <em>Job 10:18</em> then <em>Psalm 39:5</em>) "
    "to pair specific verses on the same row. <strong>Match by verse number</strong> only when both books share "
    "chapter:verse refs.';"
)

STATUS_NEW = (
    "const off=countLeadingRightOffset();"
    "el.innerHTML='Use <strong>Shift right down</strong> / <strong>up</strong> to line up the right passage "
    "with the left'+(off?' (offset: '+off+' row'+(off===1?'':'s')+')':'')+'. "
    "Click two verse labels to pair one row.';"
)

RENDER_OLD = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr"><button type="button" class="parallel-nudge-btn" '
    'data-row="${ri}" data-gap="${pane}" title="Nudge this one verse down on this side (fine-tune after Shift right)">'
    "↓</button><span class=\"muted parallel-verse-ref parallel-verse-pick${picked?\" parallel-verse-picked\":\"\"}\" "
    'data-pane="${pane}" data-vi="${vi}" title="Click, then click a verse in the other column to line them up on '
    'this row">${esc(v.ref)}</span><button type="button" class="parallel-nudge-btn parallel-nudge-up" data-row="${ri}" '
    'data-gap="${pane}" data-dir="up" title="Move this verse up one row">↑</button></div>`;'
)

RENDER_NEW = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr"><span class="muted parallel-verse-ref '
    'parallel-verse-pick${picked?" parallel-verse-picked":""}" data-pane="${pane}" data-vi="${vi}" '
    'title="Click two verse labels to pair one row">${esc(v.ref)}</span></div>`;'
)

ATTACH_OLD = (
    "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-nudge-btn').forEach(btn=>{"
    "btn.onclick=(ev)=>{ev.stopPropagation();const row=+btn.dataset.row,pane=+btn.dataset.gap;"
    "if(btn.dataset.dir==='up')nudgeVerseUp(row,pane);else skipVerseToNextRow(row,pane);render();};});"
    "root.querySelectorAll('.parallel-verse-pick').forEach(el=>{"
)

ATTACH_NEW = "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-verse-pick').forEach(el=>{"

INIT_OLD = (
    "const realign=document.getElementById('realignVersesBtn');"
    "if(realign)realign.onclick=()=>{autoAlignVersePairsByRef();render();};"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "Shift right down",
        "Shift right up",
        "Click two verse labels to pair one row",
        "parallel-align-simplify-v3",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")
    for gone in ("Match by verse number", "realignVersesBtn", 'class="parallel-nudge-btn"'):
        if gone in html:
            raise SystemExit(f"Expected removed content still present: {gone}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel align simplify v3 already applied.")
        return

    if "parallel-shift-right-v1" not in html:
        raise SystemExit("Run apply_parallel_shift_right.py first")

    css_anchor = "/* parallel-shift-right-v1 */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-shift-right-v1 CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel toolbar HTML anchor")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus message anchor")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find renderVerseBlock nudge-button anchor")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    if ATTACH_OLD not in html:
        raise SystemExit("Could not find attachParallelAlignHandlers nudge anchor")
    html = html.replace(ATTACH_OLD, ATTACH_NEW, 1)

    if INIT_OLD in html:
        html = html.replace(INIT_OLD, "", 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel align simplify v3 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
