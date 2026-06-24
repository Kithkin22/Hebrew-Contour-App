#!/usr/bin/env python3
"""Fix verse pair no-op feedback and robust two-column pairing."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-pair-feedback-v1 */"

PAIR_OLD = (
    "function pairVersesOnRow(paneA,viA,paneB,viB){markUndo();const pairs=materializeVersePairs();"
    "const rowA=findVersePairRow(paneA,viA);const rowB=findVersePairRow(paneB,viB);if(rowA<0||rowB<0)return;"
    "const kB=paneB===0?'leftVi':'rightVi';if(rowA===rowB)return;pairs[rowA][kB]=viB;pairs[rowB][kB]=null;"
    "if(autosaveReady)autoSaveProject();}"
)

PAIR_NEW = (
    "function pairVersesOnRow(paneA,viA,paneB,viB){const pairs=materializeVersePairs();"
    "const rowA=findVersePairRow(paneA,viA);const rowB=findVersePairRow(paneB,viB);"
    "if(rowA<0||rowB<0)return'missing';if(rowA===rowB)return'same';markUndo();"
    "const kA=paneA===0?'leftVi':'rightVi';const kB=paneB===0?'leftVi':'rightVi';"
    "pairs[rowA][kA]=viA;pairs[rowA][kB]=viB;"
    "if(pairs[rowB][kA]===viA)pairs[rowB][kA]=null;if(pairs[rowB][kB]===viB)pairs[rowB][kB]=null;"
    "if(autosaveReady)autoSaveProject();return'paired';}"
)

PICK_OLD = (
    "if(!versePairPick){versePairPick={pane,vi};renderParallelEditors();return;}"
    "if(versePairPick.pane===pane){versePairPick={pane,vi};renderParallelEditors();return;}"
    "pairVersesOnRow(versePairPick.pane,versePairPick.vi,pane,vi);versePairPick=null;"
    "updateSaveStatus('Verses linked on the same row.');render();};});"
)

PICK_NEW = (
    "if(!versePairPick){versePairPick={pane,vi};const st0=stateBundle.panes[pane];"
    "const ref0=(st0.verses[vi]&&st0.verses[vi].ref)||'verse';"
    "updateSaveStatus('Selected '+ref0+' — click the matching verse label in the other column.');"
    "renderParallelEditors();return;}"
    "if(versePairPick.pane===pane){versePairPick={pane,vi};renderParallelEditors();return;}"
    "const pr=pairVersesOnRow(versePairPick.pane,versePairPick.vi,pane,vi);versePairPick=null;"
    "if(pr==='same')updateSaveStatus('Those verses are already on the same row.');"
    "else if(pr==='paired')updateSaveStatus('Verses linked on the same row.');"
    "else updateSaveStatus('Could not pair those verses.');render();};});"
)

WORD_OLD = (
    "state.selected=clicked;renderParallelEditors();};});"
)

WORD_NEW = (
    "state.selected=clicked;syncStateBundle();const mk=crossPaneMatchKey();"
    "if(mk){const wtxt=state.verses[clicked.v].clauses[clicked.c].words[clicked.w].text;"
    "updateSaveStatus('Highlighting every instance of “'+wtxt+'” in both panes.');}"
    "else updateSaveStatus('Word selected.');renderParallelEditors();};});"
)

LABEL_TITLE_OLD = 'title="Click two verse labels to pair one row"'
LABEL_TITLE_NEW = (
    'title="Click this label, then click a verse label in the other column to line them up on one row"'
)


def verify(html: str) -> None:
    for needle in (MARKER, "return'same'", "already on the same row", "Highlighting every instance"):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel pair feedback v1 already applied.")
        return

    if "parallel-cross-sameword-v1" not in html:
        raise SystemExit("Run apply_parallel_cross_sameword.py first")

    css_anchor = "/* parallel-cross-sameword-v1 */"
    html = html.replace(css_anchor, css_anchor + "\n" + MARKER + "\n", 1)

    for old, new, label in (
        (PAIR_OLD, PAIR_NEW, "pairVersesOnRow"),
        (PICK_OLD, PICK_NEW, "verse pick handler"),
        (WORD_OLD, WORD_NEW, "word click handler"),
    ):
        if old not in html:
            raise SystemExit(f"Could not find anchor: {label}")
        html = html.replace(old, new, 1)

    if LABEL_TITLE_OLD in html:
        html = html.replace(LABEL_TITLE_OLD, LABEL_TITLE_NEW, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel pair feedback v1 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
