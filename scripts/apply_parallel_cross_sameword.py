#!/usr/bin/env python3
"""Highlight matching words across both parallel panes when a word is selected."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-cross-sameword-v1 */"

FUNCS = (
    "function crossPaneMatchKey(){const ap=stateBundle.activePane;const st=stateBundle.panes[ap];"
    "if(!st||!st.selected||!locOKInPane(st.selected,ap))return '';"
    "return normalizeHebrewWord(st.verses[st.selected.v].clauses[st.selected.c].words[st.selected.w].text);}"
)

RENDER_OLD = (
    "const pairs=computeVersePairs();let html='';[0,1].forEach(pane=>{const refIn=document.getElementById('parallelPaneRef'+pane);"
)

RENDER_NEW = (
    "const pairs=computeVersePairs();const matchKey=crossPaneMatchKey();let html='';[0,1].forEach(pane=>{const refIn=document.getElementById('parallelPaneRef'+pane);"
)

CELL_OLD = (
    "const layout=getLanguageLayout(paneState.language);"
    "const activeKey=paneState.selected&&locOKInPane(paneState.selected,pane)?"
    "normalizeHebrewWord(paneState.verses[paneState.selected.v].clauses[paneState.selected.c].words[paneState.selected.w].text):'';"
    "html+=`<div class=\"parallel-verse-cell ${stateBundle.activePane===pane?'pane-active':''}\" data-pane=\"${pane}\" data-row=\"${ri}\">"
    "<div class=\"parallel-pane-arc-wrap\" data-pane=\"${pane}\"><svg class=\"paneArcSvg\" data-pane=\"${pane}\" aria-hidden=\"true\"></svg>"
    "<div class=\"parallel-verse-body\">${renderVerseBlock(pane,vi,paneState,layout,activeKey,ri)}</div></div></div>`;"
)

CELL_NEW = (
    "const layout=getLanguageLayout(paneState.language);"
    "html+=`<div class=\"parallel-verse-cell ${stateBundle.activePane===pane?'pane-active':''}\" data-pane=\"${pane}\" data-row=\"${ri}\">"
    "<div class=\"parallel-pane-arc-wrap\" data-pane=\"${pane}\"><svg class=\"paneArcSvg\" data-pane=\"${pane}\" aria-hidden=\"true\"></svg>"
    "<div class=\"parallel-verse-body\">${renderVerseBlock(pane,vi,paneState,layout,matchKey,ri)}</div></div></div>`;"
)

HINT_OLD = "Click a word to annotate."
HINT_NEW = "Click a word to annotate; matching forms highlight in yellow in both panes."


def verify(html: str) -> None:
    for needle in (MARKER, "crossPaneMatchKey", "matchKey,ri)", HINT_NEW):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel cross-sameword v1 already applied.")
        return

    if "parallel-align-copy-v1" not in html:
        raise SystemExit("Run apply_parallel_align_copy.py first")

    anchor = "function renderParallelEditors(){"
    if anchor not in html:
        raise SystemExit("Could not find renderParallelEditors")
    html = html.replace(anchor, FUNCS + anchor, 1)

    css_anchor = "/* parallel-align-copy-v1 */"
    html = html.replace(css_anchor, css_anchor + "\n" + MARKER + "\n", 1)

    if RENDER_OLD not in html:
        raise SystemExit("Could not find renderParallelEditors pairs anchor")
    html = html.replace(RENDER_OLD, RENDER_NEW, 1)

    if CELL_OLD not in html:
        raise SystemExit("Could not find parallel verse cell activeKey anchor")
    html = html.replace(CELL_OLD, CELL_NEW, 1)

    if HINT_OLD not in html:
        raise SystemExit("Could not find parallelAlignHint")
    html = html.replace(HINT_OLD, HINT_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel cross-sameword v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
