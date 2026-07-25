#!/usr/bin/env node
/**
 * Generate a Job 19:21–29 scholarly side-by-side DOCX fixture for manual Word inspection.
 * Uses composePublicationLayout (same model as Print Preview).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs/assets/aleph-side-by-side');
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
  contourPassageTitleForExport: () => 'Job 19:21–29',
};
sandbox.window = sandbox;

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
    extractFunction(fileMenu, 'getAlephTranslationEntryForVerse'),
    extractFunction(fileMenu, 'getAlephTranslationForVerse'),
    extractFunction(fileMenu, 'ensureAlephPublicationBag'),
    extractFunction(fileMenu, 'hasPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'getPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'getSideBySideEnglishForVerse'),
    extractFunction(fileMenu, 'setPublicationLayoutForVerse'),
    extractFunction(fileMenu, 'seedPublicationLayoutsFromImport'),
    extractFunction(fileMenu, 'normalizeEnglishForSideBySideDocx'),
    extractFunction(fileMenu, 'normalizePublicationLayoutText'),
    extractFunction(fileMenu, 'publicationLayoutPlainTextFromHtml'),
    extractFunction(fileMenu, 'publicationEnglishLinesForDocx'),
    extractFunction(fileMenu, 'contourDocxXml'),
  ].join('\n'),
  sandbox,
  { filename: 'helpers.js' },
);

function clause(words, indent, spacingAfterPx) {
  const c = {
    indent: indent || 0,
    words: words.map((t) => ({ text: t, format: {}, specials: [] })),
  };
  if (spacingAfterPx != null) c.spacingAfterPx = spacingAfterPx;
  return c;
}

sandbox.state = {
  ref: 'Job 19:21-29',
  language: 'hebrew',
  verses: [
    {
      ref: 'Job 19:21',
      spacingAfter: 'oneHalf',
      clauses: [
        clause(['חָנֻּנִי', 'חָנֻּנִי', 'אַתֶּם', 'רֵעָי'], 0, 0),
        clause(['כִּי', 'יַד־אֱלוֹהַּ', 'נָגְעָה', 'בִּי'], 1, 18),
      ],
    },
    { ref: 'Job 19:22', clauses: [clause(['לָמָּה', 'תִרְדְּפֻנִי', 'כְמוֹ־אֵל'], 0), clause(['וּמִבְּשָׂרִי', 'לֹא', 'תִשְׂבָּעוּ'], 1, 40)] },
    { ref: 'Job 19:23', clauses: [clause(['מִי־יִתֵּן', 'אֵפוֹ', 'וְיִכָּתְבוּן', 'מִלָּי'], 0), clause(['מִי־יִתֵּן', 'בַּסֵּפֶר', 'וְיֻחָקוּ'], 1)] },
    { ref: 'Job 19:24', clauses: [clause(['בְּעֵט־בַּרְזֶל', 'וְעֹפָרֶת'], 0), clause(['לָעַד', 'בַּצּוּר', 'יֵחָצְבוּן'], 1)] },
    {
      ref: 'Job 19:25',
      spacingAfter: 'double',
      clauses: [clause(['וַאֲנִי', 'יָדַעְתִּי', 'גֹּאֲלִי', 'חָי'], 0), clause(['וְאַחֲרוֹן', 'עַל־עָפָר', 'יָקוּם'], 1, 72)],
    },
    { ref: 'Job 19:26', clauses: [clause(['וְאַחַר', 'עוֹרִי', 'נִקְּפוּ־זֹאת'], 0), clause(['וּמִבְּשָׂרִי', 'אֶחֱזֶה', 'אֱלוֹהַּ'], 1)] },
    { ref: 'Job 19:27', clauses: [clause(['אֲשֶׁר', 'אֲנִי', 'אֶחֱזֶה־לִּי'], 0), clause(['וְעֵינַי', 'רָאוּ', 'וְלֹא־זָר'], 1), clause(['כָּלוּ', 'כִלְיֹתַי', 'בְּחֵקִי'], 0)] },
    { ref: 'Job 19:28', clauses: [clause(['כִּי', 'תֹאמְרוּ', 'מַה־נִּרְדָּף־לוֹ'], 0), clause(['וְשֹׁרֶשׁ', 'דָּבָר', 'נִמְצָא־בִי'], 1)] },
    { ref: 'Job 19:29', clauses: [clause(['גּוּרוּ', 'לָכֶם', 'מִפְּנֵי־חֶרֶב'], 0), clause(['כִּי־חֵמָה', 'עֲוֺנוֹת', 'חָרֶב'], 1), clause(['לְמַעַן', 'תֵּדְעוּן', 'שַׁדִּין'], 0)] },
  ],
  comments: [],
  arcs: [],
  inclusios: [],
  legend: [],
  alephTranslations: {
    reference: 'Job 19:21-29',
    publication: { settings: {}, version: 1 },
    translations: {},
    byChapterVerse: {
      '19:21': { text: 'Be gracious to me,\n    be gracious to me,\n    you my friends,\n    as the hand of God\n    has struck me.' },
      '19:22': { text: 'Why do you pursue me\n    like God\n    and are you not satisfied\n    with my flesh?' },
      '19:23': { text: 'O that my words were written!\n    O that they were inscribed in a book!' },
      '19:24': { text: 'O that with an iron pen and with lead\n    they were engraved in the rock forever!' },
      '19:25': { text: 'For I know that my Redeemer lives,\n    and that at the last he will stand upon the earth;' },
      '19:26': { text: 'and after my skin has been thus destroyed,\n    then in my flesh I shall see God,' },
      '19:27': { text: 'whom I shall see on my side,\n    and my eyes shall behold, and not another.\n    My heart faints within me!' },
      '19:28': { text: 'If you say, ‘How we will pursue him!’\n    and, ‘The root of the matter is found in him,’' },
      '19:29': { text: 'be afraid of the sword,\n    for wrath brings the punishment of the sword,\n    so that you may know there is a judgment.' },
    },
  },
};

// Mirror translations map + intentional publication lineation for key verses.
Object.keys(sandbox.state.alephTranslations.byChapterVerse).forEach((cv) => {
  const text = sandbox.state.alephTranslations.byChapterVerse[cv].text;
  const ref = 'Job ' + cv;
  sandbox.state.alephTranslations.translations[ref] = { text };
});
sandbox.seedPublicationLayoutsFromImport();
// Scholarly lineation for Redeemer climax (preserves \\n as w:br).
sandbox.setPublicationLayoutForVerse(sandbox.state.verses[4], 'For I know that my Redeemer lives,\nand that at the last he will stand upon the earth;');
sandbox.setPublicationLayoutForVerse(
  sandbox.state.verses[0],
  'Be gracious to me,\nbe gracious to me,\nyou my friends,\nas the hand of God has struck me.',
);

const composed = sandbox.composePublicationLayout({
  verses: sandbox.state.verses,
  getEnglishForVerse: (v) => sandbox.getSideBySideEnglishForVerse(v),
});
const documentXml = sandbox.contourDocxXml({ sideBySide: true });

function u16(n) {
  return Buffer.from([n & 255, (n >>> 8) & 255]);
}
function u32(n) {
  return Buffer.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}
const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.from(f.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ]);
    parts.push(local, data);
    central.push({ name, crc, size: data.length, offset });
    offset += local.length + data.length;
  }
  const cdBuf = Buffer.concat(
    central.map((f) =>
      Buffer.concat([
        Buffer.from([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        u32(f.crc),
        u32(f.size),
        u32(f.size),
        u16(f.name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(f.offset),
        f.name,
      ]),
    ),
  );
  const end = Buffer.concat([
    Buffer.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0]),
    u16(files.length),
    u16(files.length),
    u32(cdBuf.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...parts, cdBuf, end]);
}

const files = [
  {
    name: '[Content_Types].xml',
    data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  },
  {
    name: '_rels/.rels',
    data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  },
  { name: 'word/document.xml', data: documentXml },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const outDocx = path.join(OUT_DIR, 'Job-19-21-29-side-by-side.docx');
const outXml = path.join(OUT_DIR, 'Job-19-21-29-side-by-side.document.xml');
fs.writeFileSync(outDocx, zipStore(files));
fs.writeFileSync(outXml, documentXml);

const checks = {
  nilBorders: /w:val="nil"/.test(documentXml),
  noSingleBorders: !/w:tblBorders[\s\S]*w:val="single"/.test(documentXml),
  noTblStyle: !documentXml.includes('<w:tblStyle'),
  fixedLayout: documentXml.includes('<w:tblLayout w:type="fixed"/>'),
  noHeaders: !documentXml.includes('>Hebrew<') && !documentXml.includes('>Translation<'),
  threeWidths:
    documentXml.includes('w:tblW w:w="5000" w:type="pct"') &&
    documentXml.includes('w:w="5000"') &&
    documentXml.includes('w:w="650"') &&
    documentXml.includes('w:w="5150"') &&
    documentXml.includes(
      '<w:tblGrid><w:gridCol w:w="5150"/><w:gridCol w:w="650"/><w:gridCol w:w="5000"/></w:tblGrid>',
    ),
  engTypography:
    documentXml.includes('w:sz w:val="26"') &&
    documentXml.includes('w:line="240"') &&
    documentXml.includes('<w:br/>') &&
    documentXml.includes('For I know that my Redeemer lives,') &&
    documentXml.includes('<w:cantSplit/>') &&
    !documentXml.includes('w:line="288"'),
  hebrewFlushRight:
    documentXml.includes('<w:bidi/><w:jc w:val="right"/>') &&
    /w:tcW w:w="5000"[\s\S]*?w:right w:w="0"/.test(documentXml),
  engBeforeHeb:
    documentXml.indexOf('חָנֻּנִי') > -1 &&
    documentXml.indexOf('Be gracious to me,') < documentXml.indexOf('חָנֻּנִי'),
  composerRows: composed.rows.length === 9,
  naturalHeight:
    composed.rows[0].rowHeight ===
    Math.max(composed.rows[0].measuredHebrewHeight, composed.rows[0].measuredEnglishHeight),
  noContourGapBleed: composed.rows.every((r) => (r.spacingAfter || 0) <= 20),
  verseAnchors: composed.rows.map((s) => s.verseNumber).join(',') === '21,22,23,24,25,26,27,28,29',
  verseRowType: composed.rows.every((b) => b.type === 'verse-row'),
  pairingOk: !!(composed.pairing && composed.pairing.ok),
};

const failed = Object.keys(checks).filter((k) => !checks[k]);
console.log('Wrote', outDocx);
console.log('Wrote', outXml);
console.log('Composer pages:', composed.pages.length, 'segments:', composed.segments.length);
if (failed.length) {
  console.error('Fixture checks failed:', failed.join(', '));
  process.exit(1);
}
console.log('OK: Job 19 side-by-side fixture regenerated from publication composer.');
