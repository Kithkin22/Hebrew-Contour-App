#!/usr/bin/env python3
"""Clarify parallel alignment copy: up/down rows, not left/right movement."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-align-copy-v1 */"

HTML_OLD = """          <span class="parallel-offset-stepper" title="Move the right passage up or down; left column stays fixed">
            <span class="parallel-align-heading">Move right</span>
            <button type="button" class="btn parallel-step-btn" id="shiftRightUpBtn" aria-label="Move right passage up one row" title="Up one row (Alt+↑)">−</button>
            <button type="button" class="btn parallel-step-btn" id="shiftRightDownBtn" aria-label="Move right passage down one row" title="Down one row (Alt+↓)">+</button>
          </span>"""

HTML_NEW = """          <span class="parallel-offset-stepper" title="Shift the right pane up or down; the left pane stays put">
            <span class="parallel-align-heading">Right pane ↑↓</span>
            <button type="button" class="btn parallel-step-btn" id="shiftRightUpBtn" aria-label="Shift right pane up one row" title="Shift right pane up one row (Alt+↑)">↑</button>
            <button type="button" class="btn parallel-step-btn" id="shiftRightDownBtn" aria-label="Shift right pane down one row" title="Shift right pane down one row (Alt+↓)">↓</button>
          </span>"""

STATUS_OLD = (
    "let msg=off?('Right passage is '+off+' row'+(off===1?'':'s')+' below the left.'):'Right passage lines up with the left.';"
    "msg+=' Use <strong>−</strong> / <strong>+</strong> to move the whole right column (Alt+↑ / Alt+↓). "
    "On the right, <strong>↑</strong> / <strong>↓</strong> beside a verse moves that verse only. "
    "Or click two verse labels to pair one row.';"
)

STATUS_NEW = (
    "let msg=off?('Right pane starts '+off+' row'+(off===1?'':'s')+' lower than the left.'):"
    "'Right and left panes start on the same row.';"
    "msg+=' Toolbar <strong>↑</strong> / <strong>↓</strong> shift the whole right pane up or down (Alt+↑ / Alt+↓). "
    "Small <strong>↑</strong> / <strong>↓</strong> beside a verse on the right move that verse only. "
    "Click two verse labels to pair them on one row.';"
)


def verify(html: str) -> None:
    for needle in (MARKER, "Right pane ↑↓", "Shift right pane up", "whole right pane up or down"):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")
    if "Move right</span>" in html:
        raise SystemExit("Old 'Move right' heading still present")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel align copy v1 already applied.")
        return

    if "editable-ref-preserve-v1" not in html:
        raise SystemExit("Run apply_editable_ref_preserve.py first")

    css_anchor = "/* editable-ref-preserve-v1 */"
    html = html.replace(
        css_anchor,
        css_anchor + "\n/* parallel-align-copy-v1 */\n",
        1,
    )

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel toolbar HTML")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    if STATUS_OLD not in html:
        raise SystemExit("Could not find updateParallelAlignStatus message")
    html = html.replace(STATUS_OLD, STATUS_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel align copy v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
