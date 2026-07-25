#!/usr/bin/env node
/** Unit tests for composePublicationLayout (Contour min spacing + English expansion + pagination). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const composerSrc = fs.readFileSync(path.join(ROOT, 'js/app/publication-layout-composer.js'), 'utf8');
const pageSrc = fs.readFileSync(path.join(ROOT, 'js/app/contour-page-renderer.js'), 'utf8');
const breaksSrc = fs.readFileSync(path.join(ROOT, 'js/app/layout-breaks.js'), 'utf8');

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

function extractConst(src, name) {
  const re = new RegExp('const ' + name + ' = \\{[\\s\\S]*?\\n\\};');
  const m = src.match(re);
  if (!m) throw new Error('Missing const ' + name);
  return m[0];
}

const sandbox = { console, window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  [
    extractConst(pageSrc, 'CONTOUR_PAGE'),
    'window.CONTOUR_PAGE = CONTOUR_PAGE;',
    extractFunction(pageSrc, 'contourPxToDocxTwips'),
    extractFunction(pageSrc, 'contourBreakDocxTwips'),
    extractFunction(pageSrc, 'contourVerseSpacingDocxTwips'),
    "const SPACING_AFTER_LEVELS = ['compact', 'default', 'small', 'medium', 'large'];",
    "const VERSE_SPACING_LEVELS = ['default', 'single', 'oneHalf', 'double'];",
    extractFunction(breaksSrc, 'normalizeSpacingAfter'),
    extractFunction(breaksSrc, 'normalizeVerseSpacingAfter'),
    extractFunction(breaksSrc, 'spacingAfterPxFromLevel'),
    extractFunction(breaksSrc, 'clauseSpacingAfterPx'),
    extractFunction(breaksSrc, 'verseSpacingAfterDocxTwips'),
    composerSrc,
  ].join('\n'),
  sandbox,
  { filename: 'composer-test.js' },
);

const compose = sandbox.composePublicationLayout;
assert.equal(typeof compose, 'function', 'composePublicationLayout exported');

function eng(text, preserve) {
  return function () {
    return { text: text || '', preserveLineBreaks: !!preserve, source: preserve ? 'publicationLayout' : 'import' };
  };
}

function verse(ref, clauses, spacingAfter) {
  const v = { ref: ref, clauses: clauses };
  if (spacingAfter) v.spacingAfter = spacingAfter;
  return v;
}

function clause(words, spacingAfterPx, indent) {
  return {
    indent: indent || 0,
    spacingAfterPx: spacingAfterPx,
    words: (words || ['א']).map((t) => ({ text: t, format: {}, specials: [] })),
  };
}

// Contour spacingAfterPx becomes minimum inter-segment gap
{
  const verses = [
    verse('Job 19:21', [clause(['א'], 40)]),
    verse('Job 19:22', [clause(['ב'], 0)]),
  ];
  const out = compose({
    verses,
    getEnglishForVerse: eng('Short', false),
  });
  assert.strictEqual(out.segments.length, 2, 'one segment per verse');
  assert.ok(out.segments[0].contourSpacingAfterPx >= 40, 'Contour clause trail is minimum');
  assert.ok(
    out.segments[0].contentPx >=
      out.segments[0].contourMinContentPx + out.segments[0].contourSpacingAfterPx,
    'contentPx includes Contour block floor (lines + trail)',
  );
}

// Verse anchors follow Contour verse order
{
  const verses = [
    verse('Job 19:21', [clause(['א'])]),
    verse('Job 19:25', [clause(['ב'])]),
    verse('Job 19:26', [clause(['ג'])]),
  ];
  const out = compose({ verses, getEnglishForVerse: eng('x', false) });
  assert.strictEqual(
    out.segments.map((s) => s.ref).join('|'),
    'Job 19:21|Job 19:25|Job 19:26',
    'anchors follow Contour order',
  );
  assert.strictEqual(
    out.segments.map((s) => s.verseNumber).join('|'),
    '21|25|26',
    'verse numbers from refs',
  );
}

// Tall English expands shared segment; later anchors shift together
{
  const tall =
    'Line one of a very long English publication layout that will wrap.\n' +
    'Line two continues the overflow deliberately for height.\n' +
    'Line three keeps going so englishContentPx exceeds Hebrew.\n' +
    'Line four ensures contentPx is driven by English.';
  const verses = [
    verse('Job 19:21', [clause(['א'], 18)]),
    verse('Job 19:22', [clause(['ב'], 0)]),
  ];
  const out = compose({
    verses,
    getEnglishForVerse: function (v) {
      if (v.ref === 'Job 19:21') return { text: tall, preserveLineBreaks: true, source: 'publicationLayout' };
      return { text: 'Short', preserveLineBreaks: false };
    },
  });
  const s0 = out.segments[0];
  const s1 = out.segments[1];
  assert.ok(s0.englishContentPx > s0.contourMinContentPx, 'English taller than Contour Hebrew lines');
  assert.strictEqual(
    s0.contentPx,
    Math.max(s0.contourMinContentPx + s0.contourSpacingAfterPx, s0.englishContentPx),
    'contentPx = max(Contour block, English)',
  );
  const contourOnlyEnd = s0.contourMinContentPx + s0.contourSpacingAfterPx;
  const pubEnd = s0.contentPx + s0.spacingAfterPx;
  assert.ok(pubEnd >= contourOnlyEnd, 'later Contour-min start never earlier than Contour-only');
  assert.ok(s1.verseIndex === 1, 'second anchor still verse 22');
}

// No Contour spacing compression
{
  const verses = [
    verse('Job 19:21', [clause(['א'], 72)]),
    verse('Job 19:22', [clause(['ב'], 0)]),
  ];
  const out = compose({
    verses,
    getEnglishForVerse: eng('', false),
  });
  assert.ok(
    out.segments[0].contentPx >= out.segments[0].contourMinContentPx + 72,
    'large Contour gap preserved with empty English',
  );
  assert.ok(
    out.segments[0].contentPx >=
      out.segments[0].contourMinContentPx + out.segments[0].contourSpacingAfterPx,
    'never compress Contour spacing',
  );
}

// Multi-page when content exceeds printable height
{
  const many = [];
  for (let i = 0; i < 40; i++) {
    many.push(
      verse('Job 19:' + (i + 1), [
        clause(['א'], 40),
        clause(['ב'], 40),
        clause(['ג'], 40),
      ]),
    );
  }
  const out = compose({
    verses: many,
    getEnglishForVerse: eng('One line.', false),
  });
  assert.ok(out.pages.length >= 2, 'packs onto multiple pages when needed');
  assert.ok(out.metrics.printableHeightPx > 0, 'printable height from Contour letter metrics');
}

// Keep-together moves intact when possible
{
  const verses = [
    verse('Job 19:21', [clause(['א'], 0), clause(['ב'], 0)]),
    verse('Job 19:22', [clause(['ג'], 0)]),
  ];
  const out = compose({
    verses,
    getEnglishForVerse: eng('Hello', false),
  });
  const firstPageSegs = out.pages[0].segments;
  const v21 = firstPageSegs.filter((s) => s.verseIndex === 0);
  assert.ok(v21.length === 1 || v21.every((s) => s.keepTogether === false), 'keep-together or controlled split');
  if (out.segments[0].contentPx <= out.metrics.printableHeightPx) {
    assert.strictEqual(out.segments[0].keepTogether, true, 'fits → keepTogether true');
  }
}

// Preview/DOCX consume identical composer output shape
{
  const out = compose({
    verses: [verse('Job 19:21', [clause(['א'], 18)])],
    getEnglishForVerse: eng('Be gracious to me,\nyou my friends,', true),
  });
  const seg = out.segments[0];
  assert.strictEqual(seg.type, 'verse-segment');
  assert.ok('contourMinContentPx' in seg);
  assert.ok('contourSpacingAfterPx' in seg);
  assert.ok('englishContentPx' in seg);
  assert.ok('contentPx' in seg);
  assert.ok('spacingAfterPx' in seg);
  assert.ok(seg.english && typeof seg.english.text === 'string');
  assert.ok(Array.isArray(out.pages));
  assert.ok(out.pages[0].segments.length >= 1);
  assert.ok(out.metrics.engColTwips === 6200);
}

console.log('OK: publication-layout-composer checks passed.');
