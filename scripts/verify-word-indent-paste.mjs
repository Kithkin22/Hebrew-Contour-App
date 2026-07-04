#!/usr/bin/env node
/**
 * Word contour indentation import verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-word-indent-paste.mjs
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
    () => typeof parseWordHtmlLayoutLines === 'function' && typeof buildVersesFromLayoutPaste === 'function',
    { timeout: 25000 }
  );
}

// Simulated Word HTML: RTL Hebrew with margin-right indents (36pt ≈ 1 level, 72pt ≈ 2 levels)
const WORD_HTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<body dir=RTL lang=HE>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי</p>
<p dir=RTL style='margin-top:0in;margin-right:36.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי</p>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>לָמָּה תִּרְדְּפֻנִי כְמוֹ־אֵל</p>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-top:0in;margin-right:36.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>וְכִבְשָׂרִי דָבֵק בְּעַצְמֹתָי</p>
<p dir=RTL style='margin-top:0in;margin-right:72.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי</p>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-top:0in;margin-right:72.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>וַאֲנִי יָדַעְתִּי גֹּאֲלִי חַי</p>
<p dir=RTL style='margin-top:0in;margin-right:36.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>וְאַחֲרוֹן עַל־עָפָר יָקוּם</p>
</body></html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate((html) => {
      localStorage.setItem('hc-import-word-indent', 'yes');

      const parsed = parseWordHtmlLayoutLines(html, { isRtl: true });
      const layoutLines = parsed.lines;
      const verses = buildVersesFromLayoutPaste(parsed.text, 'Job 19:21-29', 'hebrew-bhsa', [], layoutLines);
      const indents = verses[0].clauses.map((c) => c.indent || 0);
      const spacing = verses[0].clauses.map((c) => c.spacingAfter || 'default');

      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      parseText(parsed.text, 'Job 19:21-29', false, {
        preserveLayout: true,
        layoutLines,
        skipRender: true,
      });
      render();

      const clauseEls = Array.from(document.querySelectorAll('#editor .clause'));
      const marginRights = clauseEls.map((el) => parseFloat(getComputedStyle(el).marginRight) || 0);

      const payload = projectPayload();
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      const reloadedIndents = state.verses[0].clauses.map((c) => c.indent || 0);

      const plainOnly = buildVersesFromLayoutPaste(parsed.text, 'Job 19:21-29', 'hebrew-bhsa', [], null);
      const plainIndents = plainOnly[0].clauses.map((c) => c.indent || 0);

      return {
        lineCount: layoutLines.length,
        indents,
        spacing,
        hasIndent: parsed.hasIndent,
        ambiguous: parsed.ambiguous,
        marginRights,
        reloadedIndents,
        plainIndents,
        exportHasIndent: buildContourEditorHtmlFromState(true).includes('margin-right:30px')
          || buildContourEditorHtmlFromState(true).includes('margin-right:72px'),
      };
    }, WORD_HTML);

    record('parse-lines', unit.lineCount === 7, `lines=${unit.lineCount}`);
    record('has-indent-flag', unit.hasIndent === true, `hasIndent=${unit.hasIndent}`);
    record('not-ambiguous', unit.ambiguous === false, `ambiguous=${unit.ambiguous}`);
    record('indent-levels', unit.indents[1] === 1 && unit.indents[4] === 2 && unit.indents[5] === 2, `indents=${unit.indents.join(',')}`);
    record('deep-indent', unit.indents[5] >= 2, `line6 indent=${unit.indents[5]}`);
    record('spacing-preserved', unit.spacing[2] === 'medium' && unit.spacing[4] === 'large', `spacing=${unit.spacing.join(',')}`);
    record('dom-margin-right', unit.marginRights.some((m) => m >= 36), `margins=${unit.marginRights.join(',')}`);
    record('reload-indents', unit.reloadedIndents.some((i) => i > 0), `reloaded=${unit.reloadedIndents.join(',')}`);
    record('plain-fallback', unit.plainIndents.every((i) => i === 0), `plain=${unit.plainIndents.join(',')}`);
    record('export-indent', unit.exportHasIndent, `exportHasIndent=${unit.exportHasIndent}`);

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
