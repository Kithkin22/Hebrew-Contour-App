/**
 * Canonical Hebrew form helpers for Contour Inspector.
 *
 * Surface / Text form  = exact inflected word in the biblical text (word.text / MorphHB word)
 * Lexical form / Lemma  = dictionary headword (lemma)
 * Root                  = underlying root when available
 * Morphology / Parsing  = analysis of the surface form
 *
 * Contour owns passage/editor state. These helpers only classify morph/lexicon
 * fields for Inspector UI — they never rewrite manuscript tokens.
 *
 * No Aleph Study / vocabulary / learning-progress imports.
 */
(function (global) {
  function isHebrew(s) {
    return /[\u0590-\u05FF]/.test(String(s || ''));
  }

  function looksLikeStrong(s) {
    return /^H?\d+[A-Za-z]?$/.test(String(s || '').trim());
  }

  function firstHebrewOrNonStrong(candidates) {
    const list = (candidates || []).filter((v) => v != null && String(v).trim() !== '');
    const heb = list.find((v) => isHebrew(v));
    if (heb) return String(heb).trim();
    const nonStrong = list.find((v) => !looksLikeStrong(v));
    return nonStrong ? String(nonStrong).trim() : '';
  }

  /** Exact passage / MorphHB surface token. Never substitutes lemma. */
  function pickSurfaceForm(entry, fallbackSurface) {
    if (entry) {
      const fromEntry = firstHebrewOrNonStrong([
        entry.surface,
        entry.word,
        entry.text,
        entry.displayWord,
      ]);
      if (fromEntry) return fromEntry;
    }
    const fb = String(fallbackSurface || '').trim();
    return fb || '';
  }

  /**
   * Canonical dictionary form only.
   * Never falls back to surface / MorphHB "word" (often inflected or slash-form).
   */
  function pickLexicalForm(entry) {
    if (!entry) return '';
    return firstHebrewOrNonStrong([
      entry.lemmaHebrew,
      entry.hebrewLemma,
      entry.lexeme,
      entry.lemma,
      entry.headword,
    ]);
  }

  /**
   * Underlying root only.
   * Does not fall back to surface word. Does not silently use lemma-as-root
   * unless MorphHB (or similar) already stores root separately from lemma —
   * when only lemma exists, Root stays empty so Lexical form owns that string.
   */
  function pickRootForm(entry) {
    if (!entry) return '';
    const root = firstHebrewOrNonStrong([
      entry.rootHebrew,
      entry.hebrewRoot,
      entry.root,
      entry.displayRoot,
    ]);
    if (root) return root;
    return '';
  }

  function pickParsing(entry) {
    if (!entry) return '';
    return String(entry.parsing || entry.morph || entry.morphology || '').trim();
  }

  function inspectForms(entry, fallbackSurface) {
    return {
      surface: pickSurfaceForm(entry, fallbackSurface) || '—',
      lexical: pickLexicalForm(entry) || '—',
      root: pickRootForm(entry) || '—',
      parsing: pickParsing(entry) || '—',
    };
  }

  global.CONTOUR_HEBREW_FORMS = {
    isHebrew,
    looksLikeStrong,
    pickSurfaceForm,
    pickLexicalForm,
    pickRootForm,
    pickParsing,
    inspectForms,
  };
  global.pickSurfaceForm = pickSurfaceForm;
  global.pickLexicalForm = pickLexicalForm;
  global.pickRootForm = pickRootForm;
})(typeof window !== 'undefined' ? window : globalThis);
