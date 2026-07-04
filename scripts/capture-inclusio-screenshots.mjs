#!/usr/bin/env node
/**
 * Capture live unit-frame verification screenshots.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/capture-inclusio-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const LOCAL = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs/assets/inclusio-mockups/verification');
const JOB_LINES = [
  'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י',
  'כִּ֤י יַ֣ד אֱל֙וֹהַּ נָ֣גְעָ֔ה בִּ֔י',
  'וּֽמִצְפִּ֥י וְאֵ֖לֶף אֲשֶׁר־בְּעַ֣ד תְּרִיעֽוּנִי׃',
  'לָ֤מָּה אַתֶּ֨ם רֹדְפִ֥ים כְּאֵ֗ל',
  'וּמִבְּשָׂרִ֥י לֹֽא־תִשְׂבָּֽעוּ׃',
  'מִֽי־יִתֵּ֣ן וְאֵיכָ֣כָה וְגוֹ׃',
  'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י',
].join('\n');

fs.mkdirSync(OUT, { recursive: true });

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof addInclusioFromLocs === 'function' && typeof applyPageZoom === 'function',
    { timeout: 30000 }
  );
}

async function loadJobText(page) {
  await page.evaluate((text) => {
    ensureStateBundle();
    stateBundle.parallelEnabled = false;
    state = stateBundle.panes[0];
    state.language = 'hebrew';
    parseText(text, 'Job 19:21–27 (BHS OT)', false, { preserveLayout: true, skipRender: true });
    if (state.verses[0]) state.verses[0].hideRef = true;
    state.inclusios = [];
    state.activeInclusioId = null;
    clearInclusioWordMarkers();
    render();
    if (typeof finalizeDocumentPagePresentation === 'function') finalizeDocumentPagePresentation();
    if (typeof refreshPageZoomStageLayout === 'function') refreshPageZoomStageLayout();
  }, JOB_LINES);
}

async function clickUnitTab(page) {
  await page.click('.annotation-tab-btn[data-panel="ann-inclusio"]');
  await page.waitForTimeout(200);
}

async function setDark(page, on) {
  await page.evaluate((dark) => {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('contourTheme', dark ? 'dark' : 'light');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = dark ? '☀ Light Mode' : '☾ Dark Mode';
  }, on);
}

async function setZoom(page, mode) {
  await page.evaluate((m) => {
    applyPageZoom({ mode: m, skipPersist: true });
    if (typeof renderInclusioFrameOverlays === 'function') renderInclusioFrameOverlays();
    if (typeof refreshPageZoomStageLayout === 'function') refreshPageZoomStageLayout();
  }, mode);
  await page.waitForTimeout(350);
}

async function shot(page, name, clipSelector) {
  const file = path.join(OUT, name);
  if (clipSelector) {
    const el = page.locator(clipSelector).first();
    await el.waitFor({ state: 'visible', timeout: 10000 });
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  console.log('saved', file);
  return file;
}

async function setupSingleUnit(page) {
  await page.evaluate(() => {
    state.inclusios = [];
    clearInclusioWordMarkers();
    const lastC = state.verses[0].clauses.length - 1;
    const item = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
    if (item) {
      item.label = 'Unit A';
      item.color = '#64748B';
    }
    state.selected = null;
    render();
    renderInclusioFrameOverlays();
  });
  await page.waitForTimeout(300);
}

async function setupNestedUnits(page) {
  await page.evaluate(() => {
    state.inclusios = [];
    clearInclusioWordMarkers();
    const lastC = state.verses[0].clauses.length - 1;
    const outer = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
    if (outer) {
      outer.label = 'Unit A';
      outer.frameWeight = 'thick';
    }
    const inner = addInclusioFromLocs({ v: 0, c: 2, w: 0 }, { v: 0, c: Math.min(4, lastC), w: 0 });
    if (inner) {
      inner.label = "Unit A'";
      inner.frameWeight = 'thin';
    }
    state.selected = null;
    render();
    renderInclusioFrameOverlays();
  });
  await page.waitForTimeout(300);
}

async function expandLegendUnits(page) {
  await page.evaluate(() => {
    const section = document.getElementById('legendInclusiosSection');
    if (section) section.classList.remove('collapsed');
    const w = document.getElementById('legendBelowEditor');
    if (w) w.classList.remove('collapsed');
    if (typeof renderInclusioRegistry === 'function') renderInclusioRegistry();
    if (typeof syncLegendBelowEditor === 'function') syncLegendBelowEditor();
  });
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto(LOCAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    await loadJobText(page);
    await clickUnitTab(page);
    await setZoom(page, '100');

    await setDark(page, false);
    await setupSingleUnit(page);
    await shot(page, 'light-01-single-unit.png', '#editorWrap');
    // legacy alias
    await shot(page, 'light-01-single-inclusio.png', '#editorWrap');

    await setupNestedUnits(page);
    await shot(page, 'light-02-nested-units.png', '#editorWrap');
    await shot(page, 'light-02-nested-inclusios.png', '#editorWrap');

    await setDark(page, true);
    await setupNestedUnits(page);
    await shot(page, 'dark-02-nested-units.png', '#editorWrap');
    await shot(page, 'dark-02-nested-inclusios.png', '#editorWrap');

    await setDark(page, false);
    await setupNestedUnits(page);
    await setZoom(page, '85');
    await shot(page, 'light-02-nested-units-85.png', '#editorWrap');

    await setZoom(page, '100');
    await setupNestedUnits(page);
    await expandLegendUnits(page);
    await page.evaluate(() => {
      if (state.inclusios[1]) state.activeInclusioId = state.inclusios[1].id;
      if (typeof renderInclusioUI === 'function') renderInclusioUI();
    });
    await shot(page, 'light-03-legend-units.png', '#legendBelowEditor');
    await shot(page, 'light-03-legend-registry.png', '#legendBelowEditor');

    await page.evaluate(() => {
      if (state.inclusios[1]) {
        state.inclusios[1].color = '#6B7355';
        state.activeInclusioId = state.inclusios[1].id;
      }
      syncInclusioWordMarkers();
      render();
      renderInclusioFrameOverlays();
      if (typeof renderInclusioUI === 'function') renderInclusioUI();
    });
    await page.waitForTimeout(300);
    await shot(page, 'light-04-color-change-olive.png', '#editorWrap');

    for (const z of ['fit', '100', '85']) {
      await setZoom(page, z);
      await setupSingleUnit(page);
      await shot(page, `light-zoom-${z}-single-unit.png`, '#editorWrap');
    }

    await setZoom(page, '100');
    await setupSingleUnit(page);
    await shot(page, 'light-anchor-align.png', '#editorWrap');

    const exportShot = await page.evaluate(() => {
      const meta = { title: 'Job-19-contour.pdf', oldTitle: document.title };
      const script = buildContourPrintScript(meta);
      const html = buildContourExportDocument({
        includePrintButton: true,
        docTitle: meta.title,
        printScript: script,
      });
      return { html };
    });
    const exportHtmlPath = path.join(OUT, 'export-preview.html');
    fs.writeFileSync(exportHtmlPath, exportShot.html);
    const exportPage = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
    await exportPage.goto(`file://${path.resolve(exportHtmlPath)}`, { waitUntil: 'networkidle' });
    await exportPage.waitForTimeout(400);
    await exportPage.screenshot({ path: path.join(OUT, 'export-pdf-preview.png'), fullPage: true });
    console.log('saved', path.join(OUT, 'export-pdf-preview.png'));
    await exportPage.close();

    const mockupSrc = path.join('docs/assets/inclusio-mockups', 'approved-bracket-geometry-mockup.png');
    const mockupDest = path.join(OUT, 'approved-bracket-geometry-reference.png');
    if (fs.existsSync(mockupSrc)) fs.copyFileSync(mockupSrc, mockupDest);

    const mockHtmlPath = path.join(OUT, 'comparison-mockup-vs-impl.html');
    const mockHtmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Inter,system-ui,sans-serif;margin:24px;background:#f1f5f9}
    .row{display:flex;gap:16px;flex-wrap:wrap} .card{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;max-width:48%}
    img{max-width:100%;height:auto} ul{font-size:13px;line-height:1.5}
    </style></head><body><h1>Approved mockup vs implementation (v64)</h1>
    <div class="row"><div class="card"><h2>Approved bracket mockup</h2><img src="approved-bracket-geometry-reference.png"></div>
    <div class="card"><h2>Nested units (local)</h2><img src="light-02-nested-units.png"></div></div>
    <ul><li>More unit padding (36px) — frames hug literary units, not glyphs</li>
    <li>Distinct nested brackets with 40px rail gap</li>
    <li>Unit terminology in Legend / Key; no page labels</li>
    <li>Per-unit colors (slate outer, muted blue inner; olive after change)</li></ul></body></html>`;
    fs.writeFileSync(mockHtmlPath, mockHtmlContent);
    const mockPage = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
    await mockPage.goto(`file://${path.resolve(mockHtmlPath)}`);
    await mockPage.screenshot({ path: path.join(OUT, 'comparison-mockup-vs-impl.png'), fullPage: true });
    await mockPage.close();

    console.log(`\nScreenshots saved to ${OUT}/`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
