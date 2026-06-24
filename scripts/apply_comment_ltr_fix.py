#!/usr/bin/env python3
"""Force LTR on table annotation cells and comment inputs (English notes)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* comment-ltr-fix */"

CSS_BLOCK = """
/* comment-ltr-fix */
/* English notes in table & comment UI stay LTR */
.ann-ltr,
#annTable td[contenteditable],
.parallel-ann-table td[contenteditable],
#modalInput,
.comment-text{
  direction:ltr!important;
  text-align:left!important;
  unicode-bidi:isolate;
}
"""

REPLACEMENTS = [
    (
        ".lang-hebrew #tableWrap .heb,\n.lang-hebrew #modalInput,\n.lang-hebrew .wi-hebrew,",
        ".lang-hebrew #tableWrap .heb,\n.lang-hebrew .wi-hebrew,",
    ),
    (
        ".lang-greek #tableWrap .greek,\n.lang-greek #modalInput,\n.lang-greek .wi-greek,",
        ".lang-greek #tableWrap .greek,\n.lang-greek .wi-greek,",
    ),
    (
        "  const modalInp=document.getElementById('modalInput');\n  if(modalInp) applyScriptTypography(modalInp,layout);",
        "  const modalInp=document.getElementById('modalInput');\n  if(modalInp) applyLtrAnnotationInput(modalInp);",
    ),
    (
        "function applyScriptTypography(el,layout){",
        "function applyLtrAnnotationInput(el){if(!el)return;el.dir='ltr';el.style.direction='ltr';el.style.textAlign='left';el.style.unicodeBidi='isolate';}\nfunction applyScriptTypography(el,layout){",
    ),
    (
        "function promptModal(title,text,value,cb){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=text;let inp=document.getElementById('modalInput');inp.value=value||'';applyLanguageLayout();document.getElementById('modal').classList.add('show');inp.focus();",
        "function promptModal(title,text,value,cb){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=text;let inp=document.getElementById('modalInput');inp.value=value||'';applyLanguageLayout();applyLtrAnnotationInput(inp);document.getElementById('modal').classList.add('show');inp.focus();",
    ),
    (
        '<div class="comment-text">${esc(cm.text)}</div>',
        '<div class="comment-text" dir="ltr">${esc(cm.text)}</div>',
    ),
    (
        "document.querySelectorAll('#annTable td[contenteditable]').forEach(td=>td.oninput=()=>{let tr=td.closest('tr'),c=state.verses[+tr.dataset.v].clauses[+tr.dataset.c];c.ann=c.ann||{};c.ann[td.dataset.col]=td.innerText;if(autosaveReady)autoSaveProject();});",
        "document.querySelectorAll('#annTable td[contenteditable]').forEach(td=>{applyLtrAnnotationInput(td);td.oninput=()=>{let tr=td.closest('tr'),c=state.verses[+tr.dataset.v].clauses[+tr.dataset.c];c.ann=c.ann||{};c.ann[td.dataset.col]=td.innerText;if(autosaveReady)autoSaveProject();};});",
    ),
    (
        "document.querySelectorAll('.parallel-ann-table td[contenteditable]').forEach(td=>{td.oninput=()=>{const tr=td.closest('tr');const pane=+tr.dataset.pane;const st=stateBundle.panes[pane];const c=st.verses[+tr.dataset.v].clauses[+tr.dataset.c];c.ann=c.ann||{};c.ann[td.dataset.col]=td.innerText;if(autosaveReady)autoSaveProject();};});",
        "document.querySelectorAll('.parallel-ann-table td[contenteditable]').forEach(td=>{applyLtrAnnotationInput(td);td.oninput=()=>{const tr=td.closest('tr');const pane=+tr.dataset.pane;const st=stateBundle.panes[pane];const c=st.verses[+tr.dataset.v].clauses[+tr.dataset.c];c.ann=c.ann||{};c.ann[td.dataset.col]=td.innerText;if(autosaveReady)autoSaveProject();};});",
    ),
]


def verify(html: str) -> None:
    size = len(html.encode("utf-8"))
    if size < 15_000_000:
        raise SystemExit(f"index.html too small after patch ({size} bytes)")
    for needle in (
        "applyLtrAnnotationInput",
        MARKER,
        "function renderTable",
        "WLC_TEXT",
    ):
        if needle not in html:
            raise SystemExit(f"Missing expected content after patch: {needle}")
    if ".lang-hebrew #modalInput," in html:
        raise SystemExit("Hebrew modalInput RTL rule still present")


def main():
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Comment LTR fix already applied.")
        return

    if "function applyLtrAnnotationInput" in html:
        raise SystemExit("applyLtrAnnotationInput already exists without marker")

    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Could not find replacement anchor:\n{old[:120]}...")
        html = html.replace(old, new, 1)

    css_anchor = "/* Typography pass: language-scoped script fonts */"
    if css_anchor not in html:
        raise SystemExit("Could not find CSS anchor")
    html = html.replace(css_anchor, CSS_BLOCK + css_anchor, 1)

    verify(html)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied comment LTR fix ({len(html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
