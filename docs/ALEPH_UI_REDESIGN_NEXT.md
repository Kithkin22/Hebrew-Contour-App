# Aleph Contour — Next UI Redesign Pass (Guidance)

**Status:** Guidance only — not approved for immediate implementation.

**Current production baseline (keep until explicitly requested):**

- Stable pre-shell layout (File top-stack, main workspace, annotation tab panels as today)
- True-black dark mode (`styles/dark-mode-pro.css`) and selected-word contrast fixes

**Do not re-apply the July 2026 Aleph shell spike** (`ui-shell.js`, three-column nav, desktop menu bar) without a fresh review. That pass was reverted in commit `066ef3a`.

---

## Hard requirement: remove the annotation navigation bar

On the next redesign pass, **do not keep** the current annotation tab strip:

```
Color | Format | Highlight | Brackets | Arcs | Inclusio | Export
```

- Remove this tab bar entirely.
- **Do not** replace it with another horizontal tab strip or segmented nav.
- Surface the same tools through a cleaner toolbar, inspector sections, and/or contextual controls.

Implementation today lives in `js/app/annotations.js` (`#annotationTabsShell`, `#annotationTabsRow`). Future work should retire that pattern.

---

## Toolbar grouping (Undo / format / comments)

The compact strip above the document (when reintroduced in a future pass) must feel like **one coherent toolbar**, not scattered buttons.

Current pain points to fix:

- Undo, **B**, **I**, **U**, and Comments feel oddly spaced and disconnected
- Excessive horizontal gaps between unrelated actions
- Weak visual alignment across groups

**Direction:**

| Group | Actions |
|-------|---------|
| History | Undo (Redo when available) |
| Format | Bold, Italic, Underline |
| Markup | Color, Highlight (compact — swatches or popover, not a tab panel) |
| Structure | Brackets, Arcs, Inclusio (inspector or expandable sub-panels) |
| Collaboration | Comments |
| Output | Export (may also live in File/Export menu) |

Use consistent button sizing, tight intra-group spacing, and clear inter-group dividers — not large empty regions.

---

## Preserve functionality (non-negotiable)

Only change **how** tools are surfaced. Do not remove:

- Color
- Format (bold, italic, underline, double underline, clear formatting, text cleanup, hide/restore word)
- Highlight
- Brackets
- Arcs
- Inclusio
- Comments
- Undo
- Export (contour/table PDF, DOCX, HTML, JSON as applicable)

Regression-test each after any UI move.

---

## Design goal

The application should feel like a professional writing and analysis environment (Pages, Craft, Logos, GoodNotes dark mode) — not a web form or settings dashboard.

- **Document is the hero** — Hebrew/Greek text draws the eye first.
- Annotation controls are **lightweight, compact, and secondary**.
- Avoid large navigation or tool panels that dominate vertical space.
- Progressive disclosure: show arc/inclusio/bracket *options* when relevant, not all at once.
- Keep true-black dark mode direction and readable selection/highlight contrast.

---

## Suggested integration map (for planning only)

| Tool | Preferred surface (next pass) |
|------|-------------------------------|
| Undo | Toolbar left cluster |
| Bold / Italic / Underline | Toolbar format cluster |
| Color / Highlight | Toolbar popovers or inspector “Formatting” when word selected |
| Brackets / Arcs / Inclusio | Inspector “Structure” when word/clause selected, or slim toolbar overflow |
| Comments | Toolbar button + right inspector / comments dock |
| Export | File menu primary; optional toolbar shortcut |

Exact layout TBD during design review — this table is intent, not a spec.

---

## References

- Long-term HCDS principles: [HCDS_UI_VISION.md](./HCDS_UI_VISION.md) (§11 Annotation Ribbon — align with compact ribbon, not tab panels)
- Reverted shell work: git history `ebfa8c1` (added) → `066ef3a` (reverted shell, kept dark mode)
