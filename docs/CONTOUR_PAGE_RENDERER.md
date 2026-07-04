# Contour Page Renderer — Canonical WYSIWYG Architecture

## Problem

The contour was styled in three independent pipelines:

| Surface | HTML source | CSS source | Page geometry |
|---------|-------------|------------|---------------|
| **Editor** | `buildContourEditorHtmlFromState()` | `app.css`, `contour-document-presentation.css`, `layout-breaks.css` | 816×1056 Letter sheet, 96px margins, zoom stage |
| **PDF/HTML export** | same HTML builder | ~200 lines inline in `file-menu.js` | body margin 32px, no Letter sheet |
| **DOCX export** | separate OOXML builder | hard-coded twips | 720 twips/indent level, mismatched break spacing |

This caused visual drift: export title formatting differed from the passage title bar, indents were 48px in Word vs 30px in the editor, and discourse breaks used different pixel/twips values.

## Decision

**The editor page is the canonical representation.** Export serializes that representation rather than re-styling it.

```
state (verses/clauses/words)
        │
        ▼
buildContourEditorHtmlFromState()  ──► contour body HTML (shared)
        │
        ▼
buildContourPageShellHtml()        ──► Letter sheet + passage title + body
        │
        ├─► #editor.contour-page-body     (live preview, + zoom chrome)
        ├─► buildContourExportDocument()  (PDF / HTML — same shell + CSS)
        └─► contourDocxXml()              (OOXML mapped from CONTOUR_PAGE tokens)
```

## Single source of truth: `CONTOUR_PAGE`

Defined in `js/app/contour-page-renderer.js`:

| Token | Value | Used for |
|-------|-------|----------|
| `letterWidthPx` | 816 | Editor sheet + export page |
| `letterHeightPx` | 1056 | Min page height |
| `marginPx` | 96 | 1" margins |
| `hebrewAnchorInsetPx` | 32 | RTL anchor nudge |
| `displayIndentPx` | 30 | Inline margin + DOCX indent |
| `bodyFontSizePx` | 26 | Body typography |
| `bodyLineHeight` | 2.1 | Line rhythm |
| `breakPx` | 18 / 40 / 72 | Visual discourse breaks |
| `verseSpacingEm` | 2.1 / 3.15 / 4.2 em | Verse spacing after |

CSS custom properties are injected at load via `injectContourPageTokens()`.  
`styles/contour-page.css` consumes those vars in the editor; `contourPageExportCss()` emits the same vars inline for standalone export documents.

DOCX twips derive from pixels: `px × 15` (96 dpi → 1440 twips/inch).

## Pixel-fidelity clause layout (Word paste)

Clauses store canonical layout geometry — not quantized contour levels when imported from Word:

| Field | Example | Source |
|-------|---------|--------|
| `indentPx` | `48` | Word `margin-right: 36pt` |
| `spacingAfterPx` | `40` | Blank-line discourse breaks or Word paragraph margins |
| `alignment` | `rtl` | Paragraph direction |

Legacy projects with `indent` levels only still render via `clauseIndentPx()` fallback (`indent × 30px`).

**Tab / Shift+Tab** adjusts `indentPx` by ±30px (`contourTabIndentStepPx`). **Visual Break** sets `spacingAfterPx` to preset values (18 / 40 / 72) while keeping `spacingAfter` when they match.

Helpers: `clauseIndentPx`, `clauseSpacingAfterPx`, `clauseLayoutStyle`, `contourIndentDocxTwipsForClause`.

## Module responsibilities

### `js/app/contour-page-renderer.js`
- `CONTOUR_PAGE` constants
- `contourPageExportCss()` — full stylesheet for export windows
- `buildContourPageShellHtml()` — Letter sheet wrapper matching editor DOM
- `buildContourExportDocument()` — complete HTML document for PDF/HTML export
- `contourIndentDocxTwips()`, `contourBreakDocxTwips()`, `contourVerseSpacingDocxTwips()`

### Editor (unchanged data path)
- `renderEditor()` adds `contour-document-page` + `contour-page-body` on `#editor`
- Passage title stays in `#contourPassageTitle` (LTR bidi isolation)
- Page zoom (`page-zoom.js`) remains editor-only viewport transform — does not affect export

### Export
- **HTML/PDF**: `buildContourExportDocument()` — no independent styling
- **DOCX**: still OOXML, but spacing/indent/title read from the same tokens

## What did not change

- Paste-with-Layout parsing
- Word indent import logic
- `spacingAfter` / visual discourse break data model
- Stored indent levels (display px is presentation-only)
- Clause/contour structure and save/load

## Remaining gaps (future phases)

1. **Parallel mode** — panes do not yet use the document-page shell; export already requires single-pane for PDF/HTML.
2. **Editor chrome vs print** — gray canvas and zoom are intentionally editor-only; export uses the white Letter sheet at 100%.
3. **Font size calibration** — 26px Aleph vs Word 14pt SBL Hebrew is a separate typography pass.
4. **Legend/comments/arcs** — export annexes sit outside the page shell (same as before); not part of WYSIWYG page body.
5. **True DOM serialization** — optional future path: clone `#contourPageZoomStage` innerHTML for export instead of rebuilding from state (useful if live DOM gains annotations not in state).

## Verification

```bash
HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-presentation-qa.mjs
```

Checks include canonical export shell (`contour-document-sheet--export`), aligned DOCX twips (450/900 indent, 600/1080 breaks), and editor geometry unchanged.

## QA checklist

- [ ] Paste Job 19:21–29 with layout — editor matches previous calibration
- [ ] Export HTML — open file; Letter page, title bar, indents, breaks match editor at 100% zoom
- [ ] Export PDF — print preview matches editor
- [ ] Export Word — indents and breaks closer to editor (30px-equivalent twips)
- [ ] Save/reload — no regression
- [ ] Page zoom 85% — editor scales; export unchanged at 100%
