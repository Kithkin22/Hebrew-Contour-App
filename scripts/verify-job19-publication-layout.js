#!/usr/bin/env node
/**
 * Job 19 Contour vs composer vs DOCX structural verification.
 * Complements manual Contour Editor ↔ Print Preview ↔ Word visual check (no merge/deploy).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIXTURE_XML = path.join(ROOT, 'docs/assets/aleph-side-by-side/Job-19-21-29-side-by-side.document.xml');

const gen = spawnSync(process.execPath, [path.join(__dirname, 'generate-job19-side-by-side-fixture.js')], {
  cwd: ROOT,
  encoding: 'utf8',
});
assert.strictEqual(gen.status, 0, 'fixture generator succeeds: ' + (gen.stderr || gen.stdout));

const xml = fs.readFileSync(FIXTURE_XML, 'utf8');

assert.ok(xml.includes('<w:tbl>'), 'side-by-side is tabular');
assert.ok(!xml.includes('>Hebrew<'), 'no Hebrew header');
assert.ok(xml.includes('<w:br/>'), 'publicationLayout newlines → w:br');
assert.ok(xml.includes('w:type="page"'), 'multi-page Contour+English emits Word page break');

const anchors = ['21', '22', '23', '24', '25', '26', '27', '28', '29'];
anchors.forEach((n) => {
  assert.ok(xml.includes('>' + n + '</w:t>'), 'verse anchor ' + n + ' present');
});

assert.ok(xml.includes('חָנֻּנִי'), 'Hebrew Job 19:21 present');
assert.ok(xml.includes('Be gracious to me,'), 'English 21 present');
assert.ok(xml.includes('For I know that my Redeemer lives,'), 'English 25 present');
assert.ok(xml.includes('and after my skin'), 'English 26 present');
assert.ok(xml.includes('whom I shall see on my side,'), 'English 27 present');
assert.ok(xml.includes('be afraid of the sword,'), 'English 29 present');

// Contour spacing minima mapped into Hebrew paragraph after (px→twips ×15)
assert.ok(
  xml.includes('w:after="270"') || xml.includes('w:after="600"') || xml.includes('w:after="1080"'),
  'Contour clause/verse spacing appears in Hebrew DOCX',
);

console.log('OK: Job 19 Contour↔composer↔DOCX structural verification');
console.log('  Manual visual still recommended: Contour Editor gaps vs Print Preview vs Word.');
console.log('  Fixture:', FIXTURE_XML);
