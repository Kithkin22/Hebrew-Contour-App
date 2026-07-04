#!/usr/bin/env node
/**
 * Four-stage print divergence diagnostic (Job 19).
 * Stages: Editor | Wizard preview HTML | Export HTML | Print-emulated PDF
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs', 'assets', 'export-verify-v81-four-stage');
const PROJECT_JSON = process.env.HC_PROJECT_JSON
  || path.join(os.homedir(), 'Downloads', 'Job-Exegesis-Draft.json');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const gate = page.locator('#passwordGate:not(.hidden>');
  if (await page.locator('#passwordGate:not(.hidden)').count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(() => typeof restoreProjectPayload === 'function', { timeout: 30000 });

  const raw = fs.readFileSync(PROJECT_JSON, 'utf8');
  await page.evaluate((jsonText) => {
    restoreProjectPayload(JSON.parse(jsonText));
    ensureStateBundle();
    stateBundle.activePane = 0;
    stateBundle.parallelEnabled = false;
    bindActivePane(0);
    state = stateBundle.panes[0];
    state.verses.forEach((v) => { v.hideRef = true; });
    if (typeof setPageZoomMode === 'function') setPageZoomMode('100', { skipPersist: true });
    render();
    if (typeof refreshLiveEditorOverlaysForExport === 'function') refreshLiveEditorOverlaysForExport();
  }, raw);
  await page.waitForTimeout(500);

  await page.locator('#contourPageZoomStage .contour-document-sheet').screenshot({ path: path.join(OUT, '1-editor-contour.png') });

  const exports = await page.evaluate(async () => {
    const ws = normalizeWorksheetExportOptions({ scaleMode: '100', margins: 'normal' });
    const domHtml = buildContourExportDocument({ worksheetSettings: ws, includePrintButton: false, docTitle: '\u200B' });
    let screenshotHtml = null;
    if (typeof captureWorksheetContourScreenshot === 'function') {
      const cap = await captureWorksheetContourScreenshot(ws);
      screenshotHtml = buildScreenshotWorksheetDocument(cap, ws);
    }
    const ed = document.querySelector('#editor .clause');
    const cs = ed ? getComputedStyle(ed) : null;
    return {
      domHtml,
      screenshotHtml,
      editorRtl: cs ? { dir: cs.direction, align: cs.textAlign } : null,
    };
  });

  fs.writeFileSync(path.join(OUT, '3-dom-export.html'), exports.domHtml || '');
  fs.writeFileSync(path.join(OUT, '3-screenshot-export.html'), exports.screenshotHtml || '');

  for (const [name, html] of [['3-dom-export', exports.domHtml], ['3-screenshot-export', exports.screenshotHtml]]) {
    if (!html) continue;
    const p = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `${name}-screen.png`), fullPage: true });
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: path.join(OUT, `${name}-print.pdf`), printBackground: true, preferCSSPageSize: true });
    await p.close();
  }

  const report = {
    at: new Date().toISOString(),
    finding: 'DOM export at 100% placed 816px sheet inside padded print root — Safari auto-scales (~50%). Screenshot export avoids re-render.',
    editorRtl: exports.editorRtl,
    stages: ['1-editor-contour.png', '3-dom-export-screen.png', '3-screenshot-export-screen.png', '3-screenshot-export-print.pdf'],
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
