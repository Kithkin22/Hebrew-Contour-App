#!/usr/bin/env python3
"""Text-first layout: 75% contour canvas, 25% comments, reduced chrome."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = 'href="styles/text-first.css"'

LINK = '  <link rel="stylesheet" href="styles/text-first.css">\n'
ANCHOR = '  <link rel="stylesheet" href="styles/layout-modern.css">\n'


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")
    if MARKER in text:
        print("text-first.css link already present.")
        return
    if ANCHOR not in text:
        raise SystemExit("layout-modern.css link not found in index.html")
    text = text.replace(ANCHOR, ANCHOR + LINK, 1)
    INDEX.write_text(text, encoding="utf-8")
    print(f"Patched {INDEX.name}: linked styles/text-first.css")


if __name__ == "__main__":
    main()
