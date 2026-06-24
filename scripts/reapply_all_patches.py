#!/usr/bin/env python3
"""Re-apply all index.html patch scripts in dependency order.

index.html embeds the full WLC (~16MB). Git restores or agent edits often truncate it
or drop inline patches, which reverts the UI to the old stacked toolbars and hover menus.
Run this after restoring index.html from git or when layout looks wrong:

    python3 scripts/reapply_all_patches.py

Patches are idempotent (each script skips if already applied). Order matters: later
scripts depend on HTML/CSS from earlier ones (e.g. menu_layout_fix after phase_a).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SCRIPTS_DIR = Path(__file__).resolve().parent

# Dependency order — do not reorder without checking apply_*.py anchors.
PATCH_SCRIPTS = [
    "apply_phase_a.py",
    "apply_ui_polish.py",
    "apply_user_feedback.py",
    "apply_menu_layout_fix.py",
    "apply_shortcut_help.py",
    "apply_project_manager.py",
    "apply_bhsa_generate.py",
    "apply_parallel_passages.py",
    "apply_feedback_tickets.py",
    "apply_admin_link.py",
    "apply_admin_inbox_notify.py",
    "apply_bdb_inspector.py",
    "apply_greek_inspector.py",
    "apply_parsing_inspector.py",
    "apply_project_file_menu.py",
    "apply_parallel_pane_load.py",
    "apply_comment_ltr_fix.py",
    "apply_parallel_verse_align.py",
    "apply_parallel_align_ux.py",
    "apply_parallel_shift_right.py",
    "apply_parallel_align_simplify.py",
    "apply_workspace_maximize.py",
]

# Full WLC bundle is ~16.5MB; truncated restores are usually <15MB.
MIN_BYTES = 15_500_000
MAX_BYTES = 17_500_000
TARGET_BYTES = 16_500_000

LAYOUT_MARKERS = [
    "/* Phase A — click-to-open top menus",
    "/* UI review polish",
    "/* User feedback: click-menu panels",
    "/* Top menu layout fix — click-only stacked panels",
    "/* 1.3.8d3 full tabbed annotation pane */",
    "#annotationTabsShell",
    "top-menu-panel",
    "file-menu-card",
    "buildAnnotationTabs",
    "/* workspace-maximize-v1 */",
]


def extract_main_script(html: str) -> str:
    gate_pos = html.find("gate.js")
    if gate_pos < 0:
        raise SystemExit("gate.js script tag not found")
    start = html.find("<script>", gate_pos) + len("<script>")
    end = html.find("</script>", start)
    if end < 0:
        raise SystemExit("main </script> not found")
    return html[start:end]


def verify_index(html: str) -> None:
    size = len(html.encode("utf-8"))
    if size < MIN_BYTES:
        raise SystemExit(
            f"index.html too small ({size:,} bytes). "
            f"Expected ~{TARGET_BYTES:,}+ (WLC data may be truncated)."
        )
    if size > MAX_BYTES:
        raise SystemExit(f"index.html unexpectedly large ({size:,} bytes).")

    missing = [m for m in LAYOUT_MARKERS if m not in html]
    if missing:
        raise SystemExit("Missing layout markers after patches:\n  - " + "\n  - ".join(missing))

    script = extract_main_script(html)
    tmp = SCRIPTS_DIR / ".index_script_check.js"
    try:
        tmp.write_text(script, encoding="utf-8")
        result = subprocess.run(
            ["node", "--check", str(tmp)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise SystemExit(
                "index.html main <script> has a syntax error (UI JS will not run):\n"
                + (result.stderr or result.stdout or "node --check failed")
            )
    finally:
        if tmp.exists():
            tmp.unlink()

    print(f"Verified index.html: {size:,} bytes, JS syntax OK, layout markers present.")


def run_patch(name: str) -> None:
    path = SCRIPTS_DIR / name
    if not path.is_file():
        raise SystemExit(f"Missing patch script: {path}")
    print(f"\n--- {name} ---")
    result = subprocess.run([sys.executable, str(path)], cwd=ROOT)
    if result.returncode != 0:
        raise SystemExit(f"{name} failed with exit code {result.returncode}")


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit(f"{INDEX} not found")

    before = len(INDEX.read_bytes())
    print(f"index.html before: {before:,} bytes")

    for name in PATCH_SCRIPTS:
        run_patch(name)

    html = INDEX.read_text(encoding="utf-8")
    verify_index(html)

    after = len(html.encode("utf-8"))
    print(f"\nDone. index.html: {before:,} -> {after:,} bytes.")


if __name__ == "__main__":
    main()
