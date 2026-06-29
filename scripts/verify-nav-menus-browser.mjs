/**
 * HCDS top-nav menu verification.
 * Run: node scripts/verify-nav-menus-browser.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8080';
const PASS = 'AMBS';
const results = [];

function record(menu, item, handler, pass, detail) {
  results.push({ menu, item, handler, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${menu}] ${item} → ${handler}: ${detail}`);
}

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => document.body.classList.contains('hc-shell-ready') && typeof window.handleProjectFileAction === 'function',
    { timeout: 20000 }
  );
}

async function ensureFileMenu(page) {
  const open = await page.evaluate(() => document.getElementById('projectFileMenuCard')?.classList.contains('menu-open'));
  if (!open) await clickNav(page, 'file');
}

async function clickNav(page, key) {
  await page.click(`.hc-nav-menu-btn[data-hc-menu="${key}"]`);
  await page.waitForTimeout(250);
}

async function ensureExportMenu(page) {
  const open = await page.evaluate(() => {
    const el = document.getElementById('hcExportMenuDropdown');
    return el && !el.classList.contains('hidden');
  });
  if (!open) await clickNav(page, 'export');
}

async function installSpies(page) {
  await page.evaluate(() => {
    window.__navTest = { calls: [], downloads: 0, alerts: [] };
    const orig = window.handleProjectFileAction;
    window.handleProjectFileAction = function (action) {
      window.__navTest.calls.push({ type: 'handleProjectFileAction', action });
      return orig(action);
    };
    window.confirm = () => true;
    const origAlert = window.alert;
    window.alert = (msg) => {
      window.__navTest.alerts.push(String(msg || ''));
      return origAlert(msg);
    };
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      window.__navTest.downloads += 1;
      return origCreate.call(URL, blob);
    };
  });
}

async function getCalls(page, filter) {
  return page.evaluate((f) => {
    const calls = (window.__navTest && window.__navTest.calls) || [];
    return f ? calls.filter((c) => c.action === f || c.type === f) : calls.slice();
  }, filter);
}

async function dismissModals(page) {
  await page.evaluate(() => {
    document.getElementById('modal')?.classList.remove('show');
    document.getElementById('newProjectModal')?.classList.remove('show');
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await unlock(page);
  await installSpies(page);

  // Ensure sample text for exports
  await page.evaluate(() => loadSampleText());
  await page.waitForSelector('#editor .word', { timeout: 10000 });

  // ── FILE MENU ──
  await clickNav(page, 'file');
  const fileOpen = await page.evaluate(() => document.getElementById('projectFileMenuCard')?.classList.contains('menu-open'));
  record('File', 'Open menu', 'openProjectFileMenu()', fileOpen, fileOpen ? 'menu visible' : 'menu did not open');

  const fileActions = [
    { label: 'New Project', action: 'new-project', handler: 'newProjectPrompt()' },
    { label: 'Save', action: 'save-project', handler: 'saveProjectLocal()' },
    { label: 'Save As', action: 'save-as', handler: 'saveProjectAs()' },
    { label: 'Rename', action: 'settings-rename', handler: 'renameCurrentProject()' },
    { label: 'Duplicate', action: 'settings-duplicate', handler: 'duplicateCurrentProject()' },
    { label: 'Delete', action: 'settings-delete', handler: 'deleteCurrentProject()' },
    { label: 'Import Project', action: 'import-project', handler: 'projectFileInput.click()' },
    { label: 'Import Morph Data', action: 'import-morph', handler: 'importMorphDataBtn.click()' },
    { label: 'Import Text', action: 'import-text', handler: 'openTopMenu("paste")' },
  ];

  async function clickFileAction(page, action) {
    await page.evaluate((act) => {
      const btn = document.querySelector(`.file-menu-item[data-action="${act}"]`);
      const li = btn && btn.closest('.file-menu-has-submenu');
      if (li) li.classList.add('submenu-open');
      btn && btn.click();
    }, action);
  }

  for (const item of fileActions) {
    await ensureFileMenu(page);
    await clickFileAction(page, item.action);
    await page.waitForTimeout(200);
    const calls = await getCalls(page, item.action);
    const pass = calls.length > 0;
    record('File', item.label, item.handler, pass, pass ? 'handler invoked' : 'no handler call');
    await dismissModals(page);
    await page.evaluate(() => { window.__navTest.calls = []; });
  }

  // Open Project submenu
  await ensureFileMenu(page);
  const openSub = await page.evaluate(() => {
    const btn = document.getElementById('openRecentMenuBtn');
    const li = btn && btn.closest('.file-menu-has-submenu');
    if (li) li.classList.add('submenu-open');
    return !!document.querySelector('#recentProjectsSubmenu .file-menu-item, #recentProjectsSubmenu .file-menu-empty');
  });
  record('File', 'Open Project submenu', 'renderProjectFileSubmenus() / openProjectById()', openSub, openSub ? 'submenu populated' : 'empty submenu');

  // ── GENERATE MENU ──
  await clickNav(page, 'generate');
  const genPanel = await page.evaluate(() => {
    const card = document.querySelector('.top-stack .card[data-menu="generate"]');
    return !!(card && card.classList.contains('menu-open') && document.querySelector('#generateWlc'));
  });
  record('Generate', 'Open panel', 'openTopMenu("generate")', genPanel, genPanel ? 'generate panel open' : 'panel missing');

  await page.evaluate(() => {
    document.getElementById('textSource').value = 'hebrew';
    if (typeof setupBooks === 'function') setupBooks();
    document.getElementById('bookSelect').value = '08O';
    document.getElementById('startChapter').value = '3';
    document.getElementById('startVerse').value = '4';
    document.getElementById('endChapter').value = '3';
    document.getElementById('endVerse').value = '4';
  });
  await page.click('#generateWlc');
  await page.waitForFunction(() => document.querySelectorAll('#editor .word').length > 0, { timeout: 10000 });
  const genWords = await page.locator('#editor .word').count();
  record('Generate', 'WLC Generate Text', 'generateWlc() → parseText()', genWords > 0, `${genWords} words in editor`);

  // ── PASTE MENU ──
  await page.evaluate(() => createNewProject({ saveCurrent: false }));
  await page.waitForTimeout(300);
  await clickNav(page, 'paste');
  const pastePanel = await page.evaluate(() => {
    const card = document.querySelector('.top-stack .card[data-menu="paste"]');
    return !!(card && card.classList.contains('menu-open') && document.querySelector('#makeText'));
  });
  record('Paste', 'Open panel', 'openTopMenu("paste")', pastePanel, pastePanel ? 'paste panel open' : 'panel missing');

  await page.evaluate(() => loadSampleText());
  await page.click('#makeText');
  await page.waitForFunction(() => document.querySelectorAll('#editor .word').length > 0, { timeout: 5000 });
  const pasteWords = await page.locator('#editor .word').count();
  record('Paste', 'Create Text from Paste', 'makeText.onclick → parseText()', pasteWords > 0, `${pasteWords} words in editor`);

  // ── EXPORT MENU ──
  const exports = [
    { label: 'Contour PDF', action: 'export-contour-pdf', handler: 'exportContourPdf()' },
    { label: 'Contour DOCX', action: 'export-contour-word', handler: 'exportContourDocx()' },
    { label: 'Table PDF', action: 'export-table-pdf', handler: 'exportTablePdf()' },
    { label: 'Table DOCX', action: 'export-table-word', handler: 'docxExport.click()' },
    { label: 'HTML', action: 'export-contour-html', handler: 'exportContourHtml()' },
    { label: 'Project JSON', action: 'export-project-json', handler: 'downloadProjectFile()' },
  ];

  for (const item of exports) {
    await page.evaluate(() => { window.__navTest.calls = []; });
    await ensureExportMenu(page);
    await page.click(`#hcExportMenuDropdown .hc-flyout-menu-item[data-action="${item.action}"]`);
    await page.waitForTimeout(300);
    const calls = await getCalls(page, item.action);
    const pass = calls.length > 0;
    record('Export', item.label, item.handler, pass, pass ? 'handler invoked' : 'no handler call');
    await dismissModals(page);
  }

  // Nav patch sanity after unlock path
  const patched = await page.evaluate(() => !!(window.openProjectFileMenu && window.openProjectFileMenu._hcNavWrapped));
  record('Core', 'HCDS menu patches active', 'reapplyHcNavMenuPatches()', patched, patched ? 'wrapped' : 'NOT wrapped');

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  const reportPath = 'scripts/verify-nav-menus-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({ base: BASE, results, failed: failed.length }, null, 2));

  console.log('\n=== NAV MENU VERIFICATION ===');
  results.forEach((r) => console.log(`  ${r.pass ? '✓' : '✗'} [${r.menu}] ${r.item} → ${r.handler}`));
  console.log(`\nReport: ${reportPath}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
