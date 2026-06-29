#!/usr/bin/env python3
"""Extract inline CSS/JS from index.html into maintainable modules.

Safe to re-run when index.html still contains embedded <style> and <script> blocks.
Idempotent when index.html is already a shell (skips if no inline app script).
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
BACKUP_DIR = ROOT / ".backups"
CSS_OUT = ROOT / "css" / "app.css"
DATA_DIR = ROOT / "js" / "data"
APP_DIR = ROOT / "js" / "app"

# (filename, start_line_index, end_line_index_exclusive) — indices into main script lines
APP_MODULES = [
    ("core.js", 11, 249),
    ("undo.js", 249, 261),
    ("layout.js", 261, 699),
    ("file-menu.js", 699, 924),
    ("arcs.js", 924, 986),
    ("keyboard.js", 986, 1068),
    ("annotations.js", 1068, 1220),
    ("theme.js", 1220, 1255),
    ("inspector.js", 1255, 1743),
    ("inspector-morph.js", 1743, 2001),
    ("ui-init.js", 2001, None),
]

SHELL_HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hebrew/Greek Contour Table App</title>
<link rel="stylesheet" href="css/app.css">
<link rel="stylesheet" href="styles/design-system.css">
<link rel="stylesheet" href="styles/layout-modern.css">
<link rel="stylesheet" href="styles/text-first.css">
</head>
"""

SCRIPT_TAGS = """
<script src="js/data/books.js"></script>
<script src="js/data/wlc-text.js"></script>
<script src="js/app/core.js"></script>
<script src="js/app/undo.js"></script>
<script src="js/app/layout.js"></script>
<script src="js/app/file-menu.js"></script>
<script src="js/app/arcs.js"></script>
<script src="js/app/keyboard.js"></script>
<script src="js/app/annotations.js"></script>
<script src="js/app/theme.js"></script>
<script src="js/app/inspector.js"></script>
<script src="js/app/inspector-morph.js"></script>
<script src="js/app/ui-init.js"></script>
<script src="sefaria-bdb.js"></script>
<script src="greek-lexicon.js"></script>
<script src="js/ui-shell.js" defer></script>
"""


def backup_index() -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = BACKUP_DIR / f"index.html.{stamp}"
    shutil.copy2(INDEX, dest)
    print(f"Backup: {dest.relative_to(ROOT)}")
    return dest


def parse_index(html: str) -> tuple[str, str, str, str]:
    style_m = re.search(r"<style>(.*?)</style>", html, re.S)
    if not style_m:
        raise SystemExit("No <style> block found in index.html")
    css = style_m.group(1).strip() + "\n"

    gate_pos = html.find("gate.js")
    if gate_pos < 0:
        raise SystemExit("gate.js script tag not found")
    script_open = html.find("<script>", gate_pos)
    if script_open < 0:
        raise SystemExit("Main inline <script> not found (already modular?)")
    script_start = script_open + len("<script>")
    script_end = html.find("</script>", script_start)
    if script_end < 0:
        raise SystemExit("Main </script> not found")
    main_js = html[script_start:script_end]

    body_start = html.find("<body>")
    body_end = html.rfind("</body>")
    if body_start < 0 or body_end < 0:
        raise SystemExit("<body> not found")
    body = html[body_start:body_end + len("</body>")]

    # HTML shell: body without inline script block
    body = body[: script_open - body_start] + body[script_end + len("</script>") - body_start :]
    body = body.strip() + "\n"

    return css, main_js, body, html[: style_m.start()] + html[style_m.end() :]


def extract_books_and_wlc(lines: list[str]) -> tuple[str, str]:
    wlc_idx = None
    for i, line in enumerate(lines):
        if line.startswith("const WLC_TEXT"):
            wlc_idx = i
            break
    if wlc_idx is None:
        raise SystemExit("const WLC_TEXT not found in main script")
    books = "\n".join(lines[1:wlc_idx]).strip() + "\n"
    wlc = lines[wlc_idx].strip() + "\n"
    if not books.startswith("const BOOK_NAMES"):
        raise SystemExit("Expected BOOK_NAMES before WLC_TEXT")
    return books, wlc


def write_modules(css: str, lines: list[str]) -> list[Path]:
    written: list[Path] = []
    CSS_OUT.parent.mkdir(parents=True, exist_ok=True)
    CSS_OUT.write_text(css, encoding="utf-8")
    written.append(CSS_OUT)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(parents=True, exist_ok=True)

    books, wlc = extract_books_and_wlc(lines)
    books_path = DATA_DIR / "books.js"
    wlc_path = DATA_DIR / "wlc-text.js"
    books_path.write_text(books, encoding="utf-8")
    wlc_path.write_text(wlc, encoding="utf-8")
    written.extend([books_path, wlc_path])

    for name, start, end in APP_MODULES:
        chunk = lines[start:end]
        text = "\n".join(chunk).strip() + "\n"
        path = APP_DIR / name
        path.write_text(text, encoding="utf-8")
        written.append(path)
    return written


def build_shell(body: str) -> str:
    return SHELL_HEAD + body + SCRIPT_TAGS + "\n</html>\n"


def already_modular(html: str) -> bool:
    return 'src="js/app/core.js"' in html and "<style>" not in html


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit(f"{INDEX} not found")

    html = INDEX.read_text(encoding="utf-8")
    if already_modular(html):
        print("index.html is already modular; nothing to extract.")
        return

    backup_index()
    css, main_js, body, _ = parse_index(html)
    lines = main_js.splitlines()
    print(f"Main script: {len(lines)} lines, {len(main_js):,} chars")
    print(f"CSS: {len(css):,} chars")

    written = write_modules(css, lines)
    shell = build_shell(body)
    INDEX.write_text(shell, encoding="utf-8")
    print(f"Wrote shell index.html ({len(shell):,} chars)")
    for p in written:
        print(f"  {p.relative_to(ROOT)} ({p.stat().st_size:,} bytes)")

    validate = ROOT / "scripts" / "validate.py"
    if validate.is_file():
        result = subprocess.run([sys.executable, str(validate)], cwd=ROOT)
        if result.returncode != 0:
            raise SystemExit("validate.py failed after extraction")


if __name__ == "__main__":
    main()
