#!/usr/bin/env python3
"""Move annotation shortcuts to Help modal; remove cryptic toolbar keycaps."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

CSS = """
.help-section-title{font-size:15px;font-weight:800;margin:16px 0 8px;color:var(--ui-text,#1f2d3d);}
.help-shortcut-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px 12px;margin:8px 0 16px;}
.help-shortcut-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--ui-line,#d8e1ea);border-radius:8px;background:var(--ui-surface-2,#f8fafc);}
.help-shortcut-name{font-size:13px;font-weight:600;color:var(--ui-text,#1f2d3d);}
"""

HELP_GRID = """
    <h4 class="help-section-title">Formatting &amp; color</h4>
    <div class="help-shortcut-grid" aria-label="Formatting keyboard shortcuts">
      <div class="help-shortcut-item"><span class="help-shortcut-name">Bold</span><kbd class="keycap">b</kbd></div>
      <div class="help-shortcut-item"><span class="help-shortcut-name">Italic</span><kbd class="keycap">i</kbd></div>
      <div class="help-shortcut-item"><span class="help-shortcut-name">Underline</span><kbd class="keycap">u</kbd></div>
      <div class="help-shortcut-item"><span class="help-shortcut-name">Double underline</span><kbd class="keycap">Shift+U</kbd></div>
      <div class="help-shortcut-item"><span class="help-shortcut-name">Text color</span><kbd class="keycap">c</kbd></div>
      <div class="help-shortcut-item"><span class="help-shortcut-name">Highlight</span><kbd class="keycap">h</kbd></div>
    </div>
    <h4 class="help-section-title">Contour editing</h4>
"""

TOOLBAR_HINT = (
    '<span id="annotationShortcutHint"><span class="shortcut-label">Shortcuts</span>'
    '<kbd class="keycap">b</kbd><kbd class="keycap">i</kbd><kbd class="keycap">u</kbd>'
    '<kbd class="keycap">Shift+U</kbd><kbd class="keycap">c</kbd><kbd class="keycap">h</kbd></span>'
)

FORMAT_ROWS = """        <tr><td><span class="kbd">b</span> / <span class="kbd">i</span> / <span class="kbd">u</span></td><td>Bold / italic / underline</td></tr>
        <tr><td><span class="kbd">Shift+U</span></td><td>Double underline</td></tr>
        <tr><td><span class="kbd">c</span> / <span class="kbd">h</span></td><td>Open color / highlight picker</td></tr>
"""


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1, found {n}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")
    orig_len = len(text)

    if ".help-section-title{" not in text:
        text = replace_once(
            text,
            ".help-table th{background:var(--ui-surface-2,#f8fafc);}\n.editor-empty-state",
            ".help-table th{background:var(--ui-surface-2,#f8fafc);}" + CSS + ".editor-empty-state",
            "help shortcut css",
        )

    if 'class="help-shortcut-grid"' not in text:
        text = replace_once(
            text,
            "    <p class=\"muted\">Select a word in the Contour Editor, then use these shortcuts (when not typing in a text field).</p>\n    <table class=\"help-table\">",
            "    <p class=\"muted\">Select a word in the Contour Editor, then use these shortcuts (when not typing in a text field).</p>\n"
            + HELP_GRID
            + "    <table class=\"help-table\">",
            "help shortcut grid",
        )

    if FORMAT_ROWS in text:
        text = text.replace(FORMAT_ROWS, "", 1)

    if TOOLBAR_HINT in text:
        text = text.replace(TOOLBAR_HINT, "", 1)

    if len(text) < orig_len * 0.9 or "function startApp" not in text or not text.rstrip().endswith("</html>"):
        raise SystemExit("integrity check failed")

    if len(text) == orig_len:
        print("Shortcut help already applied.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({orig_len} -> {len(text)} bytes)")


if __name__ == "__main__":
    main()
