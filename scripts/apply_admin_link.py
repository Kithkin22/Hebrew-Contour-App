#!/usr/bin/env python3
"""Add discreet admin inbox link to main app workspace toolbar."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SW = ROOT / "service-worker.js"

ADMIN_CSS = """
/* Discreet admin inbox link (feedback review) */
.admin-link{
  font-size:12px;
  font-weight:600;
  color:var(--ui-muted,#64748b);
  text-decoration:none;
  padding:4px 6px;
  border-radius:6px;
  opacity:.72;
}
.admin-link:hover,.admin-link:focus{
  opacity:1;
  color:var(--ui-blue,#286090);
  text-decoration:underline;
  outline:none;
}
body.dark-mode .admin-link{color:#94a3b8;}
body.dark-mode .admin-link:hover,body.dark-mode .admin-link:focus{color:#6db5ff;}
"""

ADMIN_LINK_HTML = (
    '<a href="/admin.html" id="adminLink" class="admin-link" '
    'title="Feedback admin inbox (password required)">Admin</a>'
)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def main():
    text = INDEX.read_text(encoding="utf-8")

    if 'id="adminLink"' not in text:
        text = replace_once(
            text,
            "#helpBtn[title]{cursor:help;}\n\n/* User feedback: click-menu panels, keycap shortcuts */",
            "#helpBtn[title]{cursor:help;}\n" + ADMIN_CSS + "\n/* User feedback: click-menu panels, keycap shortcuts */",
            "admin link CSS",
        )
        text = replace_once(
            text,
            '<button type="button" class="btn" id="helpBtn" aria-haspopup="dialog" aria-controls="helpModal" title="Keyboard shortcuts and tips">? Help</button>\n    </div>',
            '<button type="button" class="btn" id="helpBtn" aria-haspopup="dialog" aria-controls="helpModal" title="Keyboard shortcuts and tips">? Help</button>\n      '
            + ADMIN_LINK_HTML
            + "\n    </div>",
            "admin link HTML",
        )

    sw = SW.read_text(encoding="utf-8")
    if "contour-app-pwa-v19" in sw:
        sw = sw.replace("contour-app-pwa-v19", "contour-app-pwa-v20", 1)
        SW.write_text(sw, encoding="utf-8")
        print(f"Bumped {SW} cache to v20")
    elif "contour-app-pwa-v20" not in sw:
        raise SystemExit("Unexpected service-worker cache version")

    INDEX.write_text(text, encoding="utf-8")
    print(f"Updated {INDEX} ({len(text)} chars)")


if __name__ == "__main__":
    main()
