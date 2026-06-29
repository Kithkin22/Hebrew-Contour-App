#!/usr/bin/env python3
"""Create a checkpoint commit before making changes.

Usage:
    python3 scripts/checkpoint.py "optional message suffix"

Requires a clean working tree (except .backups/ and *.truncated.bak).
"""
from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IGNORE_UNTRACKED = {".backups", "index.html.truncated.bak"}


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


def is_ignored_untracked(path: str) -> bool:
    p = Path(path)
    if p.name.endswith(".truncated.bak"):
        return True
    return any(part in IGNORE_UNTRACKED for part in p.parts)


def main() -> int:
    status = git("status", "--porcelain")
    if status.returncode != 0:
        print(status.stderr)
        return 1

    dirty = []
    for line in status.stdout.splitlines():
        if not line.strip():
            continue
        path = line[3:].strip()
        if line.startswith("??") and is_ignored_untracked(path):
            continue
        dirty.append(line)

    if dirty:
        print("Working tree is not clean. Commit or stash first:")
        for line in dirty:
            print(f"  {line}")
        return 1

    validate = subprocess.run([sys.executable, str(ROOT / "scripts" / "validate.py")], cwd=ROOT)
    if validate.returncode != 0:
        print("Checkpoint blocked: fix validation errors first.")
        return 1

    suffix = " ".join(sys.argv[1:]).strip()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    msg = f"checkpoint: {stamp}"
    if suffix:
        msg += f" — {suffix}"

    empty = git("commit", "--allow-empty", "-m", msg)
    if empty.returncode != 0:
        print(empty.stderr or empty.stdout)
        return 1

    sha = git("rev-parse", "--short", "HEAD").stdout.strip()
    print(f"Checkpoint created: {sha} — {msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
