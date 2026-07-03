# Aleph Contour — UI Redesign v1 (`ui-redesign-v1`)

Design-system-first presentation refresh. **All existing workflows preserved** unless noted.

## Branch

`ui-redesign-v1` — review visually before merging to `main`.

## Assets wired

| File | Role |
|------|------|
| `styles/aleph-tokens.css` | Aleph palette, 8pt spacing, shell surfaces, menus, toolbar |
| `styles/layout-modern.css` | Three-column shell (sidebar \| document \| inspector) |
| `styles/text-first.css` | Document-first sizing; compact chrome |
| `js/ui-shell.js` | DOM restructuring into Aleph layout |
| `js/hc-nav-menus.js` | Project + Export flyouts (existing handlers) |
| `js/aleph-menus.js` | Edit / Insert / View / Help flyouts |

## UI improvements

### Layout & shell
- Three-column workspace: **Navigation sidebar** | **Document** | **Inspector / Comments**
- Top **menu bar**: Project, Edit, Insert, View, Export, Help + project name + inspector/theme controls
- **Secondary toolbar**: parallel passage controls, morph import, reference display
- **Status bar**: word/char/row counts, autosave hint
- Collapsible sidebar; inspector panel toggle preserved
- Table View **replaces** Contour View (not stacked underneath)

### Design system
- Aleph academic palette (`#F7F7F5`, `#EFEFEA`, `#FAFAF8`)
- Inter for UI; Hebrew text unchanged (SBL BibLit via existing CSS)
- 8-point spacing scale via CSS custom properties
- Subtle 150–180ms transitions on menus and buttons
- Empty states: sidebar notes, legend hint, inspector placeholder, attachments placeholder

### Navigation
- Sidebar sections: **Project**, **Outline** (verse nav), **Legend**, **Notes**, **Attachments** (placeholder)
- Desktop menus proxy existing file/generate/paste/export handlers — no new save logic

### Document toolbar
- Unified strip: **Undo**, **Bold / Italic / Underline**, **Comments**, plus tabbed **Color / Format / Highlight / Brackets / Arcs / Inclusio / Export** tools
- Annotation tabs relocated into toolbar (progressive disclosure)

### Inspector
- Docked in right panel with tabbed **Inspector** / **Comments**
- Empty state: “Select a word to inspect…”

### Cleanup
- Branding: **Aleph Contour**
- Removed emoji from comment buttons
- Legacy top-stack and duplicate view tabs hidden when shell is active

## Local preview

```bash
cd /path/to/Hebrew-Contour-App
python3 -m http.server 8899
```

Open `http://localhost:8899` — gate password: `AMBS`.

## Recommendations (future)

1. **Lucide icons** — replace text/unicode toolbar glyphs with a single icon set
2. **Inspector progressive disclosure** — show Word / Lemma / Root / Parsing / Notes sections based on selection type (word vs clause)
3. **Redo stack** — Edit menu lists Redo but app only supports Undo today
4. **Export menu labels** — simplify to user-facing PDF/DOCX/HTML/JSON groupings while keeping contour vs table variants
5. **Mobile** — inspector slide-over sheet; sidebar overlay drawer
6. **Shared package** — extract `aleph-tokens.css` + shell JS into `@aleph/design-system` for Read / Study / Translate

## Functionality needing discussion before change

- Moving **Inclusio** and **Text Cleanup** into inspector-only flows (currently in annotation tabs / format row)
- Consolidating duplicate **export** buttons (toolbar tab vs menu vs contour row) into menu-only
- Whether **hover inspector** should remain in addition to docked inspector, or selection-only
