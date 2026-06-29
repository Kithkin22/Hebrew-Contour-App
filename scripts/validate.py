#!/usr/bin/env python3
"""Validate project integrity after edits.

Checks index.html shell size, module presence, JS syntax, and layout markers.
Exit 0 = OK, non-zero = stop and fix before continuing.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SCRIPTS_DIR = Path(__file__).resolve().parent

# Modular shell should be small; monolithic (pre-extract) is ~16.5MB.
SHELL_MAX_BYTES = 600_000
MONOLITH_MIN_BYTES = 15_500_000

REQUIRED_SCRIPTS = [
    "js/data/books.js",
    "js/data/wlc-text.js",
    "js/app/core.js",
    "js/app/ui-init.js",
    "gate.js",
    "sefaria-bdb.js",
    "greek-lexicon.js",
    "js/ui-shell.js",
]

REQUIRED_CSS = [
    "css/app.css",
    "styles/design-system.css",
    "styles/layout-modern.css",
    "styles/text-first.css",
]

LAYOUT_MARKERS = [
    "setWorkspaceTab",
    "buildAnnotationTabs",
    "scheduleEditorLayoutFix",
    "isWorkspaceTableView",
    "contourWorkspaceShell",
]

WLC_MARKERS = ["const WLC_TEXT"]


def check_js_syntax(path: Path) -> str | None:
    if path.stat().st_size > 8_000_000:
        # Huge data file — syntax-check only the first line prefix
        line = path.read_text(encoding="utf-8")[:200]
        if not line.startswith("const WLC_TEXT"):
            return f"{path}: expected WLC_TEXT assignment"
        return None
    result = subprocess.run(
        ["node", "--check", str(path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return (result.stderr or result.stdout or "syntax error").strip()
    return None


def validate_html_shell(html: str, size: int) -> list[str]:
    errors: list[str] = []
    if "<html" not in html or "</html>" not in html:
        errors.append("index.html: missing <html> root")
    if size > SHELL_MAX_BYTES and size < MONOLITH_MIN_BYTES:
        errors.append(
            f"index.html size {size:,} bytes looks truncated "
            f"(expected shell <{SHELL_MAX_BYTES:,} or monolith >{MONOLITH_MIN_BYTES:,})"
        )
    if size > MONOLITH_MIN_BYTES:
        if "<style>" in html:
            errors.append(
                "index.html is still monolithic with inline <style>. "
                "Run: python3 scripts/extract_modules.py"
            )
        gate = html.find("gate.js")
        if gate >= 0 and html.find("<script>", gate) >= 0:
            errors.append(
                "index.html has inline app <script>. "
                "Run: python3 scripts/extract_modules.py"
            )
    else:
        if "<style>" in html:
            errors.append("index.html shell must not contain inline <style>")
        if 'src="js/app/core.js"' not in html:
            errors.append("index.html missing js/app/core.js script tag")
    return errors


def main() -> int:
    errors: list[str] = []

    if not INDEX.is_file():
        print("FAIL: index.html not found")
        return 1

    html = INDEX.read_text(encoding="utf-8")
    size = len(html.encode("utf-8"))
    errors.extend(validate_html_shell(html, size))

    for rel in REQUIRED_CSS + REQUIRED_SCRIPTS:
        path = ROOT / rel
        if not path.is_file():
            errors.append(f"Missing file: {rel}")
        elif path.stat().st_size == 0:
            errors.append(f"Empty file: {rel}")

    wlc = ROOT / "js/data/wlc-text.js"
    if wlc.is_file():
        wlc_size = wlc.stat().st_size
        if wlc_size < 14_000_000:
            errors.append(f"js/data/wlc-text.js too small ({wlc_size:,} bytes) — may be truncated")
        wlc_head = wlc.read_text(encoding="utf-8")[:40]
        if not wlc_head.startswith("const WLC_TEXT"):
            errors.append("js/data/wlc-text.js does not start with const WLC_TEXT")

    for rel in REQUIRED_SCRIPTS:
        path = ROOT / rel
        if path.is_file():
            err = check_js_syntax(path)
            if err:
                errors.append(f"{rel}: {err}")

    app_dir = ROOT / "js/app"
    if app_dir.is_dir():
        for js in sorted(app_dir.glob("*.js")):
            err = check_js_syntax(js)
            if err:
                errors.append(f"{js.relative_to(ROOT)}: {err}")
        combined = "\n".join(
            (app_dir / f).read_text(encoding="utf-8") for f in sorted(p.name for p in app_dir.glob("*.js"))
        )
        for m in LAYOUT_MARKERS:
            if m not in combined:
                errors.append(f"js/app/* missing layout marker: {m}")

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    mode = "modular" if size < SHELL_MAX_BYTES else "monolithic"
    print(f"OK ({mode}): index.html {size:,} bytes, all modules present, JS syntax valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
