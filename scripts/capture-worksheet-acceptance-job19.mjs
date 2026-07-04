#!/usr/bin/env node
/**
 * Visual acceptance: Job 19 editor (Aleph contour pane) vs Worksheet PDF export.
 * Real comparison — not unit tests. Produces side-by-side screenshots + PDF.
 *
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/capture-worksheet-acceptance-job19.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs', 'assets', 'export-verify-v80-acceptance');

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

const WS_DEFAULTS = {
  scaleMode: '100',
  paper: 'letter',
  margins: 'normal',
  includeUnitFrames: true,
  includeArcs: true,
  includeTextColors: true,
  includePassageTitle: true,
  includeDate: false,
  includeProjectName: false,
  includeExportTimestamp: false,
  includeLegend: false,
  includeComments: false,
  includeNotes: false,
};

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof buildContourExportDocument === 'function' && typeof cloneLiveEditorForExport === 'function',
    { timeout: 25000 }
  );
}

async function loadJob19(page) {
  await page.evaluate((wordHtml) => {
    localStorage.setItem('hc-import-word-indent', 'yes');
    const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
    ensureStateBundle();
    stateBundle.parallelEnabled = false;
    state = stateBundle.panes[0];
    generatedRefs = [];
    state.language = 'hebrew-bhsa';
    state.ref = 'Job 19:21–29 (BHS OT)';
    document.getElementById('refBox').value = 'Job 19:21-29 (BHS OT)';
    parseText(parsed.text, 'Job 19:21-29 (BHS OT)', false, { preserveLayout: true, layoutLines: parsed.lines });
    if (state.verses[0]) state.verses[0].hideRef = true;
    if (typeof setPageZoomMode === 'function') setPageZoomMode('100', { skipPersist: true });
    if (typeof renderPassageTitle === 'function') renderPassageTitle();
    render();
    if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
  }, JOB_WORD_HTML);
  await page.waitForTimeout(500);
}

async function captureExport(browser, page, scaleMode, scalePercent, outName) {
  const html = await page.evaluate(({ scaleMode, scalePercent, defaults }) => {
    const ws = normalizeWorksheetExportOptions({
      ...defaults,
      scaleMode,
      scalePercent: scalePercent || 100,
    });
    if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
    return buildContourExportDocument({
      worksheetSettings: ws,
      includePrintButton: false,
      docTitle: '\u200B',
    });
  }, { scaleMode, scalePercent, defaults: WS_DEFAULTS });

  const ctx = await browser.newContext();
  const exportPage = await ctx.newPage();
  await exportPage.setContent(html, { waitUntil: 'networkidle' });
  await exportPage.waitForFunction(() => document.body.classList.contains('contour-worksheet-applied'), { timeout: 8000 }).catch(() => {});
  await exportPage.waitForTimeout(300);

  const root = exportPage.locator('.contour-export-worksheet-print-root');
  const target = (await root.count()) ? root : exportPage.locator('.contour-document-sheet--export');
  await target.screenshot({ path: path.join(OUT, outName) });

  if (scaleMode === '100') {
    await exportPage.pdf({
      path: path.join(OUT, 'worksheet-job19-100.pdf'),
      printBackground: true,
      preferCSSPageSize: true,
    });
  }

  const metrics = await exportPage.evaluate(() => {
    const ed = document.querySelector('.contour-page-body');
    const clauses = ed ? [...ed.querySelectorAll('.clause')] : [];
    return clauses.slice(0, 12).map((el) => {
      const cs = getComputedStyle(el);
      return {
        dir: cs.direction,
        align: cs.textAlign,
        marginRight: cs.marginRight,
        text: (el.textContent || '').slice(0, 24),
      };
    });
  });

  await exportPage.close();
  await ctx.close();
  return metrics;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    await loadJob19(page);

    const editorMetrics = await page.evaluate(() => {
      const ed = document.getElementById('editor');
      const clauses = ed ? [...ed.querySelectorAll('.clause')] : [];
      return clauses.slice(0, 12).map((el) => {
        const cs = getComputedStyle(el);
        return {
          dir: cs.direction,
          align: cs.textAlign,
          marginRight: cs.marginRight,
          text: (el.textContent || '').slice(0, 24),
        };
      });
    });

    const sheet = page.locator('#contourPageZoomStage .contour-document-sheet');
    await sheet.scrollIntoViewIfNeeded();
    await sheet.screenshot({ path: path.join(OUT, '01-editor-aleph-contour.png') });

    const export100 = await captureExport(browser, page, '100', 100, '02-export-100-printview.png');
    await captureExport(browser, page, 'fit', null, '03-export-fit-printview.png');
    await captureExport(browser, page, '80', null, '04-export-80-printview.png');

    const compareRows = editorMetrics.map((ed, i) => {
      const ex = export100[i] || {};
      const mrMatch = ed.marginRight === ex.marginRight;
      const dirMatch = ed.dir === ex.dir;
      return { i, edMr: ed.marginRight, exMr: ex.marginRight, mrMatch, dirMatch, text: ed.text };
    });

    const sideBySideHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Job 19 Acceptance — Editor vs Export 100%</title>
<style>
body{font-family:Inter,system-ui,sans-serif;margin:24px;background:#0f172a;color:#e2e8f0}
h1{font-size:20px;font-weight:600;margin:0 0 8px}
p{font-size:14px;color:#94a3b8;margin:0 0 20px;max-width:900px;line-height:1.5}
.row{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.panel{flex:1;min-width:320px}
.panel h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:0 0 8px}
.panel img{max-width:100%;border:1px solid #334155;border-radius:8px;background:#fff}
table{border-collapse:collapse;font-size:12px;margin-top:24px}
th,td{border:1px solid #334155;padding:6px 10px;text-align:left}
th{background:#1e293b}
.pass{color:#4ade80}.fail{color:#f87171}
</style></head><body>
<h1>Job 19 — Visual acceptance (Editor vs Worksheet PDF @ 100%)</h1>
<p>Left: live Aleph contour pane. Right: worksheet export print view (what becomes the PDF). Turn off browser Headers &amp; footers when printing.</p>
<div class="row">
  <div class="panel"><h2>Editor (Aleph)</h2><img src="01-editor-aleph-contour.png" alt="Editor"></div>
  <div class="panel"><h2>Export 100%</h2><img src="02-export-100-printview.png" alt="Export"></div>
</div>
<h2 style="font-size:13px;margin-top:28px;color:#64748b">Clause alignment spot-check (first 12 lines)</h2>
<table><tr><th>#</th><th>Text</th><th>Editor margin-right</th><th>Export margin-right</th><th>RTL</th></tr>
${compareRows.map((r) => `<tr>
  <td>${r.i + 1}</td><td>${r.text}</td>
  <td>${r.edMr}</td><td>${r.exMr}</td>
  <td class="${r.mrMatch && r.dirMatch ? 'pass' : 'fail'}">${r.mrMatch && r.dirMatch ? 'match' : 'MISMATCH'}</td>
</tr>`).join('')}
</table>
<p style="margin-top:20px">Also: <a href="worksheet-job19-100.pdf" style="color:#38bdf8">worksheet-job19-100.pdf</a> · Fit: <img style="max-width:400px;vertical-align:top" src="03-export-fit-printview.png"> · 80%: <img style="max-width:400px;vertical-align:top" src="04-export-80-printview.png"></p>
</body></html>`;
    fs.writeFileSync(path.join(OUT, 'comparison.html'), sideBySideHtml);

    const comparePage = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
    await comparePage.goto(`file://${path.resolve(OUT)}/comparison.html`, { waitUntil: 'networkidle' });
    await comparePage.screenshot({ path: path.join(OUT, '05-side-by-side-comparison.png'), fullPage: true });
    await comparePage.close();

    const mismatches = compareRows.filter((r) => !r.mrMatch || !r.dirMatch);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
      at: new Date().toISOString(),
      editorMetrics,
      export100,
      compareRows,
      mismatchCount: mismatches.length,
      acceptancePass: mismatches.length === 0,
    }, null, 2));

    console.log(`\nArtifacts: ${OUT}/`);
    console.log(`  01-editor-aleph-contour.png`);
    console.log(`  02-export-100-printview.png`);
    console.log(`  worksheet-job19-100.pdf`);
    console.log(`  05-side-by-side-comparison.png`);
    console.log(`  comparison.html`);
    if (mismatches.length) {
      console.error(`\nVISUAL ACCEPTANCE: ${mismatches.length} clause alignment mismatches`);
      mismatches.forEach((m) => console.error(`  [${m.i}] ed=${m.edMr} ex=${m.exMr}`));
      process.exitCode = 1;
    } else {
      console.log('\nVISUAL ACCEPTANCE: clause indents + RTL match between editor and export');
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
