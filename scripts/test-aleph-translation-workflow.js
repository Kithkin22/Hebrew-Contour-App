#!/usr/bin/env node
/** Minimal workflow test: Aleph JSON import + side-by-side DOCX XML. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
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
  contourIndentDocxTwipsForClause: () => 0,
  spacingAfterDocxTwips: () => 0,
  verseSpacingAfterDocxTwips: () => 0,
  markUndo: () => {},
  syncStateBundle: () => {},
  autoSaveProject: () => {},
  updateSaveStatus: () => {},
  autosaveReady: false,
  isParallelActive: () => false,
};

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
    extractFunction(fileMenu, 'xmlEscape'),
    extractFunction(fileMenu, 'canonicalAlephVerseKey'),
    extractFunction(fileMenu, 'chapterVerseSuffix'),
    extractFunction(fileMenu, 'alephEntryText'),
    extractFunction(fileMenu, 'validateAlephTranslationJson'),
    extractFunction(fileMenu, 'alephPassageMatchError'),
    extractFunction(fileMenu, 'normalizeAlephTranslationsMap'),
    extractFunction(fileMenu, 'getAlephTranslationForVerse'),
    extractFunction(fileMenu, 'applyAlephTranslationImport'),
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
sandbox.applyAlephTranslationImport(good);
const xml = sandbox.contourDocxXml({ sideBySide: true });
assert.ok(xml.includes('<w:tbl>'), 'side-by-side uses a table');
assert.ok(xml.includes('Pity me, pity me, you my friends'), 'translation appears in DOCX XML');
assert.ok(xml.includes('חָנֻּנִי'), 'Hebrew text preserved');
assert.ok(xml.includes('<w:b/><w:bCs/>'), 'Hebrew formatting preserved');
assert.ok(xml.includes('0B61A4'), 'annotation color preserved');

const plain = sandbox.contourDocxXml();
assert.ok(plain.includes('חָנֻּנִי'), 'plain DOCX Hebrew present');
assert.ok(!plain.includes('<w:tbl>'), 'plain DOCX is not tabular');

console.log('OK: Aleph import + side-by-side DOCX workflow checks passed.');
