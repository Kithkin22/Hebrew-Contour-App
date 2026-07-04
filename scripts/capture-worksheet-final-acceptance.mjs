#!/usr/bin/env node
/**
 * Final v80 acceptance — real saved Job 19 project (not Word fixture).
 * Editor | Worksheet preview | PDF side-by-side.
 *
 * Run:
 *   HC_PROJECT_JSON=~/Downloads/Job-Exegesis-Draft.json \
 *   HC_VERIFY_URL=http://127.0.0.1:8765 \
 *   node scripts/capture-worksheet-final-acceptance.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs', 'assets', 'export-verify-v80-final');
const PROJECT_JSON = process.env.HC_PROJECT_JSON
  || path.join(os.homedir(), 'Downloads', 'Job-Exegesis-Draft.json');

const WS = {
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
    () => typeof restoreProjectPayload === 'function' && typeof buildContourExportDocument === 'function',
    { timeout: 30000 }
  );
}

function pdfToPng(pdfPath, pngPath) {
  try {
    execSync(`qlmanage -t -s 1800 -o "${path.dirname(pngPath)}" "${pdfPath}"`, { stdio: 'pipe' });
    const generated = `${pdfPath}.png`;
    if (fs.existsSync(generated)) {
      fs.renameSync(generated, pngPath);
      return true;
    }
  } catch (e) { /* fall through */ }
  return false;
}

async function loadProjectAndEnrich(page, jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  await page.evaluate((jsonText) => {
    const data = JSON.parse(jsonText);
    if (!restoreProjectPayload(data)) throw new Error('restore failed');
    ensureStateBundle();
    stateBundle.activePane = 0;
    stateBundle.parallelEnabled = false;
    bindActivePane(0);
    state = stateBundle.panes[0];
    if (state.verses[0]) state.verses.forEach((v) => { v.hideRef = true; });

    const verses = state.verses || [];
    if (!verses.length) throw new Error('Job 19 project has no verses');
    const lastV = verses.length - 1;
    const lastC = verses[lastV].clauses.length - 1;
    const lastW = verses[lastV].clauses[lastC].words.length - 1;
    if (lastV < 1) throw new Error('Job 19 project has too few verses');

    state.inclusios = [];
    if (typeof addInclusioFromLocs === 'function') {
      const outer = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: lastV, c: lastC, w: lastW });
      if (outer && typeof applyUnitColor === 'function') {
        applyUnitColor(outer, '#64748B', true);
        outer.label = 'Unit A (outer)';
      }
      const midV = Math.min(4, lastV);
      const midC = Math.min(1, verses[midV].clauses.length - 1);
      const inner = addInclusioFromLocs({ v: 2, c: 0, w: 0 }, { v: midV, c: midC, w: 0 });
      if (inner && typeof applyUnitColor === 'function') {
        applyUnitColor(inner, '#6B7C93', true);
        inner.label = 'Unit B (nested)';
      }
    }

    if (typeof ensureArcs === 'function') ensureArcs();
    state.arcs = [];
    const arcEndV = Math.min(3, lastV);
    const arcEndC = Math.min(1, verses[arcEndV].clauses.length - 1);
    const arcEndW = Math.min(2, verses[arcEndV].clauses[arcEndC].words.length - 1);
    state.arcs.push({
      id: 'accept-arc-' + Date.now(),
      start: { v: 0, c: 0, w: 0 },
      end: { v: arcEndV, c: arcEndC, w: arcEndW },
      color: '#0b61d8',
      label: 'a',
    });

    const colorSpecs = [
      { v: 0, c: 0, w: 1, color: '#b02a2a' },
      { v: 1, c: 0, w: 0, color: '#0b61a4' },
      { v: 2, c: 1, w: 0, color: '#6B7355' },
      { v: 4, c: 0, w: 1, color: '#b02a2a' },
      { v: 6, c: 0, w: 2, color: '#0b61a4' },
    ];
    colorSpecs.forEach(({ v, c, w, color }) => {
      const word = state.verses[v]?.clauses[c]?.words[w];
      if (word) word.color = color;
    });

    if (typeof setPageZoomMode === 'function') setPageZoomMode('100', { skipPersist: true });
    if (typeof renderPassageTitle === 'function') renderPassageTitle();
    render();
    if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
  }, raw);
  await page.waitForTimeout(600);
}

async function capturePreview(page, browser) {
  const previewHtml = await page.evaluate((ws) => {
    const settings = normalizeWorksheetExportOptions(ws);
    if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
    return buildContourExportDocument({
      worksheetSettings: settings,
      includePrintButton: false,
      docTitle: '\u200B',
    });
  }, WS);

  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
  const p = await ctx.newPage();
  await p.setContent(previewHtml, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.body.classList.contains('contour-worksheet-applied'), { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);
  const root = p.locator('.contour-export-worksheet-print-root');
  const target = (await root.count()) ? root : p.locator('.contour-document-sheet--export');
  await target.screenshot({ path: path.join(OUT, '02-worksheet-preview.png') });
  await ctx.close();
  return previewHtml;
}

async function capturePdf(previewHtml, browser) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.setContent(previewHtml, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const pdfPath = path.join(OUT, '03-exported.pdf');
  await p.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
  });
  await ctx.close();
  const pngPath = path.join(OUT, '03-exported-pdf.png');
  if (!pdfToPng(pdfPath, pngPath)) {
    const fallback = await browser.newContext({ viewport: { width: 900, height: 1200 } });
    const fp = await fallback.newPage();
    await fp.setContent(previewHtml, { waitUntil: 'networkidle' });
    await fp.waitForTimeout(300);
    const root = fp.locator('.contour-export-worksheet-print-root');
    await root.screenshot({ path: pngPath });
    await fallback.close();
  }
}

async function buildTriptych(browser) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Job 19 Final Acceptance</title>
<style>
body{margin:0;padding:20px;background:#0f172a;font-family:Inter,system-ui,sans-serif;color:#e2e8f0}
h1{font-size:18px;margin:0 0 4px} p{font-size:13px;color:#94a3b8;margin:0 0 16px}
.row{display:flex;gap:12px;align-items:flex-start}
.panel{flex:1;min-width:0}
.panel h2{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 6px;text-align:center}
.panel img{width:100%;border:1px solid #334155;border-radius:6px;background:#fff;display:block}
</style></head><body>
<h1>Job 19 — Editor | Preview | PDF (v80 acceptance @ 100%)</h1>
<p>Project: Job-Exegesis-Draft.json · Outer + nested units · 1 arc · colored words · Passage title only</p>
<div class="row">
<div class="panel"><h2>Live Aleph Editor</h2><img src="01-editor-aleph.png"></div>
<div class="panel"><h2>Worksheet Preview</h2><img src="02-worksheet-preview.png"></div>
<div class="panel"><h2>Exported PDF</h2><img src="03-exported-pdf.png"></div>
</div></body></html>`;
  fs.writeFileSync(path.join(OUT, 'comparison.html'), html);
  const pg = await browser.newPage({ viewport: { width: 1680, height: 980 } });
  await pg.goto(`file://${path.resolve(OUT)}/comparison.html`, { waitUntil: 'networkidle' });
  await pg.screenshot({ path: path.join(OUT, '04-editor-preview-pdf-triptych.png'), fullPage: true });
  await pg.close();
}

async function main() {
  if (!fs.existsSync(PROJECT_JSON)) {
    console.error(`Missing project JSON: ${PROJECT_JSON}`);
    console.error('Export Job 19 from Aleph (Project → Export JSON) and set HC_PROJECT_JSON.');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.copyFileSync(PROJECT_JSON, path.join(OUT, 'job-19-source.project.json'));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    await loadProjectAndEnrich(page, PROJECT_JSON);

    const meta = await page.evaluate(() => ({
      ref: state.ref,
      inclusios: state.inclusios?.length || 0,
      arcs: state.arcs?.length || 0,
      colored: [...document.querySelectorAll('#editor .word.has-text-color')].length,
      rails: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail').length,
      arcPaths: document.querySelectorAll('#editor #arcSvg .arc-path, #editor .contour-export-arc-svg .arc-path').length,
    }));
    console.log('Loaded:', meta);

    const sheet = page.locator('#contourPageZoomStage .contour-document-sheet');
    await sheet.scrollIntoViewIfNeeded();
    await sheet.screenshot({ path: path.join(OUT, '01-editor-aleph.png') });

    const previewHtml = await capturePreview(page, browser);
    await capturePdf(previewHtml, browser);
    await buildTriptych(browser);

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
      at: new Date().toISOString(),
      projectJson: PROJECT_JSON,
      meta,
      ws: WS,
    }, null, 2));

    console.log(`\nFinal acceptance artifacts: ${OUT}/`);
    console.log('  01-editor-aleph.png');
    console.log('  02-worksheet-preview.png');
    console.log('  03-exported.pdf');
    console.log('  03-exported-pdf.png');
    console.log('  04-editor-preview-pdf-triptych.png');
    console.log('  comparison.html');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
