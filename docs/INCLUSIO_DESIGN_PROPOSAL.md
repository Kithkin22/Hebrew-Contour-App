# Inclusio Marking — Research & Design Proposal

**Status:** Phase A approved; architecture aligned before implementation.  
**Date:** July 2026 (updated: TextAnchor / Relationship model + Relationship Basis terminology)  
**Scope:** Aleph Contour Inclusio tool — implementation scope remains Inclusios only, but the design model must support future literary relationships.

---

## 1. Summary of scholarly consensus

### What an inclusio is

Across OT/NT literary and discourse studies, **inclusio** (also *envelope structure*, *bracketing*, *frame*, *ring pattern*, *concentric parallelism* at the simplest level) is the repetition of a **word, phrase, theme, motif, or parallel scene** at the **beginning and end** of a literary unit, framing the material between.

| Term (common synonyms) | Typical use |
|------------------------|-------------|
| Inclusio / inclusion | General literary criticism, inductive Bible study |
| Envelope structure / figure | Poetry (Fokkelman, Alter), narrative analysis |
| Bracketing / bookends | Teaching materials, sermons, Matthew studies |
| Frame | Discourse analysis, boundary markers |
| Distant parallelism | Psalm studies (Dahood) |
| חתימה מעין פתיחה (*chatimah me'ain petichah*) | Medieval Jewish interpretation |

**Function:** mark unit boundaries, create closure, foreground theme, and signal how inner material relates to the frame—not merely decorative repetition.

### How scholars identify inclusios

Identification is **interpretive** and **retrospective**:

1. Read the passage for repeated lexical, thematic, or structural elements at **opening and closing** positions.
2. Often the frame is only recognized when the **second** (closing) element appears (Watson, *JSOT* 2006; Campbell via Wikipedia).
3. Scholars weigh whether repetition is **intentional framing** vs. coincidence (debated cases are common).
4. Units may be scoped at **word, phrase, verse, pericope, section, or book** level (Hamilton on John; Job thesis on outer + inner inclusios).

**Nested inclusios are standard in scholarship**—e.g. Job 1–2 // 42 (outer) and Job 3 // 38–42 (inner); Matthew macro-frames (1:23 / 28:20) alongside micro-frames (5:17 / 7:12).

### How scholars *represent* inclusios (print & teaching)

There is **no single standard markup** for Hebrew text in commentaries. Common patterns:

| Medium | Representation |
|--------|----------------|
| Prose commentary | Verse citations + explanation (“5:17 and 7:12 bracket the Sermon body”) |
| Structural outlines | Letter labels (`A … A′`), indentation, section headings |
| Inductive study (Bauer) | “Bracket effect” described verbally; Psalm 104 example by citation |
| Dorsey / discourse handbooks | Unit boundaries + arrangement type (linear, parallel, symmetric) |
| Chiastic studies (McCoy, Breck) | `A-B-C-B′-A′` diagrams; center pivot emphasized |
| Poetry handbooks (Fokkelman) | Frame described; Psalm 8 cited at vv. 1 and 9 |

**Visual conventions in print:**

- **Labels:** yes — section titles, A/A′ notation, verse ranges.
- **Color:** rare in academic print; occasional teaching slides use color.
- **Brackets:** metaphorically “bracketing”; inline `[` `]` on Scripture text is **uncommon** in published commentaries.
- **Lines / boxes / margin bars:** used in **separate diagrams** (block diagrams, discourse charts), not usually overlaid on the biblical line itself.
- **Typography:** bold/italic of repeated lemma in discussion; not typically on the full contour canvas.

**Takeaway for software:** Scholars often *report* verse ranges in prose, but they *identify* frames by **repeated lexical or thematic bookends** at opening and closing positions. Aleph should be **anchor-first**: anchored text is the source of truth; verse span is derived.

### Representative sources consulted

- Robert Alter, *The Art of Biblical Narrative*; “Joseph and His Brothers” (envelope in Jacob’s speech)
- Meir Sternberg (via YCTorah reflections): inclusio known in rabbinic tradition; warn against cataloguing devices without theological purpose
- J. P. Fokkelman, *Reading Biblical Poetry* — frame/inclusio demarcates strophes and psalms (Ps 8)
- David Dorsey, *Literary Structure of the OT* — cohesion techniques include inclusio; arrangement taxonomy
- David Bauer, Inductive Bible Study (Session 7) — inclusio as “bracket effect”; Psalm 104
- James Hamilton, JETS — inclusio bookends at word, phrase, and episode levels (John)
- Watson, “Have We Come Full Circle Yet?” (*JSOT*) — recognition, boundary markers, problematic cases
- Grant Osborne / discourse hermeneutics — macrostructure vocabulary (inclusio grouped with chiasm under structural devices)

---

## 2. Examples from books & software

### Academic / print patterns

**Psalm 104 (Bauer):** Frame = “Bless the LORD, O my soul” (vv. 1, 35). Teaching emphasizes **verse bookends** and theme, not colored brackets on every word.

**Matthew 5:17–7:12 (Umphrey / Brauns / Piper):** “The Law and the Prophets” at 5:17 and 7:12 frames the Sermon body. Analysis is **pericope-level** with cross-references.

**Psalm 8 (Fokkelman):** “O Yahweh, our Lord, how majestic is your name…” opens and closes the psalm — classic **envelope** example.

**Job (thesis literature):** **Double inclusio** — outer (ch. 1–2 // 42) and inner (ch. 3 // 38–42) with **keyword** links (e.g. fencing imagery).

**Chiastic outlines (McCoy):** `A-B-C-B′-A′` with center pivot `C` as main point — inclusio is the **outer pair** of a chiasm.

### Software (functionality, not UI to copy)

| Tool | Inclusio-specific? | How structure is shown | Notes |
|------|-------------------|------------------------|-------|
| **Logos** | No dedicated tool | Custom highlights, labels, Sentence Diagram / Text Flow for chiasm | User-built; visualizations in separate panes |
| **BibleArc** | No | Bracketing / arcing = proposition hierarchy | Discourse logic, not envelope marking |
| **Accordance** | No | Syntax trees; diagram palette (brackets, arcs) | Analysis on diagram canvas |
| **Hebrew Clause Formatter** | **No** | Clause indentation, Tab/Return breaks, p/s coloring | **Functionality reference only** — no inclusio |
| **BibleWorks** (historical) | No | Diagramming module | Similar to Accordance |
| **STEP Bible** | No | Interlinear, morphology | Not literary framing |

**What works well elsewhere**

- Separating **structural diagram** from **reading text**
- **Labels** and searchable annotations (Logos labels)
- **Hierarchy** for nested units (BibleArc bracket depth)
- **Export** of diagrams for teaching

**What confuses users**

- Overloaded inline markup on the Scripture line
- No distinction between **bracketing a phrase** vs **marking discourse relationships**
- Tools that require learning a new visual language unrelated to print commentaries

---

## 3. Pros & cons of visual approaches

| Approach | Pros | Cons |
|----------|------|------|
| **A. Endpoint brackets only** (Aleph today) | Minimal clutter; maps to “bracket” metaphor; exports cleanly; word-precise | Does not show span; nested frames hard to read; easy to confuse with syntax brackets |
| **B. Verse-range margin rails** | Matches scholarly outlines; scales to long units; supports nesting | Requires layout space; RTL complexity; may fight document-first if too bold |
| **C. Subtle span band (background)** | Shows envelope at a glance | Can obscure highlights/colors; heavy in dark mode; overlapping spans messy |
| **D. Arc / connector between endpoints** | Visually links start↔end (like Aleph arcs) | Clutters with arc tool; crossing arcs in dense passages |
| **E. Outline panel only (no inline)** | Calmest reading surface | Loses contour integration; less “marked text” for export |
| **F. Letter labels at endpoints** (`A` / `A′`) | Matches academic notation | Adds Latin letters to Hebrew line; needs legend |
| **G. Color-coded brackets** (Aleph today) | Multiple inclusios distinguishable | Color alone is weak accessibility; rainbow effect if many markers |

---

## 4. Evaluation of Aleph’s current implementation

### Current behavior (code summary)

- **Data (today):** `state.inclusios[]` → `{ id, label, color, start, end }` — legacy single-word locs; target model in §8.
- **Workflow (today):** Set Start / Set End — to become **Opening Anchor** / **Closing Anchor**.
- **UI:** Full card panel in **Inclusio** annotation tab; manager table with label, refs, remove.
- **Integration:** Legend entries (type `bracket`); Word/PDF export includes bracket characters; remaps on text reload.
- **Shared infrastructure:** Uses same bracket properties as manual **Brackets** tool (`bracketSource: 'inclusio'`).

### Alignment with scholarly practice

| Aspect | Assessment |
|--------|------------|
| Frame = opening + closing anchors | **Aligned** — anchor-first model |
| Word-level anchors | **Partial** — single-word today; phrase `LocRange` planned |
| Derived Span | **Missing** — must be computed, read-only |
| Relationship Basis | **Missing** — optional classification of why the relationship exists |
| Label + legend | **Aligned** with teaching/export needs |
| Nested inclusios | **Partial** — multiple records supported; **visual hierarchy** weak |
| Recognition / argumentation | **Correctly left to user** (not auto-detected) |
| Pericope-first framing | **Not emphasized** — UI is word-first only |

### Usability

| Question | Assessment |
|----------|------------|
| Intuitive for contour users? | **Moderate** — rename to Opening/Closing Anchor; phrase flow like Comments |
| Scales to longer passages? | **Moderate** — endpoints visible; **span** is not |
| Overlapping inclusios? | **Weak** — same word can only wear one bracket role; nested outer/inner endpoints may crowd |
| Visually distracting? | **Somewhat** — bright default blue card + bold colored brackets |
| Long-session readability? | **Acceptable** if few markers; degrades with many colors + brackets + arcs + highlights |

### Distinction from Hebrew Clause Formatter

Aleph’s inclusio tool is **not** imitating the Clause Formatter (which has **no** inclusio feature). Aleph’s bracket-on-endpoints approach is **closer to Logos-style annotation + Bauer’s bracket metaphor** than to clause indentation. **No convergence risk** with clauses.hebrewtools.org if future work stays endpoint-light and document-first.

---

## 5. Recommendation for Aleph

### Design principles (Aleph-specific)

1. **Scripture first** — inclusio marks should be **quieter** than highlights, arcs, or selection.
2. **Anchor-first** — **Opening Anchor** and **Closing Anchor** (words or phrases) are the source of truth; **Derived Span** is a read-only report.
3. **Scholarly fidelity** — optional **Theme**, **Relationship Basis**, **Evidence**, and **Notes** record the interpreter’s reasoning.
4. **Contour-native** — marking stays on the **contour canvas**; avoid syntax-highlighter noise.
5. **Do not copy** BibleArc indentation, Logos diagram workspace, or Clause Formatter layout.

### Recommended direction: **“Quiet frame markers + anchor-first manager”**

**Phase A — Anchor-first foundation (low risk)**

- **Terminology:** Opening Anchor / Closing Anchor / Derived Span (not Start/End/Scope).
- **Quiet brackets** at exact anchor words or phrases — not verse blocks.
- **Phrase anchors** via Comments/Arcs-style loc ranges per anchor side.
- **Manager field order** (see §8): anchors → derived span → theme → relationship basis → evidence → notes.
- **Shrink panel:** match `contour-polish-v1` annotation tab density.
- **Remove redundant** “Apply/Refresh Brackets” button (auto-apply on anchor set).

**Phase B — Nesting & optional span visuals (medium risk)**

- **Optional margin ticks** (RTL-aware) between opening and closing anchors — **off by default**.
- **Hierarchy:** `level` or `parentId` for nested inclusios; bracket weight or optional `A` / `A′` badges.
- **Hover / select row** → highlight Opening and Closing anchors on contour.

**Phase C — Structure register (optional)**

- Collapsible **Structure** list inside Inclusio tab (not a permanent dock): derived spans, labels, nesting.
- Export **Structure markers** table in DOCX/PDF.

### What **not** to do

- Full-passage background wash
- Auto-detect inclusios algorithmically (high false-positive rate per Watson)
- Duplicate BibleArc-style proposition trees inside Aleph
- Large permanent inclusio dock/sidebar (violates document-first)

---

## 7. Technical challenges

| Challenge | Notes |
|-----------|-------|
| **Bracket collision** | Manual Brackets vs Inclusio on same word — precedence rules + UI warning |
| **Phrase anchors** | `LocRange` per anchor side; align with Comments `orderedLocs` pattern |
| **Derived span** | Compute from anchor locs only; never store as editable source of truth |
| **Nested overlap** | Multiple inclusios sharing anchor words — hierarchy + z-order |
| **RTL margin rails** | Envelope between anchors, not verses; respect clause wraps |
| **Parallel panes** | Extend `stateBundle` when parallel framing is needed |
| **Export** | Brackets on anchor words/phrases; derived span in legend/table |
| **Dark mode** | Muted brackets; preserve `has-text-color` and highlight readability |
| **Text reload** | `remapPaneAnnotations` remaps anchor locs; recompute derived span |
| **Performance** | Margin rails via per-line classes, not heavy DOM overlays |

---

## 8. Anchor-first design model (canonical)

> **Core principle:** An inclusio is attached to **specific repeated words or word groups**. The **Derived Span** is calculated from those anchors — it is a **report**, not the source of truth.

### Terminology (user-facing)

| Use | Avoid as primary terms |
|-----|------------------------|
| **Opening Anchor** | Start, Start Anchor, Set Start |
| **Closing Anchor** | End, End Anchor, Set End |
| **Derived Span** | Scope, Verse Span (as editable field), Range |

“Opening” and “Closing” reflect **literary analysis** (frame opening / frame closing), not generic start/end UI language.

### Canonical example

| Field | Value |
|-------|--------|
| **Opening Anchor** | לחם in Ruth 1:1 |
| **Closing Anchor** | לחם in Ruth 1:2 |
| **Derived Span** | Ruth 1:1–1:2 *(read-only)* |

The repeated word defines the frame. The verse range reports where the frame occurs.

### Data model (conceptual)

```ts
/** Shared across future literary tools — see §9 */
type Loc = { v: number; c: number; w: number; pane?: number }
type LocRange = { start: Loc; end: Loc }  // ordered; start === end for single word

type TextAnchor = {
  id: string
  range: LocRange              // SOURCE OF TRUTH — word or phrase
  label?: string               // optional display label
  normalizedText?: string      // derived from range, useful for search/display
}

type RelationshipBasis =
  | 'exact_word'    // same Hebrew surface form
  | 'lemma'         // same lemma, different inflection
  | 'root'          // same root
  | 'phrase'        // repeated phrase
  | 'motif'         // shared image / theme
  | 'conceptual'    // conceptual frame without exact repetition
  | 'custom'        // user-defined
  | null            // unset — classification optional

type RelationshipKind =
  | 'inclusio'
  | 'parallel_passage_link'
  | 'chiasm'
  | 'leitwort'
  | 'refrain'
  | 'catchword'
  | 'parallelism'
  | 'allusion'
  | 'custom'

Relationship {
  id: string
  kind: RelationshipKind
  anchors: TextAnchor[]        // SOURCE OF TRUTH for all literary relationships

  derivedSpan?: string         // computed at render — never primary data
  theme?: string
  relationshipBasis?: RelationshipBasis
  evidence?: string
  notes?: string

  level?: number               // optional nesting
  parentId?: string
  color?: string               // quiet accent only
}

Inclusio {
  id: string
  relationshipKind: 'inclusio'
  label?: string              // optional display name, e.g. "Inclusio A"

  openingAnchor: TextAnchor   // SOURCE OF TRUTH — word or phrase
  closingAnchor: TextAnchor   // SOURCE OF TRUTH — word or phrase

  // derivedSpan: string      // COMPUTED at render — never stored as source of truth

  theme?: string              // optional
  relationshipBasis?: RelationshipBasis // optional — why the frame exists
  evidence?: string           // optional — editable; may auto-fill from anchor text
  notes?: string              // optional

  level?: number              // optional — nesting (future)
  parentId?: string           // optional
  color?: string              // quiet accent for manager / brackets
}
```

### Inclusio Manager — field order

Present fields in this order:

| # | Field | Behavior |
|---|--------|----------|
| 1 | **Opening Anchor** | Word or phrase; clickable → scroll + highlight on contour |
| 2 | **Closing Anchor** | Word or phrase; clickable → scroll + highlight on contour |
| 3 | **Derived Span** | Read-only, muted; auto-calculated from anchor locations |
| 4 | **Theme** | Optional free text |
| 5 | **Relationship Basis** | Optional select (see below) |
| 6 | **Evidence** | Optional; may auto-fill from normalized opening/closing anchor text |
| 7 | **Notes** | Optional free text |

**Interaction:** Hovering or selecting a manager row highlights the **exact Opening Anchor and Closing Anchor** words/phrases on the contour — not whole verses.

### Relationship Basis (optional)

Helps Aleph record *what kind of literary relationship* the user sees between anchors. **Never required.**

| Value | Meaning |
|-------|---------|
| **Exact word** | Same Hebrew surface form at opening and closing |
| **Lemma** | Same lemma, different inflected forms |
| **Root** | Same lexical root |
| **Phrase** | Repeated multi-word phrase |
| **Motif** | Shared image or theme without verbatim repetition |
| **Conceptual** | Conceptual envelope without exact lexical repetition |
| **Custom** | User-defined explanation in Evidence field |

When **Relationship Basis** is set, **Evidence** may pre-fill with normalized anchor text; user may edit (e.g. for motif or conceptual frames).

### Phrase anchors

Anchors may be a **phrase**, not only a single word.

**Workflow (align with Comments / Arcs):**

1. Select first word of opening phrase → **Set Opening Anchor** (range start).
2. Select last word of opening phrase → **Extend Opening Anchor** (range end).
3. Same pattern for **Closing Anchor**.

- Single-word anchor: `TextAnchor.range.start === TextAnchor.range.end`.
- Store each side as a `TextAnchor` containing an ordered `LocRange`.
- Reuse `orderedLocs`, `locInRange`, and comment-style anchor patterns where possible.

### Visual behavior

| Rule | Detail |
|------|--------|
| **Attachment** | Brackets and any future continuous frame attach to **anchor words/phrases only** |
| **Not verse blocks** | Do not bracket entire verses unless the anchor phrase is the full verse |
| **Opening** | Bracket opens before first word of **Opening Anchor** |
| **Closing** | Bracket closes after last word of **Closing Anchor** |
| **Quiet default** | Muted gray brackets; color is secondary |
| **Nested** | Outer/inner via bracket weight + hierarchy — not rainbow colors |
| **Manager hover** | Highlights both anchor regions on the contour |

### Relationship to current Aleph code

| Today | Target |
|-------|--------|
| `inclusios[].start` / `.end` as single `Loc` | `openingAnchor` / `closingAnchor` as `TextAnchor` objects |
| UI: “Set Start” / “Set End” | “Set Opening Anchor” / “Set Closing Anchor” |
| No derived span in UI | **Derived Span** column (computed) |
| No relationship basis | Optional `relationshipBasis` + `evidence` |
| Brackets on one word each | Brackets on phrase boundaries |
| `remapPaneAnnotations` remaps locs | Recompute derived span after remap |

---

## 9. Future-friendly architecture — TextAnchor + Relationship

Aleph’s literary tools should share a **text-anchor-first** philosophy built around reusable `TextAnchor` objects and a general `Relationship` model.

**Shared principle:** Scholarly insight begins with **anchored text**. Everything else is **derived**:

- verse references and **Derived Span**
- structure lists and reports
- exports and legend entries
- cross-passage links

An **Inclusio** is the first concrete implementation of `Relationship`, but Phase A should avoid Inclusio-only assumptions where a reusable relationship helper would be just as simple.

### Tools that should align (future)

| Tool | Anchor use |
|------|------------|
| **Inclusios** | Opening Anchor + Closing Anchor |
| **Parallel passage links** | Word/clause anchors across panes |
| **Allusion assistance** | Source + target anchors |
| **Chiasms** | Paired anchor points (A/A′, B/B′, …) |
| **Leitwort** | Recurring lemma/root anchors |
| **Refrains** | Repeated phrase anchors |
| **Parallelism** | Corresponding colon anchors |
| **Catchwords** | Bridge-word anchors between units |

**Implementation note:** Prefer shared helper functions (`orderedLocs`, `anchorText`, `deriveSpan`, `remapAnchor`, `highlightAnchor`) that operate on `TextAnchor` / `Relationship` rather than one-off loc fields per feature.

**Scope guard:** Do not build UI for non-Inclusio relationships in Phase A. Only make the underlying shape future-safe enough that Chiasms, Leitwort, Refrains, Catchwords, and Parallel Passage Links do not require a second migration later.

See also: [HCDS_UI_VISION.md](./HCDS_UI_VISION.md) §13 Text-anchor-first literary tools.

---

## 10. Mockup exploration (July 2026)

### A. Quiet endpoint markers (recommended default)

```
וַיֹּאמֶר  ׀  [אִישׁ]  לְרֵעֵהוּ  …  …  …  [אִישׁ]  לְרֵעֵהוּ
              ▏ A′ (Inclusio: “a man to his neighbor”) — faint tick, muted #6B7280 bracket
```

- Brackets: `#6B7280` default; user color as **accent dot** in manager only, or very subtle bracket tint.
- Selected inclusio: brief orange outline on endpoints (reuse selection language).

### B. Structure register (collapsed by default)

```
Structure  ▸
  A  Ruth 3:1–3:18  “man … neighbor”
  B  Ruth 3:9–13    (nested) “spread your cloak”
```

Click row → scroll to anchors; highlight **Opening Anchor** and **Closing Anchor** temporarily. **Derived Span** shown as read-only in manager.

### C. Optional margin envelope (toggle)

```
│                                    Hebrew line continues normally…
│▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁│  ← 1px rail between opening/closing anchors only
```

Mockup assets: `docs/assets/inclusio-mockups/` (five concepts, light + dark).

---

## 11. Proposed implementation plan (post-approval)

### Gate 0 — Product approval
- Phase A is approved. Before coding, use §8–9 as the architectural contract: reusable `TextAnchor`, general `Relationship`, Inclusio-only UI scope.

### Phase A (1–2 sessions) — TextAnchor-based Inclusio foundation
- [ ] Shared `TextAnchor` shape with `LocRange` (`range.start` / `range.end`)
- [ ] Inclusio modeled as a two-anchor literary `Relationship` (`kind: 'inclusio'`) internally, while exposing only Inclusio UI
- [ ] Data migration: legacy `start` / `end` locs → `openingAnchor` / `closingAnchor` `TextAnchor`s
- [ ] UI labels: **Opening Anchor**, **Closing Anchor**, **Derived Span** (no Start/End/Scope)
- [ ] Phrase anchors (Comments-style extend pattern per anchor side)
- [ ] `deriveSpan(openingAnchor, closingAnchor)` → read-only **Derived Span** in editor (not editable)
- [ ] **Inclusio tab = editor only**; **Legend / Key = registry** (see §12)
- [ ] Editor fields for active inclusio: Opening → Closing → Derived Span → Theme → Relationship Basis → Evidence → Notes
- [ ] Optional **Relationship Basis** select; **Evidence** auto-fill from normalized anchor text
- [ ] Registry row click/hover → activate + highlight anchor regions on contour
- [ ] Quiet brackets at anchor phrase boundaries only (not verse blocks)
- [ ] Panel density per `contour-polish-v1`; remove redundant Apply button
- [ ] Legend + export: anchors + derived span + theme/evidence where set
- [ ] Project JSON migration for saved inclusios (backward-compatible read of legacy `start`/`end`)
- [ ] Keep implementation scope limited to Inclusios; no Chiasm/Leitwort/Refrain UI yet

### Phase B (2–3 sessions) — Nesting & optional visuals
- [ ] `level` / `parentId` for nested inclusios; bracket weight hierarchy
- [ ] Optional margin envelope between anchors (off by default)
- [ ] Optional A / A′ badges (off by default)
- [ ] Bracket vs manual-bracket conflict detection
- [ ] Broaden shared anchor helpers for Comments/Arcs alignment

### Phase C (optional) — Document summary & export
- [ ] Collapsible Legend subsections: Markings, Inclusios, Arcs (future)
- [ ] Export structure table (anchors + derived span + Relationship Basis + evidence)
- [ ] Keyboard navigation between inclusio registry rows

### Verification checklist (each phase)
- Single-word and phrase anchors (Ruth 1:1–1:2 לחם example)
- Derived span updates when anchors move
- Dark mode + colored words + highlights
- PDF/DOCX export with anchor brackets
- Autosave / reload / `remapPaneAnnotations`
- No visual resemblance to Clause Formatter layout

---

## 12. UI split — Inclusio tool vs Legend / Key registry

**Approved direction:** The Inclusio **tool** creates and edits; the **Legend / Key** is the document-wide registry and overview.

### Rationale

| Concern | Inclusio tab only (today) | Split model |
|---------|---------------------------|-------------|
| Tab height | Manager table grows with each inclusio | Tab stays compact — edit **active** inclusio only |
| Discoverability | Registry hidden inside tool | Registry visible in Legend below editor |
| Mental model | Tool + list mixed | Tool = work; Legend = reference |
| Document focus | User scrolls table in ribbon area | Hebrew canvas stays primary |

This aligns with Aleph’s document-first philosophy and the long-term vision of Legend as **structural summary**.

### Current implementation (today)

| Piece | Location | Role |
|-------|----------|------|
| `#inclusioPanel` | Inclusio annotation tab | Controls + `#inclusioManager` table |
| `renderInclusioManager()` | `js/app/layout.js` | Active `<select>` + full HTML table (Start/End/Label/Remove) |
| `#legendBelowEditor` | Below editor (collapsible) | Wraps `#legendPanel` |
| `#legendEditor` | Inside legend panel | **Markings** table (highlight, bracket colors, etc.) |
| `state.inclusios[]` | Project JSON | Source of truth for inclusio data |
| `state.legend[]` | Project JSON | Export labels; `addInclusio()` adds `bracket` legend row by color |

**Coupling to resolve:** Inclusio label edits currently sync to `state.legend` bracket entries matched by **color** — fragile when multiple inclusios share a color. Registry should read from `state.inclusios[]` directly; legend bracket rows remain for **export marking key** only.

### Proposed UI structure

#### Inclusio tab (editor only)

Controls for the **active** inclusio only:

- Active inclusio selector — **only place** to pick which inclusio is being edited
- Set Opening Anchor / Set Closing Anchor (+ extend phrase, Phase A)
- Derived Span (read-only)
- Theme, Relationship Basis, Evidence, Notes
- Actions: **New**, **Delete active**, **Clear all**

Does **not** contain the full registry table.

#### Legend / Key (registry)

Expand `#legendBelowEditor` / `#legendPanel` with collapsible subsections:

```
▼ Legend / Key
  ▼ Markings          ← existing #legendEditor (export labels)
  ▼ Inclusios         ← NEW #inclusioRegistry
  ▼ Arcs              ← future (optional; arc list today lives in Arcs tab)
```

**Inclusios registry row** (compact):

```
[A]  Job 19:21–27
     Opening: חָנֻּנִי   Closing: אֹמַר
     Theme: Hope · Basis: Repeated word
```

Read-only in registry — editing happens in Inclusio tab when row is activated.

#### Interactions

| Action | Behavior |
|--------|----------|
| **Click registry row** | `activateInclusio(id)` → set active in editor, highlight anchors, scroll opening anchor into view |
| **Hover registry row** | Soft highlight on opening + closing anchor words |
| **Edit fields** | Only in Inclusio tab for active inclusio |
| **Delete** | Primary: Delete active in tab; optional small remove on registry row |
| **Legend collapsed** | Show count in subsection header: `▶ Inclusios (3)` |

### Recommended implementation approach (cleanest path)

**1. Split render functions (no data model change for UI move)**

```text
renderInclusioEditor()    → #inclusioEditor (in tab) — active inclusio form only
renderInclusioRegistry()  → #inclusioRegistry (in legend) — all inclusios, compact
activateInclusio(id)      → shared: state.activeInclusioId, re-render, highlight
```

Keep `render()` calling both. Replace `#inclusioManager` with `#inclusioEditor`.

**2. DOM changes (minimal)**

- Remove table from `#inclusioPanel`; add `#inclusioEditor` container.
- In `#legendPanel`, after `#legendEditor`, add `#legendInclusiosSection` with `#inclusioRegistry`.
- Reuse `legendBelowHeader` collapse pattern for subsection headers.

**3. State**

- Add `state.activeInclusioId` (single source; editor select syncs to it).
- `state.inclusios[]` remains canonical — registry is a **view**, not a second store.

**4. Highlighting**

- Reuse word flags: `inclusioId`, `inclusioRole` (Phase A: anchor ranges).
- Transient classes: `.inclusio-anchor-highlight`, `.inclusio-registry-hover`.
- `scrollIntoView` on opening anchor word element.

**5. Legend / export**

- Export: keep existing **Markings** legend table.
- Add optional **Inclusios** appendix (anchors + derived span + theme).
- Do not duplicate inclusio rows inside `#legendEditor` bracket type rows.

**6. Timing**

Implement registry move **together with** Phase A anchor-first editor fields — one UI pass, not two.

### What not to do

- Duplicate full registry in both tab and legend
- Make Derived Span editable in registry
- Move inclusio **creation controls** out of the Inclusio tab
- Store registry rows separately from `state.inclusios[]`

### Long-term Legend vision

Legend / Key becomes the document structural summary: Markings, Inclusios, Brackets, Arcs, Highlights (optional), Literary Structures (future). Each subsection collapsed by default, count in header, click row → activate + highlight on canvas.

---

## References (selected)

- Alter, Robert. *The Art of Biblical Narrative* (Basic Books).
- Bauer, David. Inductive Bible Study, Session 7 (biblicalelearning.org PDF).
- Dorsey, David A. *The Literary Structure of the Old Testament* (Baker).
- Fokkelman, J. P. *Reading Biblical Poetry* (Westminster John Knox).
- Hamilton, James M. “The Chiastic Structure of John’s Gospel,” *JETS* 68.3.
- Watson, Wilfred G. E. “Have We Come Full Circle Yet?” *JSOT* 30.5 (2006).
- BibleArc — bracketing/arcing methodology (app.biblearc.com).
- Logos — Highlighting, Labels, Sentence Diagram docs (support.logos.com).
- Hebrew Clause Formatter — clauses.hebrewtools.org (clause formatting only).

---

*Prepared for Aleph Contour. Implementation blocked until explicit approval.*
