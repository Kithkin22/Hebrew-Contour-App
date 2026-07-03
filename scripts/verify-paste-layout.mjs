#!/usr/bin/env node
/**
 * Paste-with-layout verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-paste-layout.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof buildVersesFromLayoutPaste === 'function' && typeof parseText === 'function',
    { timeout: 25000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(() => {
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      state.language = 'hebrew';

      const paste = 'בְּרֵאשִׁית בָּרָא\nוְהָאָרֶץ הָיְתָה\n\nוַיֹּאמֶר אֱלֹהִים\n\n\nוַיַּרְא אֱלֹהִים';
      document.getElementById('refBox').value = 'Job 19:21-29';
      parseText(paste, 'Job 19:21-29', false, { preserveLayout: true, skipRender: true });

      const v = state.verses[0];
      const spacing = v.clauses.map((c) => c.spacingAfter || 'default');
      const wordCount = v.clauses.reduce((n, c) => n + c.words.length, 0);
      const fakeBlankClause = v.clauses.some((c) => !c.words.length);

      render();
      const domMedium = !!document.querySelector('#editor .layout-break-md');
      const domLarge = !!document.querySelector('#editor .layout-break-lg');

      const payload = projectPayload();
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      render();
      const afterReload = state.verses[0].clauses.map((c) => c.spacingAfter || 'default');

      const exportHtml = buildContourEditorHtmlFromState(true);
      const docx = contourDocxXml();

      stateBundle.parallelEnabled = true;
      stateBundle.panes[1] = freshPaneState();
      stateBundle.panes[1].language = 'hebrew';
      bindActivePane(0);
      state.verses[0].clauses[0].spacingAfter = 'medium';
      bindActivePane(1);
      parseText('שָׁמַיִם', 'Gen 1:1', false, { preserveLayout: true, skipRender: true });
      stateBundle.panes[1].verses[0].clauses[0].spacingAfter = 'large';

      return {
        clauseCount: v.clauses.length,
        spacing,
        wordCount,
        fakeBlankClause,
        domMedium,
        domLarge,
        afterReload,
        exportHtml,
        docxHas480: docx.includes('w:spacing w:after="480"'),
        pane0: stateBundle.panes[0].verses[0].clauses[0].spacingAfter || 'default',
        pane1: stateBundle.panes[1].verses[0].clauses[0].spacingAfter || 'default',
      };
    });

    record('multi-clause', unit.clauseCount === 4, `clauses=${unit.clauseCount}`);
    record('spacing-map', unit.spacing[0] === 'default' && unit.spacing[1] === 'medium' && unit.spacing[2] === 'large', `spacing=${unit.spacing.join(',')}`);
    record('no-fake-clauses', !unit.fakeBlankClause, `fakeBlankClause=${unit.fakeBlankClause}`);
    record('words-intact', unit.wordCount > 0, `words=${unit.wordCount}`);
    record('dom-breaks', unit.domMedium && unit.domLarge, `medium=${unit.domMedium}, large=${unit.domLarge}`);
    record('save-reload', unit.afterReload[1] === 'medium' && unit.afterReload[2] === 'large', `reloaded=${unit.afterReload.join(',')}`);
    record('export-html', unit.exportHtml.includes('layout-break-md') && unit.exportHtml.includes('layout-break-lg'), 'export HTML has break classes');
    record('export-docx', unit.docxHas480, 'DOCX has medium spacing twips');
    record('parallel-independent', unit.pane0 === 'medium' && unit.pane1 === 'large', `pane0=${unit.pane0}, pane1=${unit.pane1}`);

    const pass = results.every((r) => r.pass);
    console.log(`\n${pass ? 'ALL PASSED' : 'SOME FAILED'} (${results.filter((r) => r.pass).length}/${results.length})`);
    process.exit(pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
