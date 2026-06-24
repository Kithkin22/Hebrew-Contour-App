#!/usr/bin/env python3
"""Per-verse up/down nudge on right parallel column (Susan: align Psalm lines to Job rows)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-verse-nudge-v1 */"

CSS_BLOCK = """
/* parallel-verse-nudge-v1 */
.parallel-verse-ref-bar .parallel-nudge-btn{display:inline-block!important;}
"""

RENDER_OLD = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr"><span class="muted parallel-verse-ref '
    'parallel-verse-pick${picked?" parallel-verse-picked":""}" data-pane="${pane}" data-vi="${vi}" '
    'title="Click two verse labels to pair one row">${esc(v.ref)}</span><button type="button" '
    'class="parallel-verse-remove" data-pane="${pane}" data-vi="${vi}" '
    'title="Remove this verse from this pane">×</button></div>`;'
)

RENDER_NEW = (
    'let html=`<div class="parallel-verse-ref-bar" dir="ltr">'
    '${pane===1?`<button type="button" class="parallel-nudge-btn" data-row="${ri}" data-gap="${pane}" '
    'data-dir="up" title="Move this verse up one row">↑</button>`:""}'
    '<span class="muted parallel-verse-ref parallel-verse-pick${picked?" parallel-verse-picked":""}" '
    'data-pane="${pane}" data-vi="${vi}" title="Click two verse labels to pair one row">${esc(v.ref)}</span>'
    '${pane===1?`<button type="button" class="parallel-nudge-btn" data-row="${ri}" data-gap="${pane}" '
    'title="Move this verse down one row">↓</button>`:""}'
    '<button type="button" class="parallel-verse-remove" data-pane="${pane}" data-vi="${vi}" '
    'title="Remove this verse from this pane">×</button></div>`;'
)

ATTACH_OLD = (
    "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-verse-remove').forEach(btn=>{"
)

ATTACH_NEW = (
    "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-nudge-btn').forEach(btn=>{"
    "btn.onclick=(ev)=>{ev.stopPropagation();const row=+btn.dataset.row,pane=+btn.dataset.gap;"
    "if(btn.dataset.dir==='up')nudgeVerseUp(row,pane);else skipVerseToNextRow(row,pane);render();};});"
    "root.querySelectorAll('.parallel-verse-remove').forEach(btn=>{"
)

STATUS_OLD = (
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move it (Alt+↑ / Alt+↓). "
    "Click two verse labels to pair one row.';"
)

STATUS_NEW = (
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move the whole right column (Alt+↑ / Alt+↓). "
    "On the right, <strong>↑</strong> / <strong>↓</strong> beside a verse moves that verse only. "
    "Or click two verse labels to pair one row.';"
)


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "parallel-nudge-btn",
        "data-dir=\"up\"",
        "nudgeVerseUp(row,pane)",
        "On the right, <strong>↑</strong>",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel verse nudge v1 already applied.")
        return

    if "parallel-verse-trim-v1" not in html:
        raise SystemExit("Run apply_parallel_verse_trim.py first")

    css_anchor = "/* parallel-verse-trim-v1 */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-verse-trim-v1 CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find renderVerseBlock ref-bar anchor")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    if ATTACH_OLD not in html:
        raise SystemExit("Could not find attachParallelAlignHandlers anchor")
    html = html.replace(ATTACH_OLD, ATTACH_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus message anchor")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel verse nudge v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
