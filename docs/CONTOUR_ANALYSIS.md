# Contour vs. Aleph: Comparative Analysis

**Date:** June 8, 2026  
**Projects analyzed:**
- **Hebrew-Contour-App** (`/Users/joekindon/Documents/Hebrew-Contour-App`) — production PWA, single-file app
- **Aleph & Alpha** (`/Users/joekindon/Documents/aleph`) — Next.js scaffold, PRD-driven, early UI

This report compares the two codebases and identifies reusable functionality from Hebrew-Contour-App that may accelerate Aleph development, organized around the focus areas requested.

---

## Executive Summary

| Area | Hebrew-Contour-App | Aleph (current) | Reuse potential |
|------|---------------------|-----------------|-----------------|
| Hebrew text rendering | Fully implemented (RTL, SBL fonts, word spans) | Not started | **High** |
| Word selection | Click + keyboard navigation, same-form highlighting | Planned (Collect Mode) | **High** |
| Inspector | Manual per-word gloss/notes; no lemma/root | Planned (Surface, Lemma, Root, Gloss, Parsing) | **Medium** (patterns only) |
| Lexicon lookup | None | Planned (future lexicon links) | **None** |
| MorphHB integration | None (WLC text only) | Not started | **Low** (WLC loader is reusable; MorphHB is separate) |
| Data structures | Verse → clause → word tree | PRD defines vocabulary/session models | **High** (adapt, don't copy wholesale) |
| User workflow | Annotate & export for study/teaching | Read → Collect → Study → Read Better | **Medium–High** |

**Bottom line:** Hebrew-Contour-App is a mature, offline-capable Hebrew *annotation* tool with embedded WLC and strong word-level UI primitives. Aleph is a reading-centered *learning* platform still at navigation/UI scaffolding. The highest-value transfers are Hebrew rendering, word-token selection/normalization, WLC passage loading, and PWA offline patterns—not Contour's contour-editing or export features, which serve a different primary workflow.

---

## Project Overview

### Hebrew-Contour-App

- **Stack:** Vanilla HTML/CSS/JS in one `index.html` (~16 MB, mostly embedded WLC), plus `manifest.json` and `service-worker.js`
- **Purpose:** Generate or paste Hebrew text, structure it into clauses (contour), annotate words (gloss, parsing, notes, formatting), and export to Word/PDF
- **Maturity:** Feature-complete for its scope; installable PWA with offline caching
- **Audience:** Students/teachers doing syntactic contour analysis and table-based annotation

### Aleph & Alpha

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Purpose (PRD):** Mobile-first biblical language learning — read Hebrew, collect unknown words, study with flashcards/parsing trainer, return to reading
- **Maturity:** Phase 1 complete (home, read, study navigation shells); reading screen, collect mode, vocabulary DB, and study engine are future work
- **Source files:** 6 TypeScript/TSX files under `src/` plus `docs/PRD.md` and `docs/ROADMAP.md`

---

## 1. Hebrew Text Rendering

### Hebrew-Contour-App

Contour renders Hebrew as discrete clickable `<span class="word">` elements inside RTL clause blocks:

- **Direction & bidi:** `direction: rtl`, `text-align: right`, `unicode-bidi: isolate` on editor and export views
- **Fonts:** `'SBL BibLit', 'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif` — appropriate for pointed biblical Hebrew
- **Layout:** Verses shown with LTR reference labels; clauses indented via `margin-right` (RTL logical indent)
- **Visual states:** `.selected` (orange), `.sameword` (yellow, repeated surface forms), `.deleted`, `.pred`/`.subj` (syntax coloring), formatting classes (bold, highlight, brackets)
- **Tokenization:** Words split on whitespace at ingest (`line.trim().split(/\s+/)`); maqaf-connected words stay together as one token

### Aleph

- No Hebrew rendering yet; UI uses Geist/Arial for English navigation
- PRD requires continuous reading of WLC and Logos-pasted text with optional vocabulary highlighting

### Reusable for Aleph

| Item | Notes |
|------|-------|
| RTL CSS patterns | Port `#editor` / `.clause` / `.word` styles into a React `HebrewText` or `VerseBlock` component |
| SBL font stack | Add the same `font-family` chain; consider self-hosting SBL fonts for offline packs |
| Word-as-span model | Essential for tap-to-collect; each word needs stable `data-v`, `data-c`, `data-w` or equivalent IDs |
| `unicode-bidi: isolate` | Prevents mixed Hebrew/LTR verse numbers from breaking layout |
| Verse reference display | LTR muted label above RTL text block — matches Aleph's chapter/verse context needs |

**Caveat:** Contour's 26px / line-height 2.1 sizing targets desktop annotation. Aleph should tune for mobile reading (likely smaller base size, touch targets ≥ 44px).

---

## 2. Word Selection

### Hebrew-Contour-App

Selection is central to the editor:

```javascript
// Click handler (simplified from renderEditor)
el.onclick = (ev) => {
  let clicked = { v: +el.dataset.v, c: +el.dataset.c, w: +el.dataset.w };
  if (ev.shiftKey && locOK(state.selected)) {
    applyBracketRange(state.selected, clicked);
    return;
  }
  state.selected = clicked;
  renderEditor();
};
```

- **Keyboard navigation:** Arrow keys move word/clause; RTL-aware (`ArrowLeft` moves to next word in reading order)
- **Same-form highlighting:** `normalizeHebrewWord()` strips cantillation (U+0591–U+05C7), maqaf, and punctuation; all matching surface forms get `.sameword` class
- **Location model:** `{ v, c, w }` — verse index, clause index, word index
- **Validation:** `locOK(l)` guards all mutations

### Aleph

- PRD **Collect Mode:** tap unknown words while reading; selections autosave
- Post-read **Review Selected Words:** deduplicate by surface form, show occurrence counts, swipe to remove
- Future **vocabulary highlighting** by status (New / Learning / Known / Mastered)

### Reusable for Aleph

| Item | Notes |
|------|-------|
| `{ v, c, w }` locator | Maps cleanly to Book → Chapter → Verse → Word; extend with `bookId`, `chapter`, `verse` for persistence |
| `normalizeHebrewWord()` | Critical for deduplicating collected vocabulary and matching across occurrences |
| `.sameword` highlighting | Directly supports "show all instances of this form in passage" and vocabulary status coloring |
| `nextLoc()` / `moveWord()` | Useful if Aleph adds keyboard/accessibility navigation on desktop |
| Click-to-select on spans | Foundation for Collect Mode tap targets |

**Adaptation for Aleph:** Replace single `state.selected` with a `Set` or map of collected word keys; persist to IndexedDB instead of in-memory JSON. Shift-click bracketing is Contour-specific and not needed for Aleph MVP.

---

## 3. Inspector Functionality

### Hebrew-Contour-App

Contour has no dedicated inspector panel. Word-level metadata is entered manually:

- **`n` key / modal:** Per-word `note` (used for parsing or freeform notes)
- **`t` key / modal:** Per-word `translation` (gloss)
- **`p` / `s` keys:** Toggle `specials` array (`predicate`, `subject`)
- **Table View tab:** Clause-level aggregation — Hebrew text, gloss column (word translations joined), Parsing column (clause `ann.Parsing`), Notes column (word notes joined), plus custom columns

There is **no automatic lookup** of lemma, root, or morphology. The "inspector" is effectively the selected word's inline state plus the annotation table.

### Aleph

PRD defines an **Inspector** with:

- Surface Form, Lemma, Root, Gloss, Parsing (basic view)
- Future: frequency, other occurrences, lexicon links

### Reusable for Aleph

| Item | Notes |
|------|-------|
| Word-level `{ note, translation }` fields | Map `translation` → Gloss; `note` → user parsing notes |
| Modal prompt pattern | Simple `promptModal()` can inspire a bottom-sheet inspector on mobile |
| Table aggregation (`clauseRows()`) | Pattern for rolling up word annotations to clause/verse views |
| Predicate/subject tagging | Optional advanced feature for parsing trainer, not Aleph MVP |

**Gap:** Aleph needs automated lemma/root/gloss from a morphological lexicon. Contour provides **UI patterns only**, not lexical data. The inspector shell (show fields for selected word) can be built now; data must come from MorphHB + lexicon (see §5).

---

## 4. Lexicon Lookup

### Hebrew-Contour-App

**Not implemented.** No Brown-Driver-Briggs, HALOT, Strong's, or other lexicon integration. Glosses are user-typed strings.

### Aleph

PRD lists lexicon links as a **future** inspector feature. Vocabulary storage expects Lemma, Root, and Gloss — implying automated or semi-automated lookup eventually.

### Reusable for Aleph

**Nothing directly reusable.** Contour has no lexicon code, indexes, or API calls.

**Indirect value:** `normalizeHebrewWord()` is a prerequisite for matching surface forms to lexicon entries. Word token boundaries from `parseText()` must align with morphological database tokenization (maqaf handling is a known integration challenge).

---

## 5. MorphHB Integration

### Hebrew-Contour-App

**No MorphHB integration.** Text source is **Westminster Leningrad Codex (WLC)** embedded as `WLC_TEXT`:

- **Format:** Tab-separated records: `bookId \t chapter \t verse \t blank \t sequence \t hebrewText`
- **Coverage:** 39 OT books (`01O`–`39O`), ~23,213 verse records (~16 MB embedded)
- **Book metadata:** `BOOK_NAMES` — 86 entries (OT, NT, Apocrypha IDs); UI filters to `*O` (Old Testament) for generation
- **Range query:** `getWlcText(book, startCh, startV, endCh, endV)` streams verses in reference order
- **Provenance note in UI:** "Uses the same bundled Westminster Leningrad Codex text source as ClauseFormatter"

MorphHB (morphological tagging: lemma, parsing codes, etc.) is a **separate dataset** from WLC surface text. Contour does not load or cross-reference it.

### Aleph

PRD specifies:

- Built-in **WLC** for reading (book/chapter selection, continuous reading, offline packs)
- Vocabulary fields: Surface Form, **Lemma**, **Root**, Gloss, Parsing
- Parsing Trainer (future) — needs morphological data

### Reusable for Aleph

| Item | Notes |
|------|-------|
| `getWlcText()` range algorithm | Port to TypeScript; parameterize book ID scheme (`08O` = Ruth) |
| `BOOK_NAMES` / `parseBooks()` | Book picker for "Open WLC" flow |
| `generateWlc()` → `parseText()` pipeline | Load passage → tokenize → render; matches Aleph Read flow |
| WLC TSV schema | Documented above; split embedded blob into per-book JSON for offline packs |
| `generatedRefs` per-verse labels | `Ruth 3:4` style refs for session tracking |

**Not reusable for morphology:**

- Contour has zero MorphHB parsing
- Aleph should integrate [OpenScriptures MorphHB](https://github.com/openscriptures/morphhb) (or similar) as a **separate module** keyed by `book/chapter/verse/word index`
- Matching WLC tokens to MorphHB tokens will require normalization logic beyond Contour's whitespace split (prefixes, maqaf, definite article, etc.)

**Recommended architecture for Aleph:**

```
WLC verse text  →  tokenize  →  surface tokens (from Contour)
                                      ↓
MorphHB XML/TSV →  align by ref  →  lemma, morphology (new module)
                                      ↓
Lexicon index   →  lemma lookup  →  gloss (new module)
```

---

## 6. Data Structures

### Hebrew-Contour-App

Top-level state:

```javascript
state = {
  ref: '',           // passage reference string, e.g. "Ruth 3:4-3:8"
  verses: [],        // array of verse objects
  selected: null,    // { v, c, w } or null
  columns: []        // custom table column names
}
```

Verse object:

```javascript
{
  ref: 'Ruth 3:4',
  clauses: [
    {
      indent: 0,
      words: [
        {
          text: 'וִיהִי',
          deleted: false,
          specials: [],      // 'predicate' | 'subject'
          note: '',
          translation: '',   // gloss
          color: '',
          format: { bold, italic, underline, doubleUnderline, highlight },
          bracketStart, bracketEnd  // optional
        }
      ],
      ann: { Parsing: '', ...customCols }
    }
  ]
}
```

Persistence: manual JSON copy/paste via `saveBtn` (no `localStorage`, no IndexedDB).

### Aleph (PRD-defined, not yet coded)

**Vocabulary entry:**

- Surface Form, Lemma, Root, Gloss
- Book, Chapter, Verse, Reading Session
- Status: New → Learning → Known → Mastered

**Session concepts:**

- Reading session (WLC range or Logos paste)
- Study session (flashcards, parsing trainer)
- Continue Reading / Continue Study resume points

### Mapping & Reuse Recommendations

| Contour | Aleph equivalent | Action |
|---------|------------------|--------|
| `word.text` | `surfaceForm` | Rename; keep pointed form |
| `word.translation` | `gloss` (user or lexicon) | Reuse field semantics |
| `word.note` | `parsingNotes` or user notes | Optional in inspector |
| `verse.ref` + `{v,c,w}` | `book, chapter, verse, wordIndex` | Add explicit canonical refs |
| `state.ref` | `readingSession.passageRef` | Reuse |
| `normalizeHebrewWord(text)` | `normalizedSurface` key | Add for dedup/highlighting |
| `clauses[]` | Not needed for Aleph reading | Omit unless teaching syntax |
| `columns`, `ann`, `format`, `specials` | Contour-specific | Omit for Aleph MVP |

**Suggested Aleph types (TypeScript):**

```typescript
type WordLocator = {
  bookId: string;      // e.g. "08O"
  chapter: number;
  verse: number;
  wordIndex: number;
};

type ReadingToken = {
  surface: string;
  normalized: string;
  locator: WordLocator;
};

type VocabularyItem = {
  surfaceForm: string;
  normalizedForm: string;
  lemma?: string;
  root?: string;
  gloss?: string;
  parsing?: string;
  occurrences: WordLocator[];
  status: 'new' | 'learning' | 'known' | 'mastered';
  sessionId: string;
};
```

---

## 7. User Workflow

### Hebrew-Contour-App workflow

1. **Source text**
   - Generate from WLC (book + chapter/verse range), or
   - Paste Hebrew (space-separated words, one line per verse), or
   - Load sample (Ruth 3:4)
2. **Create text** → `parseText()` builds verse/clause/word tree
3. **Contour Editor tab**
   - Click word to select
   - Structure: Enter = clause break, Tab/Backspace = indent/outdent
   - Annotate: `t` gloss, `n` note, `p`/`s` predicate/subject
   - Format: colors, bold, highlights, brackets
4. **Table View tab** — clause-level gloss/parsing/notes; editable cells; custom columns
5. **Export** — contour to Word/PDF; table to Word
6. **Save/Restore** — copy JSON state manually

**Primary user:** Someone *structuring and annotating* a passage for homework or teaching handouts.

### Aleph workflow (PRD)

1. **Home** → Read or Study
2. **Read** → Continue / Open WLC / Paste from Logos
3. **Reading screen** → scroll Hebrew; optional Collect Mode (tap unknown words)
4. **Review selections** → deduplicated list with counts
5. **Study** → flashcards / parsing trainer from collected vocabulary
6. **Return to reading** → vocabulary highlighting shows progress

**Primary user:** Someone *reading for fluency* and building vocabulary organically from the text.

### Workflow Overlap & Divergence

| Step | Contour | Aleph | Reuse? |
|------|---------|-------|--------|
| WLC book/range picker | ✅ | Planned | **Yes** — port UI + `getWlcText` |
| Paste Hebrew | ✅ | Planned (Logos) | **Yes** — `parseText` tokenization |
| Word tap selection | ✅ | Collect Mode | **Yes** |
| Auto lemma/gloss | ❌ | Required | **No** |
| Clause contour editing | ✅ | Not in scope | **No** |
| Export to Word | ✅ | Quizlet export (different) | **No** (unless user-owned data export) |
| Save progress | Manual JSON | Autosave / Continue | **Pattern only** — Aleph needs IndexedDB |
| Study / flashcards | ❌ | Core feature | **No** |

### PWA / Offline (bonus reuse)

Contour's offline model aligns with Aleph PRD **Offline Packs**:

- `service-worker.js`: cache-first for shell assets; network fallback; offline fallback to `index.html`
- `manifest.json`: standalone display, icons, theme color

Aleph already has `src/app/manifest.ts` (Next.js manifest route) but no service worker yet. Contour's SW strategy is a reference for caching reading packs once WLC is split into downloadable chunks.

---

## Reuse Priority Matrix

### Tier 1 — Port soon (high impact, low risk)

1. **`normalizeHebrewWord()`** — vocabulary dedup and highlighting
2. **WLC `getWlcText()` + book list** — unblocks Open WLC reading screen
3. **`parseText()` tokenization** — paste from Logos flow
4. **RTL word-span rendering component** — reading UI foundation
5. **Word click selection + `{ v, c, w }` locator** — Collect Mode

### Tier 2 — Adapt (medium effort)

6. **Keyboard navigation (`nextLoc`, `moveWord`)** — accessibility / desktop
7. **Same-form highlighting (`.sameword`)** — reading aid + vocabulary review
8. **Per-word gloss/note modal** — inspector user-override fields
9. **WLC data packaging** — split 16 MB blob into per-book offline packs
10. **Service worker caching pattern** — offline reading shell

### Tier 3 — Reference only (different product goals)

11. Clause break/indent/contour editing
12. Predicate/subject/bracket formatting
13. DOCX/ZIP export (`makeZip`, `contourDocxXml`)
14. Annotation table with custom columns
15. Manual JSON save/restore UX

### Not available in Contour (Aleph must build)

- MorphHB alignment and parsing display
- Lexicon lookup and gloss automation
- Vocabulary spaced-repetition / study engine
- Collect Mode review UI (dedup, swipe remove, occurrence counts)
- Continue Reading / session persistence
- Vocabulary status highlighting

---

## Architectural Recommendations for Aleph

1. **Extract shared library** — Move WLC loading, Hebrew normalization, and token types into `src/lib/hebrew/` rather than porting inline script verbatim.

2. **Split WLC data** — Do not embed 16 MB in the client bundle. Store per-book JSON under `public/data/wlc/` or IndexedDB for offline packs.

3. **Keep Contour's word model, drop clause model** — For reading, a flat `Verse { tokens: Word[] }` is sufficient; clause/indent is Contour-specific.

4. **Add morph layer separately** — Plan MorphHB integration as `getMorphology(locator) → { lemma, parsing }` without coupling to Contour code.

5. **Inspector as bottom sheet** — On mobile, show Surface + Lemma + Root + Gloss + Parsing when a collected word is tapped; pre-fill from morph/lexicon, allow user override (Contour's `translation`/`note` pattern).

6. **Font strategy** — Match Contour's SBL stack for fidelity; bundle fonts in offline packs.

---

## File Reference

### Hebrew-Contour-App (key files)

| File | Role |
|------|------|
| `index.html` | Entire app: UI, ~23k WLC verses, all logic |
| `manifest.json` | PWA metadata |
| `service-worker.js` | Offline asset caching |
| `README.md` | Install instructions (GitHub Pages + iPhone) |

### Aleph (key files)

| File | Role |
|------|------|
| `docs/PRD.md` | Product requirements (reading-first, collect, study) |
| `docs/ROADMAP.md` | Phase tracking |
| `src/app/page.tsx` | Home (Read / Study) |
| `src/app/read/page.tsx` | Read entry points (stub cards) |
| `src/app/study/page.tsx` | Study entry points (stub cards) |
| `src/components/action-card.tsx` | Mobile card UI pattern |
| `src/app/manifest.ts` | Web app manifest |

---

## Conclusion

Hebrew-Contour-App and Aleph share a foundation of **Hebrew biblical text** and **word-level interaction**, but serve different workflows: Contour is an annotation and export tool for syntactic analysis; Aleph is a reading-centered vocabulary learning platform.

The most valuable transfers to Aleph are:

- Proven **Hebrew RTL rendering** and **word-span selection**
- **`normalizeHebrewWord()`** for matching and deduplication
- **Embedded WLC corpus** and **passage-range loading** (repackaged for Next.js offline packs)
- **PWA offline patterns**

Aleph must still build morphological analysis (MorphHB), lexicon lookup, vocabulary persistence, study engine, and the Read → Collect → Study loop described in its PRD. Contour does not shorten that path, but it provides working reference implementations for the hardest UI and text-handling problems Aleph faces in Phase 2.
