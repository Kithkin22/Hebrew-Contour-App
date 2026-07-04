#!/usr/bin/env node
/**
 * Capture live inclusio + zoom verification screenshots.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/capture-inclusio-screenshots.mjs
 * Optional: HC_PROD_URL=https://hebrew-contour-app.vercel.app for production comparison
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const LOCAL = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PROD = process.env.HC_PROD_URL || 'https://hebrew-contour-app.vercel.app';
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

async function clickInclusioTab(page) {
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

async function setupSingleInclusio(page) {
  await page.evaluate(() => {
    state.inclusios = [];
    clearInclusioWordMarkers();
    const lastC = state.verses[0].clauses.length - 1;
    addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
    state.inclusios[0].color = '#64748B';
    state.inclusios[0].label = 'A';
    state.selected = null;
    render();
    renderInclusioFrameOverlays();
  });
  await page.waitForTimeout(300);
}

async function setupNestedInclusios(page) {
  await page.evaluate(() => {
    state.inclusios = [];
    clearInclusioWordMarkers();
    const lastC = state.verses[0].clauses.length - 1;
    const outer = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
    if (outer) {
      outer.color = '#5B6B7C';
      outer.label = 'A';
      outer.frameWeight = 'thick';
    }
    const inner = addInclusioFromLocs({ v: 0, c: 2, w: 0 }, { v: 0, c: Math.min(4, lastC), w: 0 });
    if (inner) {
      inner.color = '#7C8DA0';
      inner.label = "A'";
      inner.frameWeight = 'thin';
    }
    render();
    renderInclusioFrameOverlays();
    state.selected = null;
    render();
  });
  await page.waitForTimeout(300);
}

async function captureSet(page, prefix) {
  await clickInclusioTab(page);
  await setZoom(page, '100');

  await setupSingleInclusio(page);
  await shot(page, `${prefix}-01-single-inclusio.png`, '#editorWrap');

  await setupNestedInclusios(page);
  await shot(page, `${prefix}-02-nested-inclusios.png`, '#editorWrap');

  await page.evaluate(() => {
    if (state.inclusios[1]) state.activeInclusioId = state.inclusios[1].id;
    if (typeof renderInclusioUI === 'function') renderInclusioUI();
    if (typeof applyInclusioRegistryHighlight === 'function') applyInclusioRegistryHighlight();
  });
  const legend = page.locator('#legendBelowEditor');
  if (await legend.count()) {
    await page.evaluate(() => {
      const w = document.getElementById('legendBelowEditor');
      if (w) w.classList.remove('collapsed');
      if (typeof syncLegendBelowEditor === 'function') syncLegendBelowEditor();
    });
    await shot(page, `${prefix}-03-legend-registry.png`, '#legendBelowEditor');
  }

  await page.evaluate(() => {
    state.inclusios = [];
    clearInclusioWordMarkers();
    render();
  });
  await page.click('#drawInclusioMode');
  const start = page.locator('.word[data-v="0"][data-c="0"][data-w="0"]');
  const mid = page.locator('.word[data-v="0"][data-c="3"][data-w="0"]');
  const end = page.locator('.word[data-v="0"][data-c="6"][data-w="0"]');
  const startBox = await start.boundingBox();
  const midBox = await mid.boundingBox();
  const endBox = await end.boundingBox();
  if (startBox && midBox) {
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(midBox.x + midBox.width / 2, midBox.y + midBox.height / 2, { steps: 8 });
    await page.waitForTimeout(150);
    await shot(page, `${prefix}-04-draw-preview.png`, '#editorWrap');
    if (endBox) {
      await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      await shot(page, `${prefix}-05-draw-complete.png`, '#editorWrap');
    }
  }
  await page.evaluate(() => {
    if (typeof toggleDrawInclusioMode === 'function') toggleDrawInclusioMode(false);
  });

  await setupNestedInclusios(page);
  for (const z of ['fit', '100', '85']) {
    await setZoom(page, z);
    await shot(page, `${prefix}-zoom-${z}.png`, '#editorWrap');
  }
}

async function captureProdSingle(page, file) {
  await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await unlock(page);
  await loadJobText(page);
  await clickInclusioTab(page);
  await page.evaluate(() => {
    const lastC = state.verses[0].clauses.length - 1;
    addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
    render();
    if (typeof renderInclusioFrameOverlays === 'function') renderInclusioFrameOverlays();
  });
  await setZoom(page, '100');
  await shot(page, file, '#editorWrap');
}

async function buildComparison(localFile, prodFile, mockupFile, outFile) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Inter,system-ui,sans-serif;margin:24px;background:#f1f5f9;color:#0f172a}
    h2{margin:0 0 8px;font-size:16px} .row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px}
    .card{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;max-width:48%}
    img{max-width:100%;height:auto;border:1px solid #e2e8f0}
    ul{font-size:13px;line-height:1.5}
  </style></head><body>
  <h1>Inclusio implementation comparison</h1>
  <div class="row">
    <div class="card"><h2>Production (previous word-rail)</h2><img src="${path.basename(prodFile)}" alt="production"></div>
    <div class="card"><h2>Local (unit-frame v2)</h2><img src="${path.basename(localFile)}" alt="local"></div>
  </div>
  <ul>
    <li>Unit bounds from clause lines, not per-word boxes</li>
    <li>Margin rails offset 28px+ outward; no overlap with Hebrew</li>
    <li>Top/bottom caps only — midline prongs removed</li>
    <li>No persistent blue word selection boxes in editor</li>
  </ul>
  <div class="row">
    <div class="card"><h2>Approved mockup</h2><img src="${path.basename(mockupFile)}" alt="mockup"></div>
    <div class="card"><h2>Implementation</h2><img src="${path.basename(localFile)}" alt="impl"></div>
  </div>
  <ul>
    <li><strong>Matches:</strong> margin-only frames, nested outward offset, muted palette, document-first Hebrew</li>
    <li><strong>Differs:</strong> caps are short line segments (not full corner glyphs) for SVG simplicity</li>
    <li><strong>Why:</strong> segments scale cleanly at all zoom levels and export identically to screen</li>
  </ul>
  </body></html>`;
  const htmlPath = path.join(OUT, outFile.replace('.png', '.html'));
  fs.writeFileSync(htmlPath, html);
  return htmlPath;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto(LOCAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    await loadJobText(page);

    await setDark(page, false);
    await captureSet(page, 'light');

    await setDark(page, true);
    await captureSet(page, 'dark');

    const localSingle = path.join(OUT, 'light-01-single-inclusio.png');
    const prodFile = 'prod-single-inclusio.png';
    const prodPage = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      await captureProdSingle(prodPage, prodFile);
    } catch (e) {
      console.warn('Production capture skipped:', e.message);
    } finally {
      await prodPage.close();
    }

    const mockupSrc = path.join('docs/assets/inclusio-mockups', 'inclusio-mockup-5-scholarly-notation.png');
    const mockupDest = path.join(OUT, 'approved-mockup-reference.png');
    if (fs.existsSync(mockupSrc)) fs.copyFileSync(mockupSrc, mockupDest);

    const compareHtml = await buildComparison(
      'light-01-single-inclusio.png',
      prodFile,
      'approved-mockup-reference.png',
      'comparison-prod-vs-new.png'
    );
    const comparePage = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
    await comparePage.goto(`file://${path.resolve(compareHtml)}`);
    await comparePage.screenshot({ path: path.join(OUT, 'comparison-prod-vs-new.png'), fullPage: true });
    await comparePage.close();

    const mockHtml = await buildComparison(
      'light-02-nested-inclusios.png',
      'light-02-nested-inclusios.png',
      'approved-mockup-reference.png',
      'comparison-mockup-vs-impl.png'
    );
    const mockPage = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
    await mockPage.goto(`file://${path.resolve(mockHtml.replace('comparison-prod-vs-new', 'comparison-mockup-vs-impl'))}`);
    // fix path - buildComparison always same name pattern
    const mockHtmlPath = path.join(OUT, 'comparison-mockup-vs-impl.html');
    let mockHtmlContent = fs.readFileSync(compareHtml, 'utf8')
      .replace('Production (previous word-rail)', 'Nested implementation')
      .replace(prodFile, 'light-02-nested-inclusios.png')
      .replace('Production (previous word-rail)', 'Nested implementation');
    mockHtmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Inter,system-ui,sans-serif;margin:24px;background:#f1f5f9}
    .row{display:flex;gap:16px;flex-wrap:wrap} .card{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;max-width:48%}
    img{max-width:100%;height:auto} ul{font-size:13px;line-height:1.5}
    </style></head><body><h1>Mockup vs implementation</h1>
    <div class="row"><div class="card"><h2>Approved mockup</h2><img src="approved-mockup-reference.png"></div>
    <div class="card"><h2>Nested unit frames (local)</h2><img src="light-02-nested-inclusios.png"></div></div>
    <ul><li>Matches: margin placement, nested outward layers, muted colors, readable Hebrew</li>
    <li>Intentional: line-segment caps vs illustrated corner glyphs</li>
    <li>Usability: frames stay aligned at Fit/85/100% zoom</li></ul></body></html>`;
    fs.writeFileSync(mockHtmlPath, mockHtmlContent);
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
