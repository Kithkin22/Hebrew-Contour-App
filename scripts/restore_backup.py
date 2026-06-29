#!/usr/bin/env python3
"""Restore index.html from automatic backups in .backups/

Usage:
    python3 scripts/restore_backup.py              # list backups
    python3 scripts/restore_backup.py latest       # restore newest
    python3 scripts/restore_backup.py index.html.20250629T120000Z
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / ".backups"
INDEX = ROOT / "index.html"


def list_backups() -> list[Path]:
    if not BACKUP_DIR.is_dir():
        return []
    return sorted(BACKUP_DIR.glob("index.html.*"), key=lambda p: p.stat().st_mtime)


def main() -> int:
    backups = list_backups()
    if len(sys.argv) < 2:
        if not backups:
            print("No backups in .backups/")
            return 0
        print("Available backups (newest last):")
        for p in backups:
            print(f"  {p.name}  ({p.stat().st_size:,} bytes)")
        print("\nRestore with: python3 scripts/restore_backup.py latest")
        return 0

    arg = sys.argv[1]
    if arg == "latest":
        if not backups:
            print("No backups found.")
            return 1
        src = backups[-1]
    else:
        src = BACKUP_DIR / arg
        if not src.is_file():
            print(f"Backup not found: {src}")
            return 1

    # Safety copy of current file
    if INDEX.is_file():
        dest = BACKUP_DIR / f"index.html.pre-restore"
        shutil.copy2(INDEX, dest)
        print(f"Saved current index.html → {dest.relative_to(ROOT)}")

    shutil.copy2(src, INDEX)
    print(f"Restored {src.relative_to(ROOT)} → index.html ({src.stat().st_size:,} bytes)")
    print("Run: python3 scripts/validate.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
