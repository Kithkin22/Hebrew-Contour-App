# Development Guide — Hebrew Contour App

This document describes the modular project layout, safe editing workflow, and recovery procedures.

## Project structure

```
index.html              # Application shell only (~27 KB): HTML structure + asset links
gate.js                 # Password gate (runs before app unlocks)

css/
  app.css               # Core application styles (extracted from legacy inline CSS)

styles/
  design-system.css     # Design tokens and shell variables
  layout-modern.css     # Three-column workspace layout
  text-first.css        # 75/25 contour-first layout overrides

js/
  ui-shell.js           # Modern shell wrapper (top nav, sidebar, right panel)
  data/
    books.js            # BOOK_NAMES, GREEK_BOOKS, SBLGNT constants
    wlc-text.js         # WLC Hebrew text corpus (~16 MB) — rarely edited
  app/
    core.js             # State, parallel passages, editor render, generate, export
    undo.js             # Undo stack
    layout.js           # Editor overflow / workspace layout fixes
    file-menu.js        # File menu, new project, project I/O
    arcs.js             # Arc connector tool
    keyboard.js         # Keyboard shortcuts
    annotations.js      # Tabbed annotation pane
    theme.js            # Light/dark mode
    inspector.js        # Hover inspector shell
    inspector-morph.js  # MorphHB / parsing inspector
    ui-init.js          # Top menus, help modal, feedback, admin badge

scripts/
  validate.py           # Run after every significant edit
  checkpoint.py         # Create empty git checkpoint before risky work
  extract_modules.py    # Convert legacy monolithic index.html → modular layout
  restore_backup.py     # Restore index.html from .backups/
  reapply_all_patches.py # Legacy: patch monolithic index.html, then extract

sefaria-bdb.js          # BDB lexicon data
greek-lexicon.js        # Greek lexicon data
service-worker.js       # PWA cache manifest
```

### Where major features live

| Feature | Primary file(s) |
|---------|-----------------|
| Generate / WLC / BHSA / Greek | `js/app/core.js` |
| Parallel passages | `js/app/core.js` |
| Contour editor rendering | `js/app/core.js`, `css/app.css` |
| Table view | `js/app/core.js`, `css/app.css` |
| File menu / New project | `js/app/file-menu.js` |
| Project manager / autosave | `js/app/core.js`, `js/app/file-menu.js` |
| Comments panel | `js/app/annotations.js`, `css/app.css` |
| Arc connector | `js/app/arcs.js` |
| Inspector (BDB, Greek, parsing) | `js/app/inspector.js`, `js/app/inspector-morph.js` |
| Keyboard shortcuts | `js/app/keyboard.js` |
| Undo | `js/app/undo.js` |
| Workspace tabs (Contour / Table) | `js/app/layout.js`, `styles/text-first.css` |
| Shell layout (sidebar, panels) | `js/ui-shell.js`, `styles/layout-modern.css` |
| Password gate | `gate.js` |

## Golden rules

1. **Never edit `js/data/wlc-text.js` unless you are replacing WLC data intentionally.**
2. **Never embed large `<style>` or `<script>` blocks in `index.html`.**
3. **Never rewrite entire files when a small targeted edit suffices.**
4. **Never regenerate `index.html` from scratch.**
5. **Run `python3 scripts/validate.py` after every significant change.**
6. **If validation fails, stop and fix before continuing.**

## Recommended workflow

### Before starting work

```bash
git status                          # must be clean (except .backups/)
python3 scripts/validate.py         # confirm healthy baseline
python3 scripts/checkpoint.py "before feature X"
```

### Implementing a feature

1. Identify the smallest module that owns the behavior (see table above).
2. Make a surgical edit in that `.js` or `.css` file.
3. If you must touch `index.html`, only add/remove HTML structure or script/link tags — never paste logic.
4. Run validation:

```bash
python3 scripts/validate.py
```

5. Test in the browser (hard refresh to bypass service worker cache).
6. Commit with a focused message.

### Adding a new script module

1. Create `js/app/my-feature.js`.
2. Add `<script src="js/app/my-feature.js"></script>` to `index.html` in dependency order.
3. Add the path to `service-worker.js` `APP_ASSETS`.
4. Run `python3 scripts/validate.py`.

### Adding new styles

1. Prefer adding to the most specific existing file (`css/app.css` for editor/table, `styles/*.css` for shell).
2. Link new stylesheets in `index.html` `<head>` and `service-worker.js`.

## Validation

```bash
python3 scripts/validate.py
```

Checks:

- `index.html` shell size and structure
- Required CSS/JS files exist and are non-empty
- `js/data/wlc-text.js` size and format
- JavaScript syntax (`node --check`) on all app modules
- Layout markers present in combined `js/app/*` code

Exit code `0` = safe to continue. Non-zero = fix before editing further.

## Recovery

### Automatic backups

`extract_modules.py` copies `index.html` to `.backups/index.html.<timestamp>` before restructuring.

### Restore a backup

```bash
python3 scripts/restore_backup.py          # list backups
python3 scripts/restore_backup.py latest # restore newest
python3 scripts/validate.py
```

### Recover from git (legacy monolithic file)

If an old monolithic `index.html` is restored from git history:

```bash
python3 scripts/reapply_all_patches.py    # patches + extract_modules
python3 scripts/validate.py
```

### Truncated index.html symptoms

- File size suddenly &lt; 15 MB (when monolithic) or &lt; 20 KB (when modular shell)
- App shows blank/blue screen
- `validate.py` fails

**Fix:** `git checkout HEAD -- index.html` (or restore backup), then `python3 scripts/validate.py`.

## Legacy patch scripts

The `scripts/apply_*.py` files were used to patch inline CSS/JS in the monolithic `index.html`. All patches are now baked into `css/app.css` and `js/app/*`. 

- **Normal development:** edit modules directly; do not run patch scripts.
- **Legacy recovery only:** `reapply_all_patches.py` on a monolithic file, then auto-extracts.

## Service worker / caching

After deploy or local testing, hard refresh (`Cmd+Shift+R`) so the browser loads new JS/CSS. Bump `CACHE_NAME` in `service-worker.js` when adding new cached assets.

## Local development server

```bash
python3 -m http.server 8080
# Open http://localhost:8080 — password: see gate.js / team docs
```

## Commit standards

- Small, focused commits
- Run `validate.py` before committing structural changes
- Use `checkpoint.py` before risky refactors
- Do not commit `.backups/` or `*.truncated.bak`
