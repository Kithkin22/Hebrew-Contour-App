#!/usr/bin/env node
/** Natural-height verse-row composer + canonical pairing tests. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const composerSrc = fs.readFileSync(path.join(ROOT, 'js/app/publication-layout-composer.js'), 'utf8');
const fileMenu = fs.readFileSync(path.join(ROOT, 'js/app/file-menu.js'), 'utf8');

function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Missing function ' + name);
  let i = start;
  let depth = 0;
  let started = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('Unclosed function ' + name);
}

function parseBibleReference(input) {
  const cleaned = String(input || '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/);
  if (!m) return null;
  const sc = +m[2];
  const sv = m[3] ? +m[3] : 1;
  const ec = m[4] ? +m[4] : sc;
  const ev = m[5] ? +m[5] : m[3] ? sv : 999;
  const bookName = m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return { bookId: '18O', bookName, sc, sv, ec, ev, source: 'hebrew' };
}
function normalizePassageRangeRef(refStr) {
  const parsed = parseBibleReference(refStr);
  if (!parsed) return String(refStr || '').trim();
  if (parsed.sc === parsed.ec && parsed.sv === parsed.ev) {
    return parsed.bookName + ' ' + parsed.sc + ':' + parsed.sv;
  }
  if (parsed.sc === parsed.ec) {
    return parsed.bookName + ' ' + parsed.sc + ':' + parsed.sv + '-' + parsed.ev;
  }
  return parsed.bookName + ' ' + parsed.sc + ':' + parsed.sv + '-' + parsed.ec + ':' + parsed.ev;
}

const sandbox = { console, window: {} };
sandbox.window = sandbox;
sandbox.parseBibleReference = parseBibleReference;
sandbox.normalizePassageRangeRef = normalizePassageRangeRef;
vm.createContext(sandbox);
vm.runInContext(
  [
    extractFunction(fileMenu, 'canonicalAlephVerseKey'),
    extractFunction(fileMenu, 'chapterVerseSuffix'),
    composerSrc,
  ].join('\n'),
  sandbox,
  { filename: 'composer-test.js' },
);

const compose = sandbox.composePublicationLayout;

function engMap(map) {
  return function (v) {
    const key = sandbox.canonicalAlephVerseKey(v.ref);
    const text = map[key] != null ? map[key] : map[v.ref] || '';
    return { text: text, preserveLineBreaks: String(text).includes('\n'), source: 'publicationLayout' };
  };
}

function verse(ref, clauses) {
  return {
    ref: ref,
    clauses: (clauses || [{ indent: 0, words: [{ text: 'א', format: {}, specials: [] }] }]).map((c) =>
      typeof c === 'string'
        ? { indent: 0, words: [{ text: c, format: {}, specials: [] }] }
        : c,
    ),
  };
}

function clause(words, indent) {
  return {
    indent: indent || 0,
    words: (Array.isArray(words) ? words : [words]).map((t) => ({ text: t, format: {}, specials: [] })),
  };
}

// 1. One row per canonical verse; Heb|Num|Eng share the row
{
  const verses = [verse('Job 19:21', [clause(['א']), clause(['ב'])]), verse('Job 19:22', [clause(['ג'])])];
  const out = compose({
    verses,
    getEnglishForVerse: engMap({ 'Job 19:21': 'Be gracious', 'Job 19:22': 'Why' }),
  });
  assert.strictEqual(out.rows.length, 2);
  assert.strictEqual(out.rows[0].type, 'verse-row');
  assert.strictEqual(out.rows[0].verseKey, 'Job 19:21');
  assert.strictEqual(out.rows[0].verseNumber, '21');
  assert.strictEqual(out.rows[0].hebrew.units.length, 2);
  assert.ok(out.rows[0].english.text.includes('Be gracious'));
  assert.strictEqual(out.rows, out.blocks);
}

// 2–4. rowHeight = max(heb, eng); Eng growth / Heb growth
{
  const verses = [verse('Job 19:25', [clause(['א'])]), verse('Job 19:26', [clause(['ב'])])];
  const base = compose({
    verses,
    getEnglishForVerse: engMap({ 'Job 19:25': 'Short', 'Job 19:26': 'Next' }),
  });
  const tallEng = compose({
    verses,
    getEnglishForVerse: engMap({
      'Job 19:25': 'Line1\nLine2\nLine3\nLine4\nLine5',
      'Job 19:26': 'Next',
    }),
  });
  assert.ok(tallEng.rows[0].rowHeight > base.rows[0].rowHeight);
  assert.strictEqual(
    tallEng.rows[0].rowHeight,
    Math.max(tallEng.rows[0].measuredHebrewHeight, tallEng.rows[0].measuredEnglishHeight),
  );
  const d = tallEng.rows[0].rowHeight - base.rows[0].rowHeight;
  const baseStart26 = base.rows[0].rowHeight + base.rows[0].spacingAfter;
  const tallStart26 = tallEng.rows[0].rowHeight + tallEng.rows[0].spacingAfter;
  assert.ok(Math.abs(tallStart26 - baseStart26 - d) < 1);

  const tallHeb = compose({
    verses: [
      verse('Job 19:25', [clause(['א']), clause(['ב']), clause(['ג']), clause(['ד'])]),
      verse('Job 19:26', [clause(['ה'])]),
    ],
    getEnglishForVerse: engMap({ 'Job 19:25': 'x', 'Job 19:26': 'y' }),
  });
  assert.ok(tallHeb.rows[0].rowHeight > base.rows[0].rowHeight);
}

// Canonical join — reordered Contour array still pairs by key
{
  const verses = [verse('Job 19:26', [clause(['ב'])]), verse('Job 19:25', [clause(['א'])])];
  const out = compose({
    verses,
    getEnglishForVerse: engMap({
      'Job 19:25': 'I know that my Redeemer lives',
      'Job 19:26': 'and after my skin',
    }),
  });
  // Contour order preserved (composer walks verses in Contour order)
  assert.strictEqual(out.rows[0].verseKey, 'Job 19:26');
  assert.ok(out.rows[0].english.text.includes('after my skin'));
  assert.ok(out.rows[1].english.text.includes('Redeemer'));
}

// Duplicate Hebrew fails validation
{
  const verses = [verse('Job 19:25', [clause(['א'])]), verse('Job 19:25', [clause(['ב'])])];
  const out = compose({
    verses,
    getEnglishForVerse: engMap({ 'Job 19:25': 'x' }),
  });
  assert.ok(!out.pairing.ok);
  assert.ok(out.pairing.errors.some((e) => /Duplicate Hebrew/i.test(e)));
}

// Missing English → empty cell allowed
{
  const out = compose({
    verses: [verse('Job 19:21', [clause(['א'])])],
    getEnglishForVerse: () => ({ text: '', preserveLineBreaks: false }),
  });
  assert.ok(out.pairing.ok);
  assert.strictEqual(out.rows[0].english.text, '');
  assert.ok(out.pairing.report[0].hebrewFound);
  assert.ok(!out.pairing.report[0].englishFound);
}

// throwOnPairingError for export guard
{
  const verses = [verse('Job 19:25', [clause(['א'])]), verse('Job 19:25', [clause(['ב'])])];
  assert.throws(
    () =>
      compose({
        verses,
        getEnglishForVerse: engMap({ 'Job 19:25': 'x' }),
        throwOnPairingError: true,
      }),
    /could not verify|Duplicate/i,
  );
}

// No Contour spacer geometry — modest rowGap only
{
  const out = compose({
    verses: [
      verse('Job 19:21', [
        { indent: 0, spacingAfterPx: 72, words: [{ text: 'א', format: {}, specials: [] }] },
      ]),
      verse('Job 19:22', [clause(['ב'])]),
    ],
    getEnglishForVerse: engMap({ 'Job 19:21': 'a', 'Job 19:22': 'b' }),
  });
  assert.ok(out.rows[0].spacingAfter <= 20, 'no Contour large canvas gaps');
}

// Pagination units
{
  const many = [];
  for (let i = 1; i <= 60; i++) {
    many.push(verse('Job 19:' + i, [clause(['א']), clause(['ב']), clause(['ג'])]));
  }
  const map = {};
  many.forEach((v) => {
    map[sandbox.canonicalAlephVerseKey(v.ref)] = 'English line for ' + v.ref;
  });
  const out = compose({ verses: many, getEnglishForVerse: engMap(map) });
  assert.ok(out.pages.length >= 2);
  out.pages.forEach((p) => {
    (p.rows || []).forEach((r) => {
      assert.strictEqual(r.type, 'verse-row');
      assert.ok(r.hebrew && r.english);
    });
  });
}

// Column proportions
{
  assert.strictEqual(sandbox.PUBLICATION_LAYOUT_COL_TWIPS.heb, 5000);
  assert.strictEqual(sandbox.PUBLICATION_LAYOUT_COL_TWIPS.num, 650);
  assert.strictEqual(sandbox.PUBLICATION_LAYOUT_COL_TWIPS.eng, 5150);
}

// Missing Hebrew blocks export
{
  assert.throws(
    () =>
      compose({
        verses: [{ ref: 'Job 19:25', clauses: [{ indent: 0, words: [] }] }],
        getEnglishForVerse: engMap({ 'Job 19:25': 'x' }),
        throwOnPairingError: true,
      }),
    /could not verify|Missing Hebrew/i,
  );
}

// Mixed Contour block splits at canonical boundaries
{
  const mixed = {
    ref: 'Job 19:25',
    clauses: [
      {
        indent: 0,
        words: [
          { text: 'א', format: {}, specials: [], verseRef: 'Job 19:25' },
          { text: 'ב', format: {}, specials: [], verseRef: 'Job 19:26' },
        ],
      },
    ],
  };
  const out = compose({
    verses: [mixed],
    getEnglishForVerse: engMap({
      'Job 19:25': 'Redeemer',
      'Job 19:26': 'skin',
    }),
  });
  assert.strictEqual(out.rows.length, 2);
  assert.strictEqual(out.rows[0].verseKey, 'Job 19:25');
  assert.strictEqual(out.rows[1].verseKey, 'Job 19:26');
  assert.ok(out.rows[0].hebrew.units[0].words.every((w) => w.text === 'א'));
  assert.ok(out.rows[1].hebrew.units[0].words.every((w) => w.text === 'ב'));
  assert.ok(out.rows[0].english.text.includes('Redeemer'));
  assert.ok(out.rows[1].english.text.includes('skin'));
  assert.ok(!JSON.stringify(out.rows[0].hebrew).includes('"ב"'));
}

// Multiple Hebrew blocks for one verse combine in order
{
  const mixed = {
    ref: 'Job 19:25',
    clauses: [
      {
        indent: 0,
        words: [
          { text: 'א', format: {}, specials: [], verseRef: 'Job 19:25' },
          { text: 'ב', format: {}, specials: [], verseRef: 'Job 19:26' },
          { text: 'ג', format: {}, specials: [], verseRef: 'Job 19:25' },
        ],
      },
    ],
  };
  const out = compose({
    verses: [mixed],
    getEnglishForVerse: engMap({ 'Job 19:25': 'a', 'Job 19:26': 'b' }),
  });
  const texts25 = out.rows
    .find((r) => r.verseKey === 'Job 19:25')
    .hebrew.units.map((u) => u.words.map((w) => w.text).join(''))
    .join('|');
  assert.strictEqual(texts25, 'א|ג');
}

// Pairing report (dev/tests)
{
  const out = compose({
    verses: [verse('Job 19:25', [clause(['א'])])],
    getEnglishForVerse: engMap({ 'Job 19:25': 'yes' }),
  });
  assert.ok(out.pairing.report.length === 1);
  assert.strictEqual(out.pairing.report[0].verseKey, 'Job 19:25');
  assert.strictEqual(out.pairing.report[0].status, 'verified');
  assert.strictEqual(out.pairing.report[0].outputRow, 1);
}

console.log('OK: natural-height verse-row + pairing checks passed.');
