#!/usr/bin/env node
/**
 * Job-style layout verification against Word chunked paste expectations.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-job-layout-match.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

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
    () => typeof buildVersesFromLayoutPaste === 'function',
    { timeout: 25000 }
  );
}

// Simulated Word HTML with contour indents (36pt / 72pt margin-right) and blank paragraphs
const JOB_WORD_HTML = `<html><body dir=RTL>
<p dir=RTL style='margin-right:0pt;text-align:right'>חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>לָמָּה תִּרְדְּפֻנִי כְמוֹ־אֵל</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְכִבְשָׂרִי דָבֵק בְּעַצְמֹתָי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וַיַּעֲנוּ אֶת־אֱיּוֹב וַיֹּאמְרוּ</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>מָה־יֹּסֶף מַעַלְלֵינוּ דָּבָר</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאֵי־מִזֶּה כֹחַ־לָנוּ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וַאֲנִי יָדַעְתִּי גֹּאֲלִי חַי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאַחֲרוֹן עַל־עָפָר יָקוּם</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאַחַר עוֹרִי נִקְּפוּ־זֹאת</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וּמִבְּשָׂרִי אֶחֱזֶה אֱלוֹהַּ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וַאֲשֶׁר אֲנִי אֶחֱזֶה־לּוֹ לִי</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וְעֵינַי רָאוּ וְלֹא־זָר</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>אִם־תֹּאמְרוּ נִשְׂגְּבָה עָלָיו</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>גֹּרֶם הַמְּיַסֵּר אוֹיֵב לוֹ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי־אַתֶּם תֹּאמְרוּ מַדּוּעַ</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>יִרְדֹּף אֱלוֹהַּ דְּרָכוֹ</p>
</body></html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(async (wordHtml) => {
      localStorage.setItem('hc-import-word-indent', 'yes');
      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      const layoutLines = parsed.lines;
      const paste = parsed.text;

      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      state.language = 'hebrew-bhsa';
      document.getElementById('refBox').value = 'Job 19:21-29 (BHS OT)';
      parseText(paste, 'Job 19:21-29 (BHS OT)', false, { preserveLayout: true, layoutLines });

      const v = state.verses[0];
      const clauses = v.clauses;
      const spacing = clauses.map((c) => c.spacingAfter || 'default');
      const indents = clauses.map((c) => c.indent || 0);
      const mediumCount = spacing.filter((s) => s === 'medium').length;
      const largeCount = spacing.filter((s) => s === 'large').length;
      const fakeEmpty = clauses.some((c) => !c.words.length);
      const indentCount = indents.filter((i) => i > 0).length;

      render();

      const clauseEls = Array.from(document.querySelectorAll('#editor .clause'));
      const margins = clauseEls.map((el) => {
        const mb = parseFloat(getComputedStyle(el).marginBottom) || 0;
        const cls = el.className;
        const mr = parseFloat(getComputedStyle(el).marginRight) || 0;
        return { mb, mr, cls };
      });

      // Manual visual break adjustment test
      if (clauses[2]) {
        clauses[2].spacingAfter = 'small';
        delete clauses[3].spacingAfter;
        clauses[3].spacingAfter = 'large';
      }
      render();
      const afterManual = {
        small: clauses[2].spacingAfter,
        large: clauses[3].spacingAfter,
      };

      const exportHtml = buildContourEditorHtmlFromState(true);
      const docx = contourDocxXml();

      // Reload test
      const payload = projectPayload();
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      render();
      const reloadedSpacing = state.verses[0].clauses.map((c) => c.spacingAfter || 'default');
      const reloadedIndents = state.verses[0].clauses.map((c) => c.indent || 0);

      const editorDir = document.getElementById('editor')?.querySelector('.clause')?.getAttribute('dir');
      const hasRtl = editorDir === 'rtl';

      return {
        clauseCount: clauses.length,
        spacing,
        indents,
        indentCount,
        mediumCount,
        largeCount,
        fakeEmpty,
        margins: margins.slice(0, 6),
        afterManual,
        exportHasMd: exportHtml.includes('layout-break-md'),
        exportHasLg: exportHtml.includes('layout-break-lg'),
        exportHasSm: exportHtml.includes('layout-break-sm'),
        exportHasIndent: exportHtml.includes('margin-right:36px') || exportHtml.includes('margin-right:72px'),
        docx480: docx.includes('w:spacing w:after="480"'),
        docx960: docx.includes('w:spacing w:after="960"'),
        docxIndent: docx.includes('w:ind w:right="720"') || docx.includes('w:ind w:right="1440"'),
        reloadedSpacing: reloadedSpacing.slice(0, 6),
        reloadedIndents: reloadedIndents.slice(0, 6),
        hasRtl,
        ref: state.ref,
        hasWordIndent: parsed.hasIndent,
      };
    }, JOB_WORD_HTML);

    record('clause-lines', unit.clauseCount >= 10, `clauses=${unit.clauseCount} (Word has ~18 lines)`);
    record('word-indent-detected', unit.hasWordIndent === true, `hasWordIndent=${unit.hasWordIndent}`);
    record('imported-indents', unit.indentCount >= 5, `indented=${unit.indentCount}, sample=${unit.indents.slice(0, 8).join(',')}`);
    record('medium-breaks', unit.mediumCount >= 3, `medium=${unit.mediumCount}`);
    record('large-breaks', unit.largeCount >= 1, `large=${unit.largeCount}`);
    record('no-fake-clauses', !unit.fakeEmpty, `fakeEmpty=${unit.fakeEmpty}`);
    record('rtl', unit.hasRtl, `dir=${unit.hasRtl ? 'rtl' : 'missing'}`);
    record('indent-preserved-reload', unit.reloadedIndents.some((i) => i > 0), `indents=${unit.reloadedIndents.join(',')}`);
    record('spacing-preserved-reload', unit.reloadedSpacing.includes('medium') || unit.reloadedSpacing.includes('large'), `spacing=${unit.reloadedSpacing.join(',')}`);
    record('manual-visual-break', unit.afterManual.small === 'small' && unit.afterManual.large === 'large', `manual=${JSON.stringify(unit.afterManual)}`);
    record('export-html-breaks', unit.exportHasMd && unit.exportHasLg, `md=${unit.exportHasMd}, lg=${unit.exportHasLg}`);
    record('export-html-indent', unit.exportHasIndent, `exportHasIndent=${unit.exportHasIndent}`);
    record('export-docx-breaks', unit.docx480 && unit.docx960, `480=${unit.docx480}, 960=${unit.docx960}`);
    record('export-docx-indent', unit.docxIndent, `docxIndent=${unit.docxIndent}`);

    const mdMargin = unit.margins.find((m) => m.cls.includes('layout-break-md'));
    record('editor-md-margin', mdMargin && mdMargin.mb >= 24, `medium margin-bottom=${mdMargin?.mb}px`);
    const indentedMargin = unit.margins.find((m) => m.mr >= 36);
    record('editor-indent-margin', !!indentedMargin, `margin-right=${indentedMargin?.mr}px`);

    // Screenshot of editor state
    await page.evaluate((wordHtml) => {
      localStorage.setItem('hc-import-word-indent', 'yes');
      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText(parsed.text, 'Job 19:21-29 (BHS OT)', false, { preserveLayout: true, layoutLines: parsed.lines });
      if (state.verses[0].hideRef !== true) state.verses[0].hideRef = true;
      render();
    }, JOB_WORD_HTML);

    await page.locator('#editor').scrollIntoViewIfNeeded();
    const shotPath = 'docs/assets/job-layout-verification.png';
    fs.mkdirSync('docs/assets', { recursive: true });
    await page.screenshot({ path: shotPath, fullPage: false });

    console.log(`\nScreenshot: ${shotPath}`);
    console.log(`Sample margins: ${JSON.stringify(unit.margins)}`);
    console.log(`Spacing map: ${unit.spacing.join(', ')}`);
    console.log(`Indent map: ${unit.indents.join(', ')}`);

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
