#!/usr/bin/env node
/**
 * Job 19 Contour vs composer vs DOCX structural verification.
 * Complements manual Contour Editor ↔ Print Preview ↔ Word visual check.
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
assert.ok(xml.includes('w:sz w:val="26"'), 'scholarly 13pt runs');
assert.ok(xml.includes('<w:cantSplit/>'), 'Heb/Num/Eng keep-together');
assert.ok(
  xml.includes('<w:tblGrid><w:gridCol w:w="5150"/><w:gridCol w:w="650"/><w:gridCol w:w="5000"/></w:tblGrid>'),
  'English | verse | Hebrew column grid',
);
assert.ok(xml.indexOf('Be gracious to me,') < xml.indexOf('חָנֻּנִי'), 'English precedes Hebrew');

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

console.log('OK: Job 19 Contour↔composer↔DOCX structural verification');
console.log('  Pages/page-breaks:', (xml.match(/w:type="page"/g) || []).length + 1);
console.log('  Fixture:', FIXTURE_XML);
