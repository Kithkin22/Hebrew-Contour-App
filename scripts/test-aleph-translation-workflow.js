#!/usr/bin/env node
/** Minimal workflow test: Aleph JSON import + side-by-side DOCX XML. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const fileMenu = fs.readFileSync(path.join(ROOT, 'js/app/file-menu.js'), 'utf8');
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

const sandbox = {
  console,
  state: null,
  MAQAF_CHAR: '־',
  isMaqafConnector: () => false,
  ensureSelectableWordFields: () => {},
  isCommentBoundary: () => false,
  legendEntriesForExport: () => [],
  migrateAllInclusios: () => {},
  ensureComments: () => {},
  ensureArcs: () => {},
  commentAnchorText: () => '',
  locToLabel: () => '',
  verseRefHidden: () => false,
  markUndo: () => {},
  syncStateBundle: () => {},
  autoSaveProject: () => {},
  updateSaveStatus: () => {},
  autosaveReady: false,
  isParallelActive: () => false,
};
sandbox.window = sandbox;

function parseBibleReference(input) {
  const cleaned = String(input || '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/);
  if (!m) return null;
  const sc = +m[2];
  const sv = m[3] ? +m[3] : 1;
  const ec = m[4] ? +m[4] : sc;
  const ev = m[5] ? +m[5] : m[3] ? sv : 999;
  const bookName = m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return { bookId: bookName === 'Ruth' ? '08O' : '18O', bookName, sc, sv, ec, ev, source: 'hebrew' };
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
sandbox.parseBibleReference = parseBibleReference;
sandbox.normalizePassageRangeRef = normalizePassageRangeRef;

vm.createContext(sandbox);
vm.runInContext(
  [
    extractConst(pageSrc, 'CONTOUR_PAGE'),
    'window.CONTOUR_PAGE = CONTOUR_PAGE;',
    extractFunction(pageSrc, 'contourPxToDocxTwips'),
    extractFunction(pageSrc, 'contourBreakDocxTwips'),
    extractFunction(pageSrc, 'contourVerseSpacingDocxTwips'),
    extractFunction(pageSrc, 'contourIndentDocxTwips'),
    "const SPACING_AFTER_LEVELS = ['compact', 'default', 'small', 'medium', 'large'];",
    "const VERSE_SPACING_LEVELS = ['default', 'single', 'oneHalf', 'double'];",
    extractFunction(breaksSrc, 'normalizeSpacingAfter'),
    extractFunction(breaksSrc, 'normalizeVerseSpacingAfter'),
    extractFunction(breaksSrc, 'spacingAfterPxFromLevel'),
    extractFunction(breaksSrc, 'contourTabIndentStepPx'),
    extractFunction(breaksSrc, 'clauseIndentPx'),
    extractFunction(breaksSrc, 'clauseSpacingAfterPx'),
    extractFunction(breaksSrc, 'spacingAfterDocxTwips'),
    extractFunction(breaksSrc, 'contourIndentDocxTwipsForClause'),
    extractFunction(breaksSrc, 'verseSpacingAfterDocxTwips'),
    composerSrc,
    extractFunction(fileMenu, 'xmlEscape'),
    extractFunction(fileMenu, 'canonicalAlephVerseKey'),
    extractFunction(fileMenu, 'chapterVerseSuffix'),
    extractFunction(fileMenu, 'alephEntryText'),
    extractFunction(fileMenu, 'validateAlephTranslationJson'),
    extractFunction(fileMenu, 'alephPassageMatchError'),
    extractFunction(fileMenu, 'normalizeAlephTranslationsMap'),
    extractFunction(fileMenu, 'getAlephTranslationEntryForVerse'),
    extractFunction(fileMenu, 'getAlephTranslationForVerse'),
    extractFunction(fileMenu, 'ensureAlephPublicationBag'),
    extractFunction(fileMenu, 'hasPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'getPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'getSideBySideEnglishForVerse'),
    extractFunction(fileMenu, 'setPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'seedPublicationLayoutsFromImport'),
    extractFunction(fileMenu, 'applyAlephTranslationImport'),
    extractFunction(fileMenu, 'normalizeEnglishForSideBySideDocx'),
    extractFunction(fileMenu, 'normalizePublicationLayoutText'),
    extractFunction(fileMenu, 'publicationLayoutPlainTextFromHtml'),
    extractFunction(fileMenu, 'publicationEnglishLinesForDocx'),
    extractFunction(fileMenu, 'contourDocxXml'),
  ].join('\n'),
  sandbox,
  { filename: 'helpers.js' },
);

function resetState() {
  sandbox.state = {
    ref: 'Job 19:21-29',
    language: 'hebrew',
    verses: [
      { ref: 'Job 19:21', clauses: [{ indent: 0, words: [{ text: 'חָנֻּנִי', format: {}, specials: [] }] }] },
      { ref: 'Job 19:22', clauses: [{ indent: 0, words: [{ text: 'לָמָּה', format: { bold: true }, specials: [] }] }] },
      { ref: 'Job 19:23', clauses: [{ indent: 1, words: [{ text: 'מִי', format: {}, specials: ['predicate'] }] }] },
    ],
    comments: [],
    arcs: [],
    inclusios: [],
    legend: [],
    alephTranslations: null,
  };
}

resetState();

const good = {
  app: 'aleph',
  version: 1,
  reference: 'Job 19:21–29',
  translations: {
    'Job 19:21': { text: 'Pity me, pity me, you my friends' },
    'Job 19:22': { text: 'Why do you pursue me as God does?' },
    'Job 19:99': { text: 'EXTRA should be ignored' },
  },
};

assert.strictEqual(sandbox.validateAlephTranslationJson(good), null);
assert.strictEqual(sandbox.applyAlephTranslationImport(good).ok, true);
assert.strictEqual(
  sandbox.getAlephTranslationForVerse(sandbox.state.verses[0]),
  'Pity me, pity me, you my friends',
);
assert.strictEqual(
  sandbox.getAlephTranslationForVerse(sandbox.state.verses[1]),
  'Why do you pursue me as God does?',
);
assert.strictEqual(sandbox.getAlephTranslationForVerse(sandbox.state.verses[2]), '');

// Legacy short-key + string value still imports
resetState();
const legacy = {
  app: 'aleph',
  version: 1,
  reference: 'Job 19:21-29',
  translations: {
    '19:21': 'Legacy pity me',
    '19:22': { text: 'Legacy why' },
  },
};
assert.strictEqual(sandbox.applyAlephTranslationImport(legacy).ok, true);
assert.strictEqual(sandbox.getAlephTranslationForVerse(sandbox.state.verses[0]), 'Legacy pity me');
assert.strictEqual(sandbox.getAlephTranslationForVerse(sandbox.state.verses[1]), 'Legacy why');

// Wrong book
resetState();
assert.ok(
  /Wrong book/.test(
    sandbox.applyAlephTranslationImport({
      app: 'aleph',
      version: 1,
      reference: 'Ruth 1:1-5',
      translations: { 'Ruth 1:1': { text: 'nope' } },
    }).error,
  ),
);

// Wrong range
resetState();
assert.ok(
  /Wrong passage range/.test(
    sandbox.applyAlephTranslationImport({
      app: 'aleph',
      version: 1,
      reference: 'Job 1:1-5',
      translations: { 'Job 1:1': { text: 'nope' } },
    }).error,
  ),
);

// Malformed entry
assert.ok(
  /Invalid translation/.test(
    sandbox.validateAlephTranslationJson({
      app: 'aleph',
      version: 1,
      reference: 'Job 19:21-29',
      translations: { 'Job 19:21': 42 },
    }),
  ),
);

// Empty map
assert.ok(
  /empty/i.test(
    sandbox.validateAlephTranslationJson({
      app: 'aleph',
      version: 1,
      reference: 'Job 19:21-29',
      translations: {},
    }),
  ),
);

resetState();
sandbox.state.alephTranslations = {
  reference: 'Job 19:21-29',
  translations: {
    'Job 19:21': {
      text: 'Be gracious to me,\n    be gracious to me,\n    you my friends,',
    },
    'Job 19:22': { text: 'Why do you pursue me\n    like God' },
  },
  byChapterVerse: {
    '19:21': {
      text: 'Be gracious to me,\n    be gracious to me,\n    you my friends,',
    },
    '19:22': { text: 'Why do you pursue me\n    like God' },
  },
};

const xml = sandbox.contourDocxXml({ sideBySide: true });
assert.ok(xml.includes('<w:tbl>'), 'side-by-side uses a table');
assert.ok(/w:tblBorders>[\s\S]*w:val="nil"/.test(xml), 'table borders are nil');
assert.ok(!/w:tblBorders>[\s\S]*w:val="single"/.test(xml), 'no single table borders');
assert.ok(!xml.includes('<w:tblStyle'), 'no Word table style that could restore borders');
assert.ok(xml.includes('<w:tblLayout w:type="fixed"/>'), 'fixed column layout for Word');
assert.ok(!xml.includes('>Hebrew<'), 'no Hebrew column header');
assert.ok(!xml.includes('>Translation<'), 'no Translation column header');
assert.ok(xml.includes('<w:cantSplit/>'), 'verse rows prefer not to split');
assert.ok(xml.includes('<w:vAlign w:val="top"/>'), 'cells are top-aligned');
assert.ok(xml.includes('w:w="650"'), 'narrow verse-number column (~6%)');
assert.ok(xml.includes('w:w="5000"'), 'Hebrew column (~46%)');
assert.ok(xml.includes('w:w="5150"'), 'English column (~48%)');
assert.ok(
  xml.includes('<w:tblGrid><w:gridCol w:w="5150"/><w:gridCol w:w="650"/><w:gridCol w:w="5000"/></w:tblGrid>'),
  'three-column tblGrid English | verse | Hebrew',
);
assert.ok(xml.includes('w:tblW w:w="5000" w:type="pct"'), 'table spans full content width (100%)');
assert.ok(xml.includes('<w:tblInd w:w="0"'), 'table zero indent');
assert.ok(xml.includes('w:sz w:val="26"'), 'English ~13pt (scholarly)');
assert.ok(xml.includes('w:line="240"'), 'English single/compact line spacing');
assert.ok(!xml.includes('w:line="288"'), 'no loose 1.2 English line spacing');
assert.ok(xml.includes('<w:cantSplit/>'), 'verse rows keep Heb/Num/Eng together');
assert.ok(xml.includes('<w:bidi/><w:jc w:val="right"/>'), 'Hebrew remains bidi + right-justified');
assert.ok(
  /w:tcW w:w="5000"[\s\S]*?w:right w:w="0"/.test(xml),
  'Hebrew cell has zero right margin for flush page-edge',
);

// English before Hebrew in each data row.
const engPos = xml.indexOf('Be gracious to me,');
const hebPos = xml.indexOf('חָנֻּנִי');
assert.ok(engPos > -1 && hebPos > -1 && engPos < hebPos, 'English column precedes Hebrew');
assert.ok(xml.includes('>21<'), 'center verse number present');
assert.ok(
  xml.includes('Be gracious to me, be gracious to me, you my friends,'),
  'single newlines reflow into continuous English prose',
);
assert.ok(!xml.includes('<w:br/>'), 'no hard w:br for ordinary English newlines');
const engCellMatch = xml.match(/<w:tcW w:w="5150"[\s\S]*?<\/w:tc>/);
assert.ok(engCellMatch, 'English cell present');
const engCell = engCellMatch[0];
assert.ok((engCell.match(/<w:p>/g) || []).length === 1, 'one English paragraph when source has only single newlines');
const hebCellMatch = xml.match(/<w:tcW w:w="5000"[\s\S]*?<\/w:tc>/);
assert.ok(hebCellMatch, 'Hebrew cell present');
assert.ok(hebCellMatch[0].includes('<w:bidi/>'), 'Hebrew cell keeps bidi');
assert.ok(hebCellMatch[0].includes('w:jc w:val="right"'), 'Hebrew cell keeps right justification');
assert.ok(xml.includes('<w:b/><w:bCs/>'), 'Hebrew formatting preserved');
assert.ok(xml.includes('0B61A4'), 'annotation color preserved');
assert.ok(xml.includes('<w:bidi/>'), 'Hebrew RTL paragraph properties preserved');
assert.ok(!xml.includes('Job 19:21</w:t>'), 'side-by-side omits full verse-ref lines in Hebrew cell');

// Export-time normalization unit checks (does not mutate stored translation).
function normEq(input, expected, msg) {
  assert.strictEqual(
    JSON.stringify(Array.from(sandbox.normalizeEnglishForSideBySideDocx(input))),
    JSON.stringify(expected),
    msg,
  );
}
normEq('line one\nline two', ['line one line two'], 'single newline joins with one space');
normEq('paragraph one\n\nparagraph two', ['paragraph one', 'paragraph two'], 'blank line preserves paragraph boundary');
normEq('line one\r\nline two', ['line one line two'], 'CRLF normalized like LF');
normEq('hello  \n  world', ['hello world'], 'joining does not create double spaces');
normEq(
  'Be gracious to me,\nbe gracious to me,',
  ['Be gracious to me, be gracious to me,'],
  'punctuation unchanged when joining',
);

const storedBefore = sandbox.state.alephTranslations.byChapterVerse['19:21'].text;
sandbox.contourDocxXml({ sideBySide: true });
assert.strictEqual(
  sandbox.state.alephTranslations.byChapterVerse['19:21'].text,
  storedBefore,
  'stored Aleph translation text is not mutated',
);

// Blank-line English becomes two DOCX paragraphs.
const blankLineText = 'First paragraph line.\n\nSecond paragraph line.';
sandbox.state.alephTranslations.byChapterVerse['19:21'].text = blankLineText;
sandbox.state.alephTranslations.translations['Job 19:21'].text = blankLineText;
const xmlParas = sandbox.contourDocxXml({ sideBySide: true });
const engCellParas = (xmlParas.match(/<w:tcW w:w="5150"[\s\S]*?<\/w:tc>/) || [''])[0];
assert.ok((engCellParas.match(/<w:p>/g) || []).length === 2, 'blank line yields two English paragraphs');
assert.ok(engCellParas.includes('First paragraph line.'), 'first English paragraph present');
assert.ok(engCellParas.includes('Second paragraph line.'), 'second English paragraph present');
assert.ok(xmlParas.includes('<w:tbl>'), 'side-by-side DOCX remains tabular');
assert.ok(xmlParas.includes('<w:cantSplit/>'), 'natural-height verse rows stay keep-together');

const plain = sandbox.contourDocxXml();
assert.ok(plain.includes('חָנֻּנִי'), 'plain DOCX Hebrew present');
assert.ok(!plain.includes('<w:tbl>'), 'plain DOCX is not tabular');
assert.ok(plain.includes('Job 19:21') || plain.includes('19:21'), 'plain DOCX still includes verse refs');
assert.ok(!plain.includes('First paragraph line.'), 'plain DOCX path does not use side-by-side English reflow');

// --- Print Layout publicationLayout ---
resetState();
sandbox.state.alephTranslations = {
  reference: 'Job 19:21-29',
  translations: {
    'Job 19:21': {
      text: 'Be gracious to me,\n    be gracious to me,\n    you my friends,',
    },
  },
  byChapterVerse: {
    '19:21': {
      text: 'Be gracious to me,\n    be gracious to me,\n    you my friends,',
    },
  },
  publication: { settings: {}, version: 1 },
};
const v21 = sandbox.state.verses[0];
const importedSnap = sandbox.getAlephTranslationForVerse(v21);
sandbox.seedPublicationLayoutsFromImport();
assert.ok(sandbox.hasPublicationLayoutForVerse(v21), 'seed creates publicationLayout');
assert.strictEqual(
  sandbox.getAlephTranslationForVerse(v21),
  importedSnap,
  'seed does not mutate imported translation text',
);
assert.strictEqual(
  sandbox.getPublicationLayoutForVerse(v21),
  'Be gracious to me, be gracious to me, you my friends,',
  'seed uses normalized prose as starting layout',
);
sandbox.setPublicationLayoutForVerse(
  v21,
  'Be gracious to me,\nbe gracious to me, you my friends,\nas the hand of God has struck me.',
);
assert.strictEqual(
  sandbox.getAlephTranslationForVerse(v21),
  importedSnap,
  'lineation edit does not mutate imported text',
);
const src = sandbox.getSideBySideEnglishForVerse(v21);
assert.strictEqual(src.source, 'publicationLayout');
assert.strictEqual(src.preserveLineBreaks, true);
const xmlLayout = sandbox.contourDocxXml({ sideBySide: true });
assert.ok(xmlLayout.includes('<w:br/>'), 'publicationLayout preserves line breaks as w:br');
assert.ok(
  xmlLayout.includes('Be gracious to me,') && xmlLayout.includes('be gracious to me, you my friends,'),
  'publication lineation content exported',
);
assert.ok(
  !xmlLayout.includes('Be gracious to me, be gracious to me, you my friends,'),
  'publicationLayout is not reflow-collapsed when present',
);

// Normalization pipeline (preview/export share these helpers).
assert.strictEqual(
  sandbox.normalizePublicationLayoutText('line one\r\nline two\u00a0'),
  'line one\nline two',
  'CRLF + NBSP normalized',
);
assert.strictEqual(
  sandbox.normalizePublicationLayoutText('a\u200B\nb'),
  'a\nb',
  'zero-width characters removed',
);
assert.strictEqual(
  sandbox.publicationLayoutPlainTextFromHtml('<div>line one</div><div>line two</div>'),
  'line one\nline two',
  'div blocks → newlines',
);
assert.strictEqual(
  sandbox.publicationLayoutPlainTextFromHtml('<p>line one</p><p>line two</p>'),
  'line one\nline two',
  'p blocks → newlines',
);
assert.strictEqual(
  sandbox.publicationLayoutPlainTextFromHtml('line one<br>line two'),
  'line one\nline two',
  'br → newline',
);
assert.strictEqual(
  sandbox.publicationLayoutPlainTextFromHtml('hello&nbsp;world'),
  'hello world',
  'nbsp entity → space',
);
assert.strictEqual(
  sandbox.publicationLayoutPlainTextFromHtml('<span style="font-weight:bold">rich</span> text'),
  'rich text',
  'rich-text markup stripped to plain text',
);

// Empty publicationLayout is intentional blank (not reseeded).
sandbox.setPublicationLayoutForVerse(v21, '');
assert.ok(sandbox.hasPublicationLayoutForVerse(v21), 'empty string still counts as present');
assert.strictEqual(sandbox.getPublicationLayoutForVerse(v21), '', 'empty layout retained');
const seededAgain = sandbox.seedPublicationLayoutsFromImport();
assert.strictEqual(seededAgain, 0, 'seed skips verses that already have publicationLayout');
assert.strictEqual(sandbox.getPublicationLayoutForVerse(v21), '', 'empty layout not overwritten by seed');
assert.strictEqual(
  sandbox.getSideBySideEnglishForVerse(v21).text,
  '',
  'empty publicationLayout exports blank English',
);

// Existing layout not overwritten on seed.
sandbox.setPublicationLayoutForVerse(v21, 'Be gracious to me,\nyou my friends,');
const beforeSeed = sandbox.getPublicationLayoutForVerse(v21);
sandbox.seedPublicationLayoutsFromImport();
assert.strictEqual(sandbox.getPublicationLayoutForVerse(v21), beforeSeed, 'existing layout preserved on entry seed');

// Preview/export identical normalized source.
const layoutPlain = 'Be gracious to me, be gracious to me,\nyou my friends,\nas the hand of God has struck me.';
sandbox.setPublicationLayoutForVerse(v21, layoutPlain);
const exportSrc = sandbox.getSideBySideEnglishForVerse(v21).text;
assert.strictEqual(exportSrc, sandbox.normalizePublicationLayoutText(layoutPlain), 'export uses normalized publication text');
const lines = sandbox.publicationEnglishLinesForDocx(exportSrc);
assert.strictEqual(lines.length, 1, 'one verse paragraph');
assert.strictEqual(lines[0].length, 3, 'three publication lines for Job 19:21 sample');
const xmlThree = sandbox.contourDocxXml({ sideBySide: true });
assert.ok((xmlThree.match(/<w:br\/>/g) || []).length >= 2, 'three lines → two w:br within verse');

// Persistence through project-style serialization.
const serialized = JSON.parse(JSON.stringify(sandbox.state.alephTranslations));
assert.strictEqual(
  serialized.translations['Job 19:21'].publicationLayout,
  exportSrc,
  'publicationLayout survives JSON serialize',
);
assert.strictEqual(
  serialized.translations['Job 19:21'].text,
  importedSnap,
  'imported text survives alongside publicationLayout',
);
sandbox.state.alephTranslations = serialized;
assert.strictEqual(
  sandbox.getPublicationLayoutForVerse(v21),
  exportSrc,
  'publicationLayout survives reload from serialized project',
);

const plainAfter = sandbox.contourDocxXml();
assert.ok(!plainAfter.includes('<w:tbl>'), 'plain Contour DOCX still non-tabular after print-layout work');

// Composer-backed side-by-side: natural-height verse-rows, publicationLayout → w:br
{
  sandbox.state.verses[0].clauses[0].spacingAfterPx = 400; // Contour canvas gap must not drive publication
  sandbox.setPublicationLayoutForVerse(
    sandbox.state.verses[0],
    'Be gracious to me,\nbe gracious to me,\nyou my friends,',
  );
  const composed = sandbox.composePublicationLayout({
    verses: sandbox.state.verses,
    getEnglishForVerse: (v) => sandbox.getSideBySideEnglishForVerse(v),
  });
  assert.ok(composed.rows.length === sandbox.state.verses.length, 'one verse-row per Contour verse');
  assert.strictEqual(composed.blocks[0].type, 'verse-row');
  assert.strictEqual(
    composed.rows[0].rowHeight,
    Math.max(composed.rows[0].measuredHebrewHeight, composed.rows[0].measuredEnglishHeight),
  );
  assert.ok(composed.rows[0].spacingAfter <= 20, 'Contour canvas spacingAfterPx ignored');
  assert.ok(composed.pairing && composed.pairing.ok, 'canonical pairing verified');
  const xmlComp = sandbox.contourDocxXml({ sideBySide: true });
  assert.ok(xmlComp.includes('<w:br/>'), 'publicationLayout \\n → DOCX w:br');
  assert.ok(xmlComp.includes('<w:tbl>'), 'composer DOCX is tabular');
  assert.ok(
    xmlComp.indexOf('Be gracious to me,') < xmlComp.indexOf('חָנֻּנִי'),
    'DOCX uses English | # | Hebrew order',
  );
  // Multi-page emission when composer pages > 1
  const manyVerses = [];
  for (let i = 0; i < 50; i++) {
    manyVerses.push({
      ref: 'Job 19:' + (i + 1),
      clauses: [
        { indent: 0, spacingAfterPx: 72, words: [{ text: 'א', format: {}, specials: [] }] },
        { indent: 0, spacingAfterPx: 72, words: [{ text: 'ב', format: {}, specials: [] }] },
      ],
    });
  }
  const prevVerses = sandbox.state.verses;
  sandbox.state.verses = manyVerses;
  const big = sandbox.composePublicationLayout({
    verses: manyVerses,
    getEnglishForVerse: () => ({ text: 'x', preserveLineBreaks: false }),
  });
  assert.ok(big.pages.length >= 2, 'natural-height rows paginate across pages');
  const xmlPages = sandbox.contourDocxXml({ sideBySide: true });
  if (big.pages.length >= 2) {
    assert.ok(xmlPages.includes('w:type="page"'), 'multi-page composer emits Word page breaks');
  }
  sandbox.state.verses = prevVerses;
}

console.log('OK: scholarly side-by-side DOCX layout checks passed.');
