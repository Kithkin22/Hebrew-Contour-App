#!/usr/bin/env node
/**
 * Worksheet PDF export layout verification — editor vs preview HTML vs scale modes.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-worksheet-export-layout.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs', 'assets', 'export-verify-v80');
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
    () => typeof buildContourExportDocument === 'function' && typeof cloneLiveEditorForExport === 'function',
    { timeout: 25000 }
  );
}

async function loadJob19(page) {
  const stored = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('hc-project-'));
    for (const k of keys) {
      try {
        const rec = JSON.parse(localStorage.getItem(k));
        if (rec && rec.name && /job\s*19/i.test(rec.name)) return k;
      } catch (e) { /* skip */ }
    }
    return null;
  });
  if (stored) {
    await page.evaluate((k) => {
      if (typeof openProjectFromStorageKey === 'function') openProjectFromStorageKey(k);
    }, stored);
    await page.waitForTimeout(800);
    return true;
  }
  await page.evaluate(() => {
    ensureStateBundle();
    stateBundle.parallelEnabled = false;
    state = stateBundle.panes[0];
    state.language = 'hebrew-bhsa';
    document.getElementById('refBox').value = 'Job 19:21-29 (BHS OT)';
    const text = `חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי
כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי
לָמָּה תִּרְדְּפֻנִי כְמוֹ־אֵל
וְכִבְשָׂרִי דָבֵק בְּעַצְמוֹתָי
וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי
וַיַּעֲנוּ אֶת־אֱיּוֹב וַיֹּאמְרוּ
מָה־יֹּסֶף מַעַלְלֵינוּ דָּבָר
וְאֵי־מִזֶּה כֹחַ־לָנוּ
וַאֲנִי יָדַעְתִּי גֹּאֲלִי חַי
וְאַחֲרוֹן עַל־עָפָר יָקוּם`;
    parseText(text, 'Job 19:21-29 (BHS OT)', false);
    if (typeof render === 'function') render();
  });
  await page.waitForTimeout(600);
  return true;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    const hasJob = await loadJob19(page);
    record('job19-loaded', hasJob, hasJob ? 'Job 19 project opened' : 'No Job 19 in localStorage — using current project');

    await page.screenshot({ path: path.join(OUT, '01-editor-contour.png'), fullPage: false });

    const editorMetrics = await page.evaluate(() => {
      const ed = document.getElementById('editor');
      const sheet = document.querySelector('#contourPageZoomStage .contour-document-sheet');
      const clause = ed && ed.querySelector('.clause');
      const cs = clause ? getComputedStyle(clause) : null;
      return {
        hasLangHebrew: !!(ed && ed.classList.contains('lang-hebrew')),
        clauseDir: cs ? cs.direction : null,
        clauseTextAlign: cs ? cs.textAlign : null,
        clauseMarginRight: cs ? cs.marginRight : null,
        sheetScrollH: sheet ? sheet.scrollHeight : 0,
        contentMetrics: typeof getLiveEditorSheetMetrics === 'function' ? getLiveEditorSheetMetrics() : null,
      };
    });
    record('editor-rtl', editorMetrics.hasLangHebrew && editorMetrics.clauseDir === 'rtl',
      `lang-hebrew=${editorMetrics.hasLangHebrew} dir=${editorMetrics.clauseDir} align=${editorMetrics.clauseTextAlign}`);
    record('content-metrics', !!(editorMetrics.contentMetrics && editorMetrics.contentMetrics.contentH < 1056),
      `contentH=${editorMetrics.contentMetrics?.contentH} sheetH=${editorMetrics.contentMetrics?.sheetH}`);

    const scaleModes = [
      { scaleMode: '100', label: '100' },
      { scaleMode: 'fit', label: 'fit' },
      { scaleMode: '80', label: '80' },
      { scaleMode: 'custom', scalePercent: 85, label: 'custom-85' },
    ];

    for (const mode of scaleModes) {
      const exportCheck = await page.evaluate((settings) => {
        if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
        const ws = normalizeWorksheetExportOptions({
          scaleMode: settings.scaleMode,
          scalePercent: settings.scalePercent || 100,
          includePassageTitle: true,
          includeDate: false,
          includeProjectName: false,
          includeExportTimestamp: false,
        });
        const layout = computeWorksheetLayoutForExport(ws);
        const html = buildContourExportDocument({
          worksheetSettings: ws,
          worksheetLayout: layout,
          includePrintButton: false,
          docTitle: '\u200B',
        });
        const clone = cloneLiveEditorForExport(ws);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const stage = doc.querySelector('.contour-export-worksheet-stage');
        const sheet = doc.querySelector('.contour-document-sheet--export');
        const ed = doc.querySelector('.contour-page-body');
        const title = doc.querySelector('.contour-passage-title');
        const meta = doc.querySelectorAll('.contour-worksheet-meta');
        const style = doc.querySelector('style')?.textContent || '';
        return {
          hasClone: !!clone,
          hasStage: !!stage,
          hasSheet: !!sheet,
          langHebrew: ed && ed.classList.contains('lang-hebrew'),
          titlePresent: !!title,
          metaCount: meta.length,
          scale: layout.scale,
          scaleMode: layout.scaleMode,
          hasTransform: /transform:scale/.test(style),
          hasPrintRoot: !!doc.querySelector('.contour-export-worksheet-print-root'),
          noMinHeight1056: !/min-height:var\(--contour-letter-min-height\)/.test(style) || /min-height:0/.test(style),
        };
      }, mode);

      record(`export-${mode.label}-structure`, exportCheck.hasClone && exportCheck.hasStage && exportCheck.hasSheet,
        `clone=${exportCheck.hasClone} stage=${exportCheck.hasStage} scale=${exportCheck.scale}`);
      record(`export-${mode.label}-rtl`, exportCheck.langHebrew,
        `lang-hebrew=${exportCheck.langHebrew}`);
      record(`export-${mode.label}-no-meta`, exportCheck.metaCount === 0 && exportCheck.titlePresent,
        `meta=${exportCheck.metaCount} title=${exportCheck.titlePresent}`);
    }

    const previewHtml = await page.evaluate(() => {
      const ws = normalizeWorksheetExportOptions({ scaleMode: '100' });
      return buildContourExportDocument({ worksheetSettings: ws, includePrintButton: false, docTitle: '\u200B' });
    });
    if (previewHtml) {
      fs.writeFileSync(path.join(OUT, '02-worksheet-preview-100.html'), previewHtml);
    } else {
      record('preview-html', false, 'buildContourExportDocument returned null');
    }

    const previewPage = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    await previewPage.setContent(previewHtml, { waitUntil: 'networkidle' });
    await previewPage.waitForTimeout(200);
    await previewPage.screenshot({ path: path.join(OUT, '03-worksheet-preview-100.png'), fullPage: true });
    await previewPage.close();

    const metadataCases = [
      { name: 'title-only', includePassageTitle: true },
      { name: 'no-metadata', includePassageTitle: false, includeDate: false, includeProjectName: false },
    ];
    for (const mc of metadataCases) {
      const h = await page.evaluate((opts) => {
        const ws = normalizeWorksheetExportOptions(opts);
        return buildContourExportDocument({ worksheetSettings: ws, includePrintButton: false, docTitle: '\u200B' });
      }, mc);
      fs.writeFileSync(path.join(OUT, `04-meta-${mc.name}.html`), h);
    }

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, editorMetrics, at: new Date().toISOString() }, null, 2));
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      console.error('Failures:', failed.map((f) => f.id).join(', '));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
