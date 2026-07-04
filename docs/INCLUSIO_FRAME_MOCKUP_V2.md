# Inclusio Frame Redesign — Mockup & Implementation Proposal (v2)

**Status:** Proposal only — **do not extend current word-bracket renderer** until approved.  
**Date:** July 2026  
**Visual target:** User mockups + screenshots in `docs/assets/inclusio-mockups/`

---

## Executive summary

The inclusio should read as a **picture frame around a literary unit**, not brackets glued to Hebrew words. Current SVG rails are derived from **per-word bounding boxes** and draw **extra endcaps at anchor-word Y positions**, which produces prongs through the text. Word-level highlight boxes add further clutter.

**Tonight:** approve this mockup + ship Fit zoom fallback guard.  
**Next:** replace frame geometry with **unit-bounds + margin rails** (new renderer module).

---

## Mockup 1 — Single inclusio, light mode

```
┌─ editor sheet (US Letter) ─────────────────────────────────────────────┐
│  Job 19:21–27                                                          │
│                                                                        │
│  margin │                                    │ margin                  │
│         │   חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעַ֑י               │         │
│    ╭────┤                                    ├────╮   ← outer rail     │
│    │    │   כִּ֤י יַ֣ד אֱל֙וֹהַּ נָ֣גְעָ֔ה בִּ֔י          │    │         │
│    │    │                                    │    │                     │
│    │    │   וּֽמִצְפִּ֥י וְאֵ֖לֶף אֲשֶׁר־בְּעַ֣ד       │    │         │
│    │    │                                    │    │                     │
│    │    │   …                                │    │                     │
│    ╰────┤                                    ├────╯   ← bottom caps    │
│         │                                    │                         │
└────────────────────────────────────────────────────────────────────────┘
```

| Token | Value (light) |
|-------|----------------|
| Rail stroke | `#64748B` (slate gray), 2px |
| End caps | 12px horizontal prongs, **top + bottom only** |
| Rail offset from text block | **24px** minimum (RTL: outside right edge + gutter) |
| Text | Normal contour rendering — **no boxes** on words |
| Anchor words | Optional 2px underline tick in margin only, or none in view mode |
| SVG | `pointer-events: none` on rails; hit target on invisible margin band for select |

**Open:** `docs/assets/inclusio-mockups/frame-mockup-preview.html` → “Mockup 1”.

---

## Mockup 2 — Nested inclusios, muted layer colors

```
margin ─────────────────────────────────────────────────────────►

     ╭── outer (L0) ─────────────────────────────────╮  #5B6B7C  2.75px
     │    ╭── inner (L1) ───────────────────╮         │  #7C8DA0  2px
     │    │                                 │         │
     │    │      Hebrew lines (normal)      │         │
     │    │                                 │         │
     │    ╰─────────────────────────────────╯         │
     ╰──────────────────────────────────────────────────╯

Layer offsets (from text block edge, outward into margin):
  L0 (outer): +28px
  L1:         +52px  (+24px per nest level)
  L2:         +76px
```

| Level | Stroke | Opacity | Weight |
|-------|--------|---------|--------|
| 0 outer | user color or `#5B6B7C` | 0.95 | 2.75px |
| 1 inner | user color or `#7C8DA0` | 0.85 | 2px |
| 2+ | lighter shade auto-derived | 0.75 | 1.5px |

**Palette presets (scholarly, muted):**

| Name | Hex |
|------|-----|
| Slate Gray | `#64748B` |
| Blue Gray | `#6B7C93` |
| Muted Blue | `#5C6F8A` |
| Olive | `#6B7355` |
| Burgundy | `#7A4A52` |
| Brown | `#7A6550` |
| Custom | user picker |

Hierarchy = **nesting + weight + margin offset**; color is secondary.

---

## Mockup 3 — Dark mode

| Token | Value (dark) |
|-------|----------------|
| Sheet background | `#111827` |
| Hebrew text | `#E8EEF5` |
| Outer rail | `#94A3B8` at 0.9 opacity |
| Inner rail | `#CBD5E1` at 0.75 opacity |
| Active frame | +1px stroke, full opacity |

Same geometry as light mode — only token swap via CSS variables:

```css
:root {
  --inclusio-rail-stroke: #64748B;
  --inclusio-rail-cap: 12px;
  --inclusio-margin-base: 28px;
  --inclusio-margin-step: 24px;
}
body.dark-mode {
  --inclusio-rail-stroke: #94A3B8;
}
```

---

## Why current frames overlap text

### Root cause A — bounds hug words, not the unit

`inclusioEnvelopeBounds()` unions **every word** in range (`inclusios.js` ~158–194).  
`inclusioRailXPositions()` places rails at `bounds.left - 14px` / `bounds.right + 14px` (~221–227).

For RTL Hebrew, `bounds.right` is the **right edge of the rightmost word** — still inside the text column. **14px is not enough** to clear vowel points and word width variance.

### Root cause B — anchor midline prongs

`drawInclusioEnvelopeRail()` draws **extra horizontal caps at `openY` and `closeY`** — the vertical center of opening/closing **words** (~285–291). That creates the “multiple prongs through the text” seen in screenshot 2.

### Root cause C — word highlight boxes

`inclusioWordHighlightClass()` applies `inclusio-anchor-active` / `inclusio-registry-hover` on anchor words → blue/gray **boxes on words** (`inclusio-phase-a.css` 176–186). This contradicts “normal Hebrew, no boxed blocks.”

### Root cause D — SVG lives inside `#editor`

`ensureInclusioFrameSvg()` inserts SVG as child of `#editor`, sharing the text coordinate system. Rails are computed in editor space **after** gutter padding, but still anchored to word rects — not a separate margin layer.

### What was already fixed (v56) vs what remains

| Fixed | Still wrong |
|-------|-------------|
| Margin gutter padding (`--inclusio-margin-gutter`) | Rails still positioned from word bounds |
| `pointer-events: none` on SVG | Anchor-midline endcaps |
| Hidden `::before/::after` word brackets in editor | Word highlight boxes on anchors |
| Draw mode like arcs | Frame not unit-rect based |

---

## Recommended rendering strategy

### Philosophy

> **Anchors define the unit. Geometry comes from the unit’s block box, not from words.**

```
openingAnchor + closingAnchor
        ↓
resolve loc range in verse/clause model
        ↓
collect CLAUSE LINE boxes (.clause elements) spanned by range
        ↓
union → unitBounds { top, bottom, left, right }  (editor coords)
        ↓
expand unitBounds by textPadding (8px) — NOT per-word
        ↓
rails at unitBounds ± marginOffset(nestLevel)
        ↓
draw: 2 vertical lines + 4 cap segments (top/bottom only)
```

### Key implementation choices

1. **Bounds source:** `.clause` row `getBoundingClientRect()` for spanned clauses (falls back to word union only if needed).
2. **Rails:** single continuous vertical segment per side; **no** `openY`/`closeY` midline caps.
3. **Nesting:** outward into margin only (`marginBase + level * marginStep`), never inward across Hebrew.
4. **SVG placement:** prefer `#editorWrap` or dedicated `#inclusioMarginLayer` sibling to sheet — not mixed into word DOM.
5. **Interaction:** invisible hit rects in margin (`pointer-events: stroke`) for frame select; Hebrew stays word-select for anchors only in draw mode.
6. **Preview:** while dragging, show dashed preview frame from provisional unit bounds (same geometry).
7. **Export:** same unit-bounds logic in export HTML/PDF/DOCX margin SVG.

### Files to replace/refactor (later)

| File | Change |
|------|--------|
| `js/app/inclusios.js` | Replace `inclusioEnvelopeBounds`, `drawInclusioEnvelopeRail` |
| `js/app/inclusios-frame-geometry.js` | **New** — unit bounds, nest offsets, cap paths |
| `styles/inclusio-phase-a.css` | Rail tokens; remove word box highlights in view mode |
| `js/app/layout.js` | Stop `inclusioWordHighlightClass` boxes except draw-mode flash |
| `scripts/verify-inclusio-browser.mjs` | `margin-clears-text`, nested offset, dark mode |

### Do NOT continue

- Extending `drawInclusioEnvelopeRail` with more word offsets
- Per-word bracket pseudo-elements in live editor
- Span washes / `inclusio-span` on words

---

## Problem 2 — Fit blank screen

### Investigation

Automated checks (Playwright, Job-like content, inclusios, repeated Fit toggles) show **words remain visible** at Fit ≈ 52% in headless Chrome. Fit is **not universally broken** in CI.

Screenshot 1 (blank white page, Fit active, title “Job 19 Contour”) is consistent with:

| Likelihood | Cause |
|------------|--------|
| **High** | **Empty or not-yet-rendered editor** when Fit runs (words = 0 → nothing to see; letter sheet fills viewport as white) |
| **High** | **Fit uses full letter min-height (1056px)** even for short content — text stays at top but can look “empty” if user expects filled viewport |
| **Medium** | **Race:** `applyPageZoom({ mode: 'fit' })` before `render()` / after tab switch while DOM is stale |
| **Medium** | **Short viewport** after Inclusio toolbar expands — `availH` shrinks; scale drops to 0.25 floor (small but not zero) |
| **Low** | Inclusio SVG inflating `editor.scrollHeight` — tested with 20 clauses + frame; still visible |
| **Low** | Transform/scroll bug scrolling content out of view — not reproduced headless |

`computeFitPageZoom()` (`page-zoom.js` 103–114):

```javascript
const scale = Math.min(1, viewport.width / pageW, viewport.height / pageH);
// pageH always >= 1056 (letter min-height), not actual content height
```

Using **letter page height** instead of **content height** makes Fit optimize for empty page shell — content can appear tiny or “lost” on large monitors, and if combined with empty `state.verses` looks like a blank screen.

### Smallest safe fix (Fit) — recommended tonight

```javascript
// 1. Use content-aware height for fit
const editor = stage.querySelector('#editor');
const contentH = Math.max(
  editor?.scrollHeight || 0,
  sheet.scrollHeight,
  200 // minimum sensible content
);
const pageH = Math.min(getPageLayoutSize(sheet).pageH, contentH + letterMargins);

// 2. Guard invalid scale
let scale = clampPageZoomScale(Math.min(1, scaleW, scaleH));
if (!Number.isFinite(scale) || scale < MIN_PAGE_ZOOM) scale = 0.75;

// 3. After applyPageZoom fit, verify visibility
requestAnimationFrame(() => {
  const word = document.querySelector('#editor .word');
  if (!word || !isWordVisibleInEditorWrap(word)) {
    applyPageZoom({ mode: '85', skipPersist: true });
  }
});
```

Add test: `fit-never-blank` in `verify-page-zoom.mjs`.

**Do not change** export zoom, parallel mode, or pinch gestures in this fix.

---

## Tonight vs later

| Tonight (small, safe) | Later (after mockup approval) |
|----------------------|-------------------------------|
| Fit content-height + visibility fallback | New `inclusios-frame-geometry.js` unit renderer |
| `verify-page-zoom` regression test | Remove anchor-midline prongs |
| Document approval of this mockup | Remove word highlight boxes in view mode |
| | Frame click → activate inclusio |
| | Margin hit targets |
| | Export parity |
| | Legend structure evolution (Literary Structures) — **not now** |

---

## Success criteria (visual)

1. First impression = **literary structure**; second = Hebrew.
2. **Zero** rail strokes crossing vowel points or letters.
3. **One** top cap + **one** bottom cap per side per frame.
4. Nested frames clearly separated in **margin**, not overlapping text.
5. No blue/gray selection boxes on words in normal view.
6. Draw Inclusio workflow unchanged (drag opening → closing).
7. Fit always shows content or falls back to 85% — never an unexplained blank.

---

## Interactive preview

Open in browser (local server):

`docs/assets/inclusio-mockups/frame-mockup-preview.html`

Toggle: Light / Dark / Nested / Colors.

---

## Approval checklist

- [ ] Single-frame geometry approved  
- [ ] Nested offset + palette approved  
- [ ] Dark mode tokens approved  
- [ ] Word boxes removed in view mode — confirmed  
- [ ] Fit fallback approved for tonight  
- [ ] Proceed to renderer implementation
