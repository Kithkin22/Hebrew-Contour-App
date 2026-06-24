#!/usr/bin/env python3
"""Apply safe UI-only polish to index.html without corrupting embedded WLC data."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

EMPTY_STATE_HTML = (
    '<div class="editor-empty-state" dir="ltr">'
    '<p class="editor-empty-title">No text loaded yet</p>'
    '<p class="muted">Generate a passage from WLC, paste Hebrew/Greek text, or load the Ruth sample.</p>'
    '<div class="editor-empty-actions">'
    '<button type="button" class="btn primary" id="emptyGenerateBtn">Generate Ruth 3:4</button>'
    '<button type="button" class="btn" id="emptyPasteBtn">Paste text</button>'
    '<button type="button" class="btn good" id="emptySampleBtn">Load sample</button>'
    '</div></div>'
)

UI_POLISH_CSS = """
/* UI review polish — labels, comments button, mobile, dark contrast */
.top-menu-hint{
  flex:1 1 100%;
  margin:0 0 4px;
  font-size:13px;
  line-height:1.45;
  color:var(--ui-muted,#64748b);
}
.password-gate-hint{
  margin:0 0 14px;
  color:var(--ui-muted,#666);
  font-size:14px;
  line-height:1.45;
}
.top-stack .card.compact-card[data-menu="generate"] > .menu-trigger::before{content:"＋ ";}
.top-stack .card.compact-card[data-menu="paste"] > .menu-trigger::before{content:"📋 ";}
.top-stack .card.compact-card[data-menu="project"] > .save-tools-title::before{content:"📁 ";}
.top-stack .card.compact-card:nth-child(1) > strong:first-child::before,
.top-stack .card.compact-card:nth-child(2) > strong:first-child::before,
.top-stack .card.compact-card:nth-child(3) > .save-tools-title::before{content:none!important;}
.top-stack .card.compact-card:has(.save-tools-title) > .save-tools-title::before{
  content:"📁 " !important;
}
#showCommentsPanel{
  position:static!important;
  right:auto!important;
  top:auto!important;
  z-index:auto!important;
  margin-left:auto!important;
}
#persistentShowComments{
  position:fixed!important;
  right:16px!important;
  bottom:16px!important;
  top:auto!important;
  left:auto!important;
  max-width:calc(100vw - 32px);
}
@media(min-width:901px){
  #persistentShowComments{display:none!important;}
}
@media(max-width:900px){
  #showCommentsPanel{display:none!important;}
  #persistentShowComments.show{display:block!important;}
  .top-stack .card.compact-card > .menu-trigger,
  .top-stack .card.compact-card > .save-tools-title{
    width:100%!important;
    justify-content:space-between!important;
    font-size:17px!important;
  }
  #themeToggleBtn,#inspectorToggleBtn,#manualInspectorBtn{
    flex:1 1 calc(50% - 6px)!important;
    min-height:42px!important;
  }
  #annotationTabsRow{
    overflow-x:auto!important;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:thin;
  }
  .annotation-tab-btn{
    flex:0 0 auto!important;
    padding:10px 10px 8px!important;
  }
}
body.dark-mode .clause.selected{
  background:#1a3048!important;
  outline-color:#6db5ff!important;
}
body.dark-mode #persistentShowComments{
  background:var(--ui-surface,#17212b)!important;
  color:var(--ui-text,#e8eef5)!important;
  border-color:var(--ui-line,#314253)!important;
}
#topMenuBackdrop.show{
  pointer-events:auto!important;
}
#helpBtn[title]{cursor:help;}
"""

PASSWORD_HINT = (
    '    <p class="password-gate-hint">'
    "Enter the access password to open the contour editor. "
    "Your session stays unlocked until you close this browser tab."
    "</p>\n"
)

TOP_MENU_HINT = (
    '  <p class="muted top-menu-hint">'
    "Click or tap a menu to generate text, paste from Logos, or save your project."
    "</p>\n"
)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    original_len = len(text)

    if "/* UI review polish" not in text:
        text = replace_once(
            text,
            "  .top-stack .card.compact-card.menu-open > .row{width:calc(100vw - 72px)!important;max-width:600px;}\n}\n\n</style>",
            "  .top-stack .card.compact-card.menu-open > .row{width:calc(100vw - 72px)!important;max-width:600px;}\n}\n"
            + UI_POLISH_CSS
            + "\n</style>",
            "UI polish CSS",
        )

    if 'class="password-gate-hint"' not in text:
        text = replace_once(
            text,
            "    <h2>Enter Password</h2>\n    <input type=\"password\"",
            "    <h2>Enter Password</h2>\n" + PASSWORD_HINT + "    <input type=\"password\"",
            "password hint",
        )
        text = replace_once(
            text,
            'spellcheck="false">',
            'spellcheck="false" aria-describedby="passwordGateError">',
            "password aria",
        )

    if 'class="muted top-menu-hint"' not in text:
        text = replace_once(
            text,
            '  <div class="top-stack">\n  <div class="card compact-card" data-menu="generate">',
            '  <div class="top-stack">\n' + TOP_MENU_HINT + '  <div class="card compact-card" data-menu="generate">',
            "top menu hint",
        )

    if "Project save / restore" in text:
        text = replace_once(
            text,
            '<strong class="save-tools-title menu-trigger">Project save / restore</strong>',
            '<strong class="save-tools-title menu-trigger">Project</strong>',
            "project label",
        )

    if 'title="Keyboard shortcuts' not in text:
        text = replace_once(
            text,
            'id="helpBtn" aria-haspopup="dialog" aria-controls="helpModal">? Help</button>',
            'id="helpBtn" aria-haspopup="dialog" aria-controls="helpModal" title="Keyboard shortcuts and tips">? Help</button>',
            "help title",
        )

    if "editor-empty-state" not in text:
        pattern = (
            r"if\(!state\.verses\.length\)\{ed\.innerHTML="
            r"'<span class=\"muted\" dir=\"ltr\">Paste text above to begin\.</span>';"
            r"hideCommentPopover\(\);return;\}"
        )
        replacement = (
            "if(!state.verses.length){ed.innerHTML="
            + repr(EMPTY_STATE_HTML)
            + ";bindEmptyStateActions();hideCommentPopover();return;}"
        )
        new_text, n = re.subn(pattern, replacement, text, count=1)
        if n != 1:
            raise SystemExit(f"empty state: expected 1 regex match, found {n}")
        text = new_text

    if "function startApp" not in text:
        raise SystemExit("integrity check failed: startApp missing")

    if len(text) == original_len:
        print("UI polish already applied.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({original_len} -> {len(text)} chars)")


if __name__ == "__main__":
    main()
