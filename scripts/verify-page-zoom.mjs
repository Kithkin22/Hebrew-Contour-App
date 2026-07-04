#!/usr/bin/env node
/**
 * Page zoom / print preview verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-page-zoom.mjs
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
    () => typeof applyPageZoom === 'function' && typeof buildContourEditorHtmlFromState === 'function',
    { timeout: 25000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(() => {
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      localStorage.setItem('hc-import-word-indent', 'yes');

      const wordHtml = `<html><body dir=RTL>
<p dir=RTL style='margin-right:0pt;text-align:right'>חָנֵּנִי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי יַד־אֱלוֹהַּ</p>
</body></html>`;
      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      parseText(parsed.text, 'Job 19:21-29 (BHS OT)', false, {
        preserveLayout: true,
        layoutLines: parsed.lines,
      });
      if (state.verses[0]) state.verses[0].hideRef = true;
      render();

      setPageZoomMode('85', { skipPersist: true });
      const stage = document.getElementById('contourPageZoomStage');
      const scale85 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));
      const titleVisible = !!(document.getElementById('contourPassageTitle') && !document.getElementById('contourPassageTitle').hidden);
      const titleTop = document.getElementById('contourPassageTitle')?.getBoundingClientRect().top || 0;
      const wrapTop = document.getElementById('editorWrap')?.getBoundingClientRect().top || 0;

      setPageZoomMode('100', { skipPersist: true });
      const scale100 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));

      const exportHtml = buildContourEditorHtmlFromState(true);
      const exportHasZoom = exportHtml.includes('contour-page-zoom') || exportHtml.includes('contourPageZoomStage');

      setPageZoomMode('75', { skipPersist: true });
      const captured = captureProjectViewPrefs();

      return {
        hasStage: !!stage,
        scale85,
        scale100,
        titleVisible,
        titleNearTop: titleVisible && titleTop >= wrapTop && titleTop - wrapTop < 200,
        exportHasZoom,
        capturedZoom: captured.pageZoom,
      };
    });

    record('zoom-stage', unit.hasStage, `hasStage=${unit.hasStage}`);
    record('zoom-85', Math.abs(unit.scale85 - 0.85) < 0.02, `scale85=${unit.scale85}`);
    record('zoom-100', Math.abs(unit.scale100 - 1) < 0.02, `scale100=${unit.scale100}`);
    record('title-visible', unit.titleVisible && unit.titleNearTop, `titleVisible=${unit.titleVisible} nearTop=${unit.titleNearTop}`);
    record('export-no-zoom', !unit.exportHasZoom, `exportHasZoom=${unit.exportHasZoom}`);
    record('prefs-capture', unit.capturedZoom === '75', `captured=${unit.capturedZoom}`);

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
