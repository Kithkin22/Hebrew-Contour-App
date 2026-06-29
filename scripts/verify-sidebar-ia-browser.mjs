/**
 * Left sidebar IA + File menu verification.
 * Run: node scripts/verify-sidebar-ia-browser.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8080';
const PASS = 'AMBS';
const results = [];

function record(check, pass, detail) {
  results.push({ check, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}: ${detail}`);
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

async function openFileMenu(page) {
  await page.evaluate(() => {
    if (typeof openProjectFileMenu === 'function') openProjectFileMenu();
  });
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await unlock(page);

  // 1. Sidebar has no action buttons
  const sidebarActions = await page.evaluate(() => {
    const sidebar = document.querySelector('.hc-sidebar');
    if (!sidebar) return { missing: true };
    const forbidden = ['Save', 'New Project', 'Open Project', 'Import Morph', 'Project Settings'];
    const buttons = Array.from(sidebar.querySelectorAll('button')).map((b) => b.textContent.trim());
    const bad = buttons.filter((t) => forbidden.some((f) => t.includes(f)));
    return { buttons, bad, hasCollapse: !!sidebar.querySelector('.hc-sidebar-collapse-btn') };
  });
  record(
    'Left sidebar no action buttons',
    !sidebarActions.missing && sidebarActions.bad.length === 0,
    sidebarActions.missing ? 'no sidebar' : `buttons: [${sidebarActions.buttons.join(', ')}]`
  );

  // 7. Empty state — sidebar collapsed
  const emptyCollapsed = await page.evaluate(() => {
    const body = document.querySelector('.hc-app-body');
    return {
      empty: body?.classList.contains('hc-sidebar-empty'),
      collapsed: body?.classList.contains('hc-sidebar-collapsed')
    };
  });
  record(
    'Empty state sidebar collapsed/hidden',
    emptyCollapsed.empty && emptyCollapsed.collapsed,
    `empty=${emptyCollapsed.empty} collapsed=${emptyCollapsed.collapsed}`
  );

  await page.evaluate(() => {
    window.__iaTest = { calls: [] };
    const orig = window.handleProjectFileAction;
    window.handleProjectFileAction = function (action) {
      window.__iaTest.calls.push(action);
      return orig(action);
    };
    window.confirm = () => true;
  });

  // 2. File > Open Project
  await openFileMenu(page);
  const openSub = await page.evaluate(() => {
    const btn = document.getElementById('openRecentMenuBtn');
    const li = btn?.closest('.file-menu-has-submenu');
    if (li) li.classList.add('submenu-open');
    return !!document.querySelector('#recentProjectsSubmenu .file-menu-item, #recentProjectsSubmenu .file-menu-empty');
  });
  record('File > Open Project/Open Recent', openSub, openSub ? 'submenu present' : 'missing submenu');

  // 3. File > Save
  await openFileMenu(page);
  await page.click('.file-menu-item[data-action="save-project"]');
  await page.waitForTimeout(150);
  const saveCalled = await page.evaluate(() => (window.__iaTest?.calls || []).includes('save-project'));
  record('File > Save', saveCalled, saveCalled ? 'save-project invoked' : 'not invoked');

  // 4. File > New Project
  await page.evaluate(() => { window.__iaTest.calls = []; });
  await openFileMenu(page);
  await page.click('.file-menu-item[data-action="new-project"]');
  await page.waitForTimeout(200);
  const newCalled = await page.evaluate(() => (window.__iaTest?.calls || []).includes('new-project'));
  record('File > New Project', newCalled, newCalled ? 'new-project invoked' : 'not invoked');
  await page.evaluate(() => {
    document.getElementById('newProjectModal')?.classList.remove('show');
    document.getElementById('newProjectDontSave')?.click();
  });
  await page.waitForTimeout(300);

  // 5. File > Import Morph Data
  await page.evaluate(() => { window.__iaTest.calls = []; });
  await openFileMenu(page);
  await page.evaluate(() => {
    document.querySelectorAll('.file-menu-has-submenu').forEach((li) => {
      if (li.textContent.includes('Import')) li.classList.add('submenu-open');
    });
    document.querySelector('.file-menu-item[data-action="import-morph"]')?.click();
  });
  await page.waitForTimeout(150);
  const morphCalled = await page.evaluate(() => (window.__iaTest?.calls || []).includes('import-morph'));
  record('File > Import Morph Data', morphCalled, morphCalled ? 'import-morph invoked' : 'not invoked');

  // Load sample for nav + toggle tests
  await page.evaluate(() => loadSampleText());
  await page.waitForFunction(
    () => document.querySelectorAll('#hcVerseNav .hc-verse-nav-item').length > 0,
    { timeout: 10000 }
  );
  await page.waitForTimeout(200);

  // 6. Sidebar only passage/verse nav
  const navOnly = await page.evaluate(() => {
    const sidebar = document.querySelector('.hc-sidebar');
    const hasProject = !!sidebar?.querySelector('#hcSidebarProjectName');
    const hasSaveStatus = !!sidebar?.querySelector('#hcSidebarSaveStatus');
    const hasVerseNav = !!sidebar?.querySelector('#hcVerseNav .hc-verse-nav-item');
    const hasToggle = !!sidebar?.querySelector('#hcSidebarSegmented, .hc-sidebar-footer .hc-segmented');
    const badButtons = Array.from(sidebar?.querySelectorAll('button') || [])
      .filter((b) => !b.classList.contains('hc-sidebar-collapse-btn') && !b.classList.contains('hc-segmented-btn') && !b.classList.contains('hc-verse-nav-item'))
      .map((b) => b.textContent.trim());
    return { hasProject, hasSaveStatus, hasVerseNav, hasToggle, badButtons };
  });
  record(
    'Sidebar only passage/verse nav',
    navOnly.hasProject && navOnly.hasSaveStatus && navOnly.hasVerseNav && navOnly.hasToggle && navOnly.badButtons.length === 0,
    JSON.stringify(navOnly)
  );

  // 8. Contour/Table toggle
  await page.click('.hc-sidebar-footer .hc-segmented-btn[data-view="table"]');
  await page.waitForTimeout(200);
  const tableOn = await page.evaluate(() => document.body.classList.contains('workspace-table-view'));
  await page.click('.hc-sidebar-footer .hc-segmented-btn[data-view="contour"]');
  await page.waitForTimeout(200);
  const contourOn = await page.evaluate(() => !document.body.classList.contains('workspace-table-view'));
  record('Contour/Table toggle', tableOn && contourOn, `table=${tableOn} contour=${contourOn}`);

  const passed = results.filter((r) => r.pass).length;
  const report = { url: BASE, passed, total: results.length, results };
  fs.writeFileSync('scripts/verify-sidebar-ia-report.json', JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} checks passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
