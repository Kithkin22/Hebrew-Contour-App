/**
 * Phase 0 stable-base verification (pre-HCDS shell).
 * Run: node scripts/verify-phase0-stable.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8080';
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
    () => !document.querySelector('.hc-app-body') && typeof window.openTopMenu === 'function' && document.getElementById('editor'),
    { timeout: 20000 }
  );
}

async function openTopMenu(page, name) {
  await page.evaluate((n) => window.openTopMenu(n), name);
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await unlock(page);

  // 12. No HCDS shell regressions
  const shell = await page.evaluate(() => ({
    hcAppBody: !!document.querySelector('.hc-app-body'),
    uiShell: !!document.querySelector('script[src*="ui-shell"]'),
    hcNav: document.querySelectorAll('.hc-nav-menu-btn').length,
    layoutModern: !!document.querySelector('link[href*="layout-modern"]'),
  }));
  record('no-hcds-shell', !shell.hcAppBody && shell.hcNav === 0 && !shell.layoutModern,
    `hc-app-body=${shell.hcAppBody}, hc-nav=${shell.hcNav}, layout-modern=${shell.layoutModern}`);

  await page.evaluate(() => {
    window.confirm = () => true;
    window.prompt = () => null;
  });

  // Load sample for editor tests
  await page.evaluate(() => loadSampleText());
  await page.waitForSelector('#editor .word', { timeout: 15000 });

  // 1. File menu
  await page.evaluate(() => window.openProjectFileMenu && window.openProjectFileMenu());
  const fileOpen = await page.evaluate(() => document.getElementById('projectFileMenuCard')?.classList.contains('menu-open'));
  record('file-menu', fileOpen, fileOpen ? 'File menu opens' : 'File menu failed');

  // 2. Generate menu
  await page.evaluate(() => window.closeTopMenus && window.closeTopMenus());
  await openTopMenu(page, 'generate');
  const genOpen = await page.evaluate(() => document.querySelector('[data-menu="generate"]')?.classList.contains('menu-open'));
  const genPanel = await page.evaluate(() => {
    const card = document.querySelector('[data-menu="generate"]');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, inViewport: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  record('generate-menu', genOpen && genPanel?.inViewport,
    genOpen ? `panel in viewport=${genPanel?.inViewport}` : 'Generate menu did not open');

  // 3. Paste menu
  await page.evaluate(() => window.closeTopMenus());
  await openTopMenu(page, 'paste');
  const pasteOpen = await page.evaluate(() => document.querySelector('[data-menu="paste"]')?.classList.contains('menu-open'));
  record('paste-menu', pasteOpen, pasteOpen ? 'Paste menu opens' : 'Paste menu failed');

  // 4. Export (via File submenu)
  await page.evaluate(() => window.closeTopMenus());
  await page.evaluate(() => window.openProjectFileMenu());
  await page.evaluate(() => {
    const exportBtn = [...document.querySelectorAll('#projectFileMenuDropdown .file-menu-item')]
      .find((b) => b.textContent.trim().startsWith('Export'));
    const li = exportBtn?.parentElement;
    if (li) li.classList.add('submenu-open');
  });
  await page.waitForTimeout(150);
  const exportVisible = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-action^="export-"]')];
    return items.some((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  });
  record('export-menu', exportVisible, exportVisible ? 'Export submenu visible' : 'Export submenu missing');

  // 5. Contour view
  await page.evaluate(() => window.closeTopMenus());
  const contourActive = await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="contour"]');
    const tabPane = document.getElementById('contourTab');
    return tab?.classList.contains('active') && tabPane && !tabPane.classList.contains('hidden');
  });
  record('contour-view', contourActive, contourActive ? 'Contour editor visible' : 'Contour view broken');

  // 6. Table view
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(200);
  const tableOk = await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="table"]');
    const tabPane = document.getElementById('tableTab');
    const wrap = document.getElementById('tableWrap');
    return tab?.classList.contains('active') && tabPane && !tabPane.classList.contains('hidden') && !!wrap;
  });
  record('table-view', tableOk, tableOk ? 'Table view toggles' : 'Table view broken');

  // Back to contour
  await page.click('[data-tab="contour"]');

  // 7. Dark mode readable
  await page.evaluate(() => {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(150);
  const darkOk = await page.evaluate(() => {
    const dark = document.body.classList.contains('dark-mode');
    const word = document.querySelector('#editor .word');
    if (!dark || !word) return { dark, readable: false };
    const color = getComputedStyle(word).color;
    const bg = getComputedStyle(document.getElementById('editor')).backgroundColor;
    const parse = (s) => s.match(/\d+/g).map(Number);
    const [r1, g1, b1] = parse(color);
    const [r2, g2, b2] = parse(bg);
    const lum = (r, g, b) => {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const contrast = (Math.max(lum(r1, g1, b1), lum(r2, g2, b2)) + 0.05) /
      (Math.min(lum(r1, g1, b1), lum(r2, g2, b2)) + 0.05);
    return { dark, readable: contrast >= 4.5, color, bg, contrast: contrast.toFixed(2) };
  });
  record('dark-mode', darkOk.dark && darkOk.readable,
    darkOk.dark ? `contrast=${darkOk.contrast}, text=${darkOk.color}` : 'Dark mode not applied');

  // 8. Comments
  await page.evaluate(() => {
    if (typeof addComment === 'function') addComment();
  });
  await page.waitForTimeout(200);
  const commentsOk = await page.evaluate(() => {
    const panel = document.getElementById('commentsPanel');
    return !!(panel && panel.textContent && panel.textContent.length > 0);
  });
  record('comments', commentsOk, commentsOk ? 'Comments panel renders' : 'Comments panel empty');

  // 9. Arc overlay layer
  await page.evaluate(() => { if (typeof renderArcOverlay === 'function') renderArcOverlay(); });
  const arcOk = await page.evaluate(() => {
    const svg = document.getElementById('arcSvg');
    const ed = document.getElementById('editor');
    if (!svg || !ed) return false;
    return svg.parentElement === ed;
  });
  record('arcs-layer', arcOk, arcOk ? 'Arc SVG layer present' : 'Arc layer missing');

  // 10. Delete verse removes empty parallel row
  await page.click('[data-tab="contour"]');
  await page.evaluate(() => {
    const t = document.getElementById('parallelModeToggle');
    if (t && !t.checked) { t.checked = true; t.onchange && t.onchange({ target: t }); }
  });
  await page.waitForTimeout(400);
  const deleteOk = await page.evaluate(() => {
    if (!isParallelActive()) return { active: false };
    const emptyCells = document.querySelectorAll('.parallel-verse-cell:empty, .parallel-verse-body:empty').length;
    const before = document.querySelectorAll('.parallel-verse-row').length;
    if (typeof removeVerseFromPane === 'function') removeVerseFromPane(0, 0, true);
    const after = document.querySelectorAll('.parallel-verse-row').length;
    const orphanCells = [...document.querySelectorAll('.parallel-verse-cell')].filter((c) => !c.querySelector('.word')).length;
    return { active: true, before, after, orphanCells, emptyCells };
  });
  record('delete-verse', deleteOk.active && deleteOk.after <= deleteOk.before && deleteOk.orphanCells === 0,
    deleteOk.active ? `rows ${deleteOk.before}→${deleteOk.after}, orphanCells=${deleteOk.orphanCells}` : 'Parallel not active');

  // 11. Save/load/autosave hooks
  const saveOk = await page.evaluate(() => ({
    autoSave: typeof autoSaveProject === 'function',
    initPm: typeof initProjectManager === 'function',
    status: !!document.getElementById('saveStatus'),
  }));
  record('save-autosave', saveOk.autoSave && saveOk.initPm && saveOk.status,
    `autoSave=${saveOk.autoSave}, projectManager=${saveOk.initPm}`);

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const report = { base: BASE, passed, total, results };
  fs.writeFileSync('scripts/verify-phase0-report.json', JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
