#!/usr/bin/env python3
"""Make parallel verse alignment controls visible and obvious (Job vs Psalms case)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* parallel-align-ux-v2 */"

CSS_BLOCK = """
/* parallel-align-ux-v2 */
.parallel-align-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:4px;}
.parallel-align-heading{font-size:13px;white-space:nowrap;}
.parallel-align-status{margin:8px 0 0 0;padding:8px 10px;background:#fff8e6;border:1px solid #f0d78c;border-radius:6px;font-size:13px;line-height:1.45;}
.parallel-align-status em{font-style:normal;color:#5a4a00;}
.parallel-align-status .linkish-btn{font:inherit;font-size:12px;margin-left:8px;padding:0;border:0;background:none;color:#2b67a5;text-decoration:underline;cursor:pointer;}
.parallel-verse-ref-bar{display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;}
.parallel-nudge-btn{font:inherit;font-size:11px;line-height:1.2;padding:2px 8px;border:1px solid #8ec5ff;border-radius:4px;background:#eef5fc;color:#1a4d7a;cursor:pointer;flex-shrink:0;font-weight:600;}
.parallel-nudge-btn:hover{background:#dbeafe;border-color:#2b67a5;}
.parallel-verse-ref.parallel-verse-pick{border:1px dashed #8ec5ff;padding:2px 8px;cursor:pointer;}
body.dark-mode .parallel-align-status{background:#2a2418;border-color:#6b5a2a;color:#f5e6b8;}
body.dark-mode .parallel-nudge-btn{background:#1e3a52;border-color:#4a8fc4;color:#e8eef5;}
"""

HTML_OLD = """        <button type="button" class="btn" id="realignVersesBtn" title="Line up rows by chapter:verse number (e.g. Job 3:4 with Psalm 3:4). Hover a row for +L/+R gap controls; click verse labels in each column to pair manually.">Match by verse number</button>
        <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st verse with 1st verse, etc.)">Reset alignment</button>
        <span class="muted small" id="parallelAlignHint">Desktop side-by-side. Click a pane header or word to choose Generate / Paste target. <strong>Match by verse number</strong> aligns rows; click verse labels (e.g. Job 3:4) in each column to pair manually; hover a row for <strong>+L</strong> / <strong>+R</strong> gap controls.</span>"""

HTML_NEW = """        <div class="parallel-align-toolbar">
          <strong class="parallel-align-heading">Adjust verse alignment</strong>
          <button type="button" class="btn" id="resetVerseAlignBtn" title="Reset to line-by-line order (1st with 1st, 2nd with 2nd)">Reset</button>
          <button type="button" class="btn" id="realignVersesBtn" title="Auto-align only when both passages share the same chapter:verse numbers. For different books (Job vs Psalms), click verse labels to link them instead.">Match by verse number</button>
        </div>
        <p class="parallel-align-status" id="parallelAlignStatus" role="status" aria-live="polite"></p>
        <span class="muted small" id="parallelAlignHint">Click a pane header or word to choose Generate / Paste target.</span>"""

REPLACEMENTS = [
    (
        "function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}",
        "function clearVerseAlignState(){stateBundle.verseAlignPairs=null;versePairPick=null;}function nudgeVerseUp(row,pane){if(row<=0)return;const pairs=materializeVersePairs();const key=pane===0?'leftVi':'rightVi';const vi=pairs[row][key];if(vi==null)return;const prev=pairs[row-1][key];pairs[row-1][key]=vi;pairs[row][key]=prev;if(autosaveReady)autoSaveProject();}function updateParallelAlignStatus(){const el=document.getElementById('parallelAlignStatus');if(!el)return;if(!isParallelActive()){el.textContent='';return;}if(versePairPick){const st=stateBundle.panes[versePairPick.pane];const ref=(st.verses[versePairPick.vi]&&st.verses[versePairPick.vi].ref)||'verse';el.innerHTML='<strong>Link verses:</strong> selected <strong>'+esc(ref)+'</strong>. Now click the matching verse label in the other column. <button type=\"button\" class=\"linkish-btn\" id=\"cancelVersePickBtn\">Cancel</button>';const cancel=document.getElementById('cancelVersePickBtn');if(cancel)cancel.onclick=(e)=>{e.preventDefault();versePairPick=null;render();};return;}el.innerHTML='<strong>Adjust verse alignment:</strong> click a verse label (e.g. <em>Job 10:18</em>), then click the partner in the other column (e.g. <em>Psalm 39:5</em>) to line them up on the same row. Use <strong>↓</strong> beside a label to insert a gap on that side.';}",
    ),
    (
        "function renderVerseBlock(pane,vi,paneState,layout,activeKey){if(vi==null||!paneState.verses[vi])return '<div class=\"parallel-empty-verse muted small\">—</div>';const v=paneState.verses[vi];const picked=versePairPick&&versePairPick.pane===pane&&versePairPick.vi===vi;let html=`<div class=\"muted parallel-verse-ref parallel-verse-pick${picked?\" parallel-verse-picked\":\"\"}\" dir=\"ltr\" data-pane=\"${pane}\" data-vi=\"${vi}\" title=\"Click to pair with a verse in the other column\">${esc(v.ref)}</div>`;",
        "function renderVerseBlock(pane,vi,paneState,layout,activeKey,row){if(vi==null||!paneState.verses[vi])return '<div class=\"parallel-empty-verse muted small\">—</div>';const v=paneState.verses[vi];const picked=versePairPick&&versePairPick.pane===pane&&versePairPick.vi===vi;const ri=row!=null?row:0;let html=`<div class=\"parallel-verse-ref-bar\" dir=\"ltr\"><button type=\"button\" class=\"parallel-nudge-btn\" data-row=\"${ri}\" data-gap=\"${pane}\" title=\"Insert a blank row on this side (push this verse down)\">↓</button><span class=\"muted parallel-verse-ref parallel-verse-pick${picked?\" parallel-verse-picked\":\"\"}\" data-pane=\"${pane}\" data-vi=\"${vi}\" title=\"Click, then click a verse in the other column to line them up on this row\">${esc(v.ref)}</span><button type=\"button\" class=\"parallel-nudge-btn parallel-nudge-up\" data-row=\"${ri}\" data-gap=\"${pane}\" data-dir=\"up\" title=\"Move this verse up one row\">↑</button></div>`;",
    ),
    (
        "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-row-btn').forEach(btn=>{btn.onclick=(ev)=>{ev.stopPropagation();skipVerseToNextRow(+btn.dataset.row,+btn.dataset.gap);render();};});root.querySelectorAll('.parallel-verse-pick').forEach(el=>{el.onclick=(ev)=>{ev.stopPropagation();const pane=+el.dataset.pane,vi=+el.dataset.vi;if(!versePairPick){versePairPick={pane,vi};renderParallelEditors();return;}if(versePairPick.pane===pane){versePairPick={pane,vi};renderParallelEditors();return;}pairVersesOnRow(versePairPick.pane,versePairPick.vi,pane,vi);versePairPick=null;render();};});}",
        "function attachParallelAlignHandlers(root){root.querySelectorAll('.parallel-nudge-btn').forEach(btn=>{btn.onclick=(ev)=>{ev.stopPropagation();const row=+btn.dataset.row,pane=+btn.dataset.gap;if(btn.dataset.dir==='up')nudgeVerseUp(row,pane);else skipVerseToNextRow(row,pane);render();};});root.querySelectorAll('.parallel-verse-pick').forEach(el=>{el.onclick=(ev)=>{ev.stopPropagation();const pane=+el.dataset.pane,vi=+el.dataset.vi;if(!versePairPick){versePairPick={pane,vi};renderParallelEditors();return;}if(versePairPick.pane===pane){versePairPick={pane,vi};renderParallelEditors();return;}pairVersesOnRow(versePairPick.pane,versePairPick.vi,pane,vi);versePairPick=null;updateSaveStatus('Verses linked on the same row.');render();};});}",
    ),
    (
        'html+=`<div class="parallel-verse-row" data-row="${ri}"><div class="parallel-row-controls"><button type="button" class="parallel-row-btn" data-row="${ri}" data-gap="0" title="Push this left verse down one row (+L gap)">+L</button><button type="button" class="parallel-row-btn" data-row="${ri}" data-gap="1" title="Push this right verse down one row (+R gap)">+R</button></div>`;',
        'html+=`<div class="parallel-verse-row" data-row="${ri}">`;',
    ),
    (
        "${renderVerseBlock(pane,vi,paneState,layout,activeKey)}",
        "${renderVerseBlock(pane,vi,paneState,layout,activeKey,ri)}",
    ),
    (
        "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();renderCrossArcOverlay();updateParallelModeUI();});",
        "requestAnimationFrame(()=>{equalizeParallelRowHeights();renderParallelArcOverlays();renderCrossArcOverlay();updateParallelModeUI();updateParallelAlignStatus();});",
    ),
]


def verify(html: str) -> None:
    for needle in (
        MARKER,
        "updateParallelAlignStatus",
        "parallel-align-status",
        "parallel-nudge-btn",
        "Adjust verse alignment",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Parallel align UX v2 already applied.")
        return

    if "autoAlignVersePairsByRef" not in html:
        raise SystemExit("Run apply_parallel_verse_align.py first")

    css_anchor = "/* parallel-verse-align */"
    if css_anchor not in html:
        raise SystemExit("Could not find parallel-verse-align CSS anchor")
    html = html.replace(css_anchor, css_anchor + "\n" + CSS_BLOCK, 1)

    if HTML_OLD not in html:
        raise SystemExit("Could not find parallel mode bar HTML anchor")
    html = html.replace(HTML_OLD, HTML_NEW, 1)

    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Could not find replacement anchor:\n{old[:120]}...")
        html = html.replace(old, new, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied parallel align UX v2 ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
