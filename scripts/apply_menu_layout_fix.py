#!/usr/bin/env python3
"""Fix top menu overlap: click-only panels with normal stacked layout."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER = "/* Top menu layout fix — click-only stacked panels (v1.3.8e) */"

GENERATE_WRAP_OLD = """    <strong class="menu-trigger">Generate text</strong>
    <p class="muted">Choose Hebrew/WLC or Greek/SBLGNT, then generate into the editor.</p>

    <div class="generator-source-row">"""

GENERATE_WRAP_NEW = """    <strong class="menu-trigger">Generate text</strong>
    <div class="top-menu-panel">
    <p class="muted">Choose Hebrew/WLC or Greek/SBLGNT, then generate into the editor.</p>

    <div class="generator-source-row">"""

PASTE_WRAP_OLD = """    <strong class="menu-trigger">Paste text</strong>
    <p class="muted">Paste Hebrew/Greek text here. Each line becomes a verse/section.</p>
    <textarea id="pasteBox\""""

PASTE_WRAP_NEW = """    <strong class="menu-trigger">Paste text</strong>
    <div class="top-menu-panel">
    <p class="muted">Paste Hebrew/Greek text here. Each line becomes a verse/section.</p>
    <textarea id="pasteBox\""""

PROJECT_WRAP_OLD = """    <strong class="save-tools-title menu-trigger">Project</strong>
    <div class="row">"""

PROJECT_WRAP_NEW = """    <strong class="save-tools-title menu-trigger">Project</strong>
    <div class="top-menu-panel">
    <div class="row project-actions-row">"""

CLOSE_PANEL_BEFORE_CARD_END = """    <p id="saveStatus" class="muted small">Opens with a blank table. Use Save Project to keep work in this browser.</p>
  </div>"""

CLOSE_PANEL_BEFORE_CARD_END_NEW = """    <p id="saveStatus" class="muted small">Opens with a blank table. Use Save Project to keep work in this browser.</p>
    </div>
  </div>"""

# generate card closes before paste card
GEN_CLOSE_OLD = """    <p class="muted small">SBLGNT source files are provided by Faithlife/SBLGNT under CC BY 4.0; Hebrew source remains the bundled WLC.</p>
  </div>

  <div class="card compact-card" data-menu="paste">"""

GEN_CLOSE_NEW = """    <p class="muted small">SBLGNT source files are provided by Faithlife/SBLGNT under CC BY 4.0; Hebrew source remains the bundled WLC.</p>
    </div>
  </div>

  <div class="card compact-card" data-menu="paste">"""

PASTE_CLOSE_OLD = """      <button class="btn" id="sampleText">Load Sample</button>
    </div>
  </div>

  <div class="card compact-card" data-menu="project">"""

PASTE_CLOSE_NEW = """      <button class="btn" id="sampleText">Load Sample</button>
    </div>
    </div>
  </div>

  <div class="card compact-card" data-menu="project">"""

CSS_BLOCK = """
/* Top menu layout fix — click-only stacked panels (v1.3.8e) */
.top-stack .card.compact-card > .top-menu-panel{
  display:none!important;
}
.top-stack .card.compact-card.menu-open > .top-menu-panel{
  display:block!important;
  margin-top:12px!important;
}
.top-menu-panel > *{
  position:static!important;
  left:auto!important;
  top:auto!important;
  width:100%!important;
  max-width:100%!important;
  margin:10px 0 0!important;
  z-index:auto!important;
}
.top-menu-panel > *:first-child{
  margin-top:0!important;
}
.top-menu-panel > .generator-source-row,
.top-menu-panel > .generator-passage-row,
.top-menu-panel > .generator-reference-row,
.top-menu-panel > .row,
.top-menu-panel > .save-tools{
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  gap:8px!important;
}
.top-menu-panel > #pasteBox{
  display:block!important;
  width:100%!important;
  min-height:88px!important;
  box-sizing:border-box!important;
}
.top-menu-panel > p.muted.small,
.top-menu-panel > #saveStatus,
.top-menu-panel > #wlcStatus{
  display:block!important;
  font-size:12px!important;
  line-height:1.45!important;
  color:var(--ui-muted,#64748b)!important;
}
.top-menu-panel > #saveStatus,
.top-menu-panel > p.muted.small:last-child{
  padding-top:10px!important;
  margin-top:14px!important;
  border-top:1px solid var(--ui-line,#d8e1ea)!important;
}
.top-stack .card.compact-card:not(.menu-open) > .top-menu-panel,
.top-stack .card.compact-card:not(.menu-open):hover > p,
.top-stack .card.compact-card:not(.menu-open):hover > div:not(.top-menu-panel),
.top-stack .card.compact-card:not(.menu-open):hover > textarea,
.top-stack .card.compact-card:not(.menu-open):hover > input,
.top-stack .card.compact-card:not(.menu-open):hover > #pasteBox,
.top-stack .card.compact-card:not(.menu-open):hover > #wlcStatus,
.top-stack .card.compact-card:not(.menu-open):hover > .generator-source-row,
.top-stack .card.compact-card:not(.menu-open):hover > .generator-passage-row,
.top-stack .card.compact-card:not(.menu-open):hover > .generator-reference-row,
.top-stack .card.compact-card:not(.menu-open):hover > .row,
.top-stack .card.compact-card:not(.menu-open):focus-within > p,
.top-stack .card.compact-card:not(.menu-open):focus-within > div:not(.top-menu-panel),
.top-stack .card.compact-card:not(.menu-open):focus-within > textarea,
.top-stack .card.compact-card:not(.menu-open):focus-within > input,
.top-stack .card.compact-card:not(.menu-open):focus-within > #pasteBox,
.top-stack .card.compact-card:not(.menu-open):focus-within > #wlcStatus,
.top-stack .card.compact-card:not(.menu-open):focus-within > .generator-source-row,
.top-stack .card.compact-card:not(.menu-open):focus-within > .generator-passage-row,
.top-stack .card.compact-card:not(.menu-open):focus-within > .generator-reference-row,
.top-stack .card.compact-card:not(.menu-open):focus-within > .row{
  display:none!important;
}
.top-stack .card.compact-card:not(.menu-open):hover::before,
.top-stack .card.compact-card:not(.menu-open):hover::after,
.top-stack .card.compact-card:not(.menu-open):focus-within::before,
.top-stack .card.compact-card:not(.menu-open):focus-within::after{
  display:none!important;
  content:none!important;
}
.top-stack .card.compact-card.menu-open:hover > .top-menu-panel,
.top-stack .card.compact-card.menu-open:focus-within > .top-menu-panel,
.top-stack .card.compact-card.menu-open:hover > .top-menu-panel > *,
.top-stack .card.compact-card.menu-open:focus-within > .top-menu-panel > *,
.top-stack .card.compact-card.menu-open:hover > p,
.top-stack .card.compact-card.menu-open:hover > div,
.top-stack .card.compact-card.menu-open:focus-within > p,
.top-stack .card.compact-card.menu-open:focus-within > div,
.top-stack .card.compact-card:has(.save-tools-title).menu-open:hover > .row,
.top-stack .card.compact-card:has(.save-tools-title).menu-open:focus-within > .row,
.top-stack .card.compact-card:nth-child(3).menu-open:hover > .row,
.top-stack .card.compact-card:nth-child(3).menu-open:focus-within > .row{
  position:static!important;
  left:auto!important;
  top:auto!important;
}
.top-stack .card.compact-card.menu-open:hover::before,
.top-stack .card.compact-card.menu-open:hover::after,
.top-stack .card.compact-card.menu-open:focus-within::before,
.top-stack .card.compact-card.menu-open:focus-within::after{
  display:none!important;
  content:none!important;
}
.top-stack .card.compact-card.menu-open .project-actions-row .btn,
.top-stack .card.compact-card.menu-open .row .btn{
  flex:0 1 auto!important;
}
@media(max-width:900px){
  .top-stack .card.compact-card.menu-open .row .btn,
  .top-stack .card.compact-card.menu-open .project-actions-row .btn{
    flex:1 1 calc(50% - 4px)!important;
    min-width:0!important;
  }
}
"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if MARKER in text:
        print("Menu layout fix already applied.")
        return

    text = replace_once(text, GENERATE_WRAP_OLD, GENERATE_WRAP_NEW, "generate wrap open")
    text = replace_once(text, GEN_CLOSE_OLD, GEN_CLOSE_NEW, "generate wrap close")
    text = replace_once(text, PASTE_WRAP_OLD, PASTE_WRAP_NEW, "paste wrap open")
    text = replace_once(text, PASTE_CLOSE_OLD, PASTE_CLOSE_NEW, "paste wrap close")
    text = replace_once(text, PROJECT_WRAP_OLD, PROJECT_WRAP_NEW, "project wrap open")
    text = replace_once(text, CLOSE_PANEL_BEFORE_CARD_END, CLOSE_PANEL_BEFORE_CARD_END_NEW, "project wrap close")

    anchor = "</style>"
    if anchor not in text:
        raise SystemExit("Could not find </style>")
    text = text.replace(anchor, CSS_BLOCK + anchor, 1)

    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: {orig_len} -> {len(text)} bytes")


if __name__ == "__main__":
    main()
