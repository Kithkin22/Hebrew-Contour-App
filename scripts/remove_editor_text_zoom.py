#!/usr/bin/env python3
"""Remove editor text zoom UI/CSS/JS from index.html (inverse of apply_editor_text_zoom)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

MARKER_CSS = "/* editor-text-zoom-v1 */"
MARKER_JS = "/* editor-text-zoom-v1-js */"
CSS_END = "#contourWorkspaceShell.hidden{display:none!important;}"
HTML_START = '      <div class="toolbar-section editor-zoom-bar" id="editorZoomBar">'
HTML_END = '      <div class="parallel-mode-bar desktop-only" id="parallelModeBar">'

RENDER_WITH_ZOOM = (
    "if(autosaveReady)autoSaveProject();"
    "if(typeof initEditorTextZoom==='function')initEditorTextZoom();"
    "scheduleEditorLayoutFix();}"
)
RENDER_WITHOUT_ZOOM = "if(autosaveReady)autoSaveProject();scheduleEditorLayoutFix();}"


def remove_block(text: str, start: str, end: str) -> str:
    i = text.find(start)
    if i < 0:
        return text
    j = text.find(end, i + len(start))
    if j < 0:
        raise SystemExit(f"Could not find end anchor after {start!r}")
    return text[:i] + text[j:]


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")
    before = len(text)
    changed = False

    if MARKER_CSS in text:
        text = remove_block(text, MARKER_CSS, CSS_END)
        changed = True

    if 'id="editorZoomBar"' in text:
        text = remove_block(text, HTML_START, HTML_END)
        changed = True

    if MARKER_JS in text:
        text = remove_block(text, MARKER_JS, "/* editor-overflow-fix-v1-js */")
        changed = True

    if RENDER_WITH_ZOOM in text:
        text = text.replace(RENDER_WITH_ZOOM, RENDER_WITHOUT_ZOOM, 1)
        changed = True

    if not changed:
        print("Editor text zoom already removed.")
        return

    INDEX.write_text(text, encoding="utf-8")
    print(f"Removed editor text zoom from {INDEX.name} ({before:,} -> {len(text):,} chars)")


if __name__ == "__main__":
    main()
