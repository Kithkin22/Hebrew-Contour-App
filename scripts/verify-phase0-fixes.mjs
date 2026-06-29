/**
 * Phase 0 regression verification (exports, parallel panes, layout, table).
 * Run: node scripts/verify-phase0-fixes.mjs
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
    () => typeof window.handleProjectFileAction === 'function' && document.getElementById('editor'),
    { timeout: 20000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await unlock(page);

  await page.evaluate(() => {
    window.confirm = () => true;
    window.prompt = (msg, def) => def || 'test-export';
    window.__lastAlert = '';
    const origAlert = window.alert;
    window.alert = (msg) => { window.__lastAlert = String(msg || ''); origAlert(msg); };
    window.__exportTest = { downloads: 0, popups: 0 };
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      window.__exportTest.downloads += 1;
      window.__exportTest.lastBlobSize = blob && blob.size;
      return origCreate.call(URL, blob);
    };
    const origOpen = window.open;
    window.open = function (...args) {
      window.__exportTest.popups += 1;
      return { document: { write() {}, close() {} }, focus() {} };
    };
  });

  await page.evaluate(() => loadSampleText());
  await page.waitForSelector('#editor .word', { timeout: 15000 });

  const legendSingle = await page.evaluate(() => {
    if (typeof syncLegendBelowEditor === 'function') syncLegendBelowEditor();
    const wrap = document.getElementById('legendBelowEditor');
    const anchor = document.getElementById('singleEditorSection');
    return {
      hasWrap: !!wrap,
      displayed: !!(wrap && getComputedStyle(wrap).display !== 'none'),
      afterEditor: !!(wrap && anchor && wrap.previousElementSibling === anchor),
      hasPanel: !!document.getElementById('legendPanel'),
    };
  });
  record('legend-single-visible', legendSingle.hasWrap && legendSingle.displayed && legendSingle.hasPanel,
    `afterEditor=${legendSingle.afterEditor}`);

  await page.evaluate(() => {
    window.handleProjectFileAction('save-as');
  });
  await page.waitForSelector('#modal.show', { timeout: 5000 });
  await page.fill('#modalInput', 'Sample Ruth Project');
  await page.click('#modalOk');
  await page.waitForTimeout(300);
  await page.evaluate(() => openRecentProjectsMenu(document.querySelector('.hc-sidebar-action')));
  await page.waitForTimeout(200);
  const recentOk = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#recentProjectsSubmenu .file-menu-item')];
    const portal = document.getElementById('projectFileMenuDropdown')?.dataset.shellPortal === '1';
    const visible = document.body.classList.contains('hc-project-menu-open');
    const names = items.map((el) => el.textContent || '');
    return { portal, visible, count: items.length, hasSample: names.some((n) => n.includes('Sample Ruth Project')) };
  });
  record('open-recent-after-save', recentOk.count > 0 && recentOk.hasSample,
    `items=${recentOk.count} sample=${recentOk.hasSample}`);
  await page.evaluate(() => { if (typeof closeProjectFileMenu === 'function') closeProjectFileMenu(); });

  const exports = [
    ['export-contour-word', 'downloads'],
    ['export-contour-html', 'downloads'],
    ['export-contour-pdf', 'popups'],
    ['export-table-word', 'downloads'],
    ['export-table-pdf', 'popups'],
    ['export-project-json', 'downloads'],
  ];

  for (const [action, metric] of exports) {
    await page.evaluate((a) => window.handleProjectFileAction(a), action);
    await page.waitForTimeout(200);
    const ok = await page.evaluate((m) => (window.__exportTest && window.__exportTest[m] > 0), metric);
    record(`export-${action}`, ok, ok ? `${metric} triggered` : `no ${metric}`);
    await page.evaluate(() => { window.__exportTest.downloads = 0; window.__exportTest.popups = 0; });
  }

  // Parallel pane isolation
  await page.evaluate(() => {
    const t = document.getElementById('parallelModeToggle');
    if (t && !t.checked) { t.checked = true; t.onchange({ target: t }); }
  });
  await page.waitForTimeout(500);

  await page.evaluate(async () => {
    if (typeof applyPaneReferenceFromInput !== 'function') return;
    await applyPaneReferenceFromInput(0, 'Ruth 1:1');
    await applyPaneReferenceFromInput(1, 'Ruth 1:2');
  });
  await page.waitForTimeout(800);

  const parallelOk = await page.evaluate(() => {
    if (!isParallelActive()) return { active: false };
    const left = (stateBundle.panes[0].verses[0] && stateBundle.panes[0].verses[0].ref) || '';
    const right = (stateBundle.panes[1].verses[0] && stateBundle.panes[1].verses[0].ref) || '';
    const leftText = stateBundle.panes[0].verses.map((v) => v.clauses[0].words.map((w) => w.text).join(' ')).join('|');
    const rightText = stateBundle.panes[1].verses.map((v) => v.clauses[0].words.map((w) => w.text).join(' ')).join('|');
    const refsDistinct = left && right && left !== right;
    const cross = leftText && rightText && leftText === rightText && refsDistinct;
    return { active: true, left, right, refsDistinct, cross };
  });
  record('parallel-isolation', parallelOk.active && parallelOk.refsDistinct && !parallelOk.cross,
    parallelOk.active ? `L=${parallelOk.left} R=${parallelOk.right}` : 'parallel inactive');

  const columnLayout = await page.evaluate(() => {
    if (!isParallelActive()) return { active: false };
    const rows = [...document.querySelectorAll('#parallelVerseRows .parallel-verse-row')];
    const rowChecks = rows.map((row) => {
      const cells = [...row.querySelectorAll(':scope > .parallel-verse-cell')];
      const panes = cells.map((c) => c.getAttribute('data-pane'));
      const refs = cells
        .filter((c) => !c.classList.contains('parallel-verse-cell-empty'))
        .map((c) => c.querySelector('.parallel-verse-ref')?.textContent?.trim() || '');
      const cols = cells.map((c) => getComputedStyle(c).gridColumnStart);
      return { panes, refs, cols, count: cells.length };
    });
    const allTwoSlots = rowChecks.every((r) => r.count === 2 && r.panes[0] === '0' && r.panes[1] === '1');
    const colsPinned = rowChecks.every((r) => r.cols[0] === '1' && r.cols[1] === '2');
    return { active: true, rows: rowChecks.length, allTwoSlots, colsPinned, rowChecks };
  });
  record('parallel-column-slots', columnLayout.active && columnLayout.allTwoSlots && columnLayout.colsPinned,
    columnLayout.active ? `${columnLayout.rows} rows, 2 slots each` : 'parallel inactive');

  await page.evaluate(async () => {
    await applyPaneReferenceFromInput(0, 'Ruth 3:4');
    await applyPaneReferenceFromInput(1, 'Ruth 3:5');
  });
  await page.waitForTimeout(800);

  const ruthAlign = await page.evaluate(() => {
    if (!isParallelActive()) return { active: false };
    const row = document.querySelector('#parallelVerseRows .parallel-verse-row[data-row="0"]');
    if (!row) return { active: true, hasRow: false };
    const leftCell = row.querySelector('.parallel-verse-cell[data-pane="0"]:not(.parallel-verse-cell-empty)');
    const rightCell = row.querySelector('.parallel-verse-cell[data-pane="1"]:not(.parallel-verse-cell-empty)');
    const leftRef = leftCell?.querySelector('.parallel-verse-ref')?.textContent?.trim() || '';
    const rightRef = rightCell?.querySelector('.parallel-verse-ref')?.textContent?.trim() || '';
    const leftCol = leftCell ? getComputedStyle(leftCell).gridColumnStart : '';
    const rightCol = rightCell ? getComputedStyle(rightCell).gridColumnStart : '';
    const sameRow = !!(leftCell && rightCell && leftCell.parentElement === rightCell.parentElement);
    const rowTop = row.getBoundingClientRect().top;
    const topsMatch = leftCell && rightCell
      && Math.abs(leftCell.getBoundingClientRect().top - rowTop) < 4
      && Math.abs(rightCell.getBoundingClientRect().top - rowTop) < 4;
    return {
      active: true,
      leftRef,
      rightRef,
      leftCol,
      rightCol,
      sameRow,
      topsMatch,
      stateLeft: stateBundle.panes[0].verses[0]?.ref || '',
      stateRight: stateBundle.panes[1].verses[0]?.ref || '',
    };
  });
  record('parallel-ruth-3-4-3-5-align',
    ruthAlign.active && ruthAlign.sameRow && ruthAlign.topsMatch
      && ruthAlign.leftRef.includes('3:4') && ruthAlign.rightRef.includes('3:5')
      && ruthAlign.leftCol === '1' && ruthAlign.rightCol === '2',
    ruthAlign.active
      ? `L=${ruthAlign.leftRef} col=${ruthAlign.leftCol} R=${ruthAlign.rightRef} col=${ruthAlign.rightCol}`
      : 'parallel inactive');

  const toggleStable = await page.evaluate(() => {
    const t = document.getElementById('parallelModeToggle');
    if (!t) return { ok: false, reason: 'no toggle' };
    t.checked = false;
    t.onchange({ target: t });
    const singleVisible = !document.getElementById('singleEditorSection')?.classList.contains('hidden');
    t.checked = true;
    t.onchange({ target: t });
    const parallelVisible = !document.getElementById('parallelCompareWrap')?.classList.contains('hidden');
    const row = document.querySelector('#parallelVerseRows .parallel-verse-row[data-row="0"]');
    const cells = row ? [...row.querySelectorAll(':scope > .parallel-verse-cell')] : [];
    const stillAligned = cells.length === 2
      && cells[0].getAttribute('data-pane') === '0'
      && cells[1].getAttribute('data-pane') === '1'
      && cells[0].querySelector('.parallel-verse-ref')?.textContent?.includes('3:4')
      && cells[1].querySelector('.parallel-verse-ref')?.textContent?.includes('3:5');
    return { ok: singleVisible && parallelVisible && stillAligned, singleVisible, parallelVisible, stillAligned };
  });
  await page.waitForTimeout(400);
  record('parallel-toggle-stable', toggleStable.ok,
    toggleStable.ok ? 'off/on keeps columns' : `single=${toggleStable.singleVisible} parallel=${toggleStable.parallelVisible} aligned=${toggleStable.stillAligned}`);

  const tabSwitchStable = await page.evaluate(() => {
    if (typeof setWorkspaceTab === 'function') setWorkspaceTab('table');
    const tableBlocks = document.querySelectorAll('.parallel-table-block').length;
    if (typeof setWorkspaceTab === 'function') setWorkspaceTab('contour');
    const row = document.querySelector('#parallelVerseRows .parallel-verse-row[data-row="0"]');
    const cells = row ? [...row.querySelectorAll(':scope > .parallel-verse-cell')] : [];
    const contourOk = cells.length === 2
      && cells[0].querySelector('.parallel-verse-ref')?.textContent?.includes('3:4')
      && cells[1].querySelector('.parallel-verse-ref')?.textContent?.includes('3:5');
    return { tableBlocks, contourOk };
  });
  await page.waitForTimeout(400);
  record('parallel-contour-table-contour', tabSwitchStable.contourOk,
    `tableBlocks=${tabSwitchStable.tableBlocks} contourAligned=${tabSwitchStable.contourOk}`);

  const shiftColumns = await page.evaluate(() => {
    if (typeof shiftRightColumnDown === 'function') shiftRightColumnDown();
    if (typeof render === 'function') render();
    const row0 = document.querySelector('#parallelVerseRows .parallel-verse-row[data-row="0"]');
    const row1 = document.querySelector('#parallelVerseRows .parallel-verse-row[data-row="1"]');
    if (!row0 || !row1) return { ok: false, reason: 'missing rows' };
    const r0cells = [...row0.querySelectorAll(':scope > .parallel-verse-cell')];
    const r1cells = [...row1.querySelectorAll(':scope > .parallel-verse-cell')];
    const r0rightOnly = r0cells[0]?.querySelector('.parallel-verse-ref')?.textContent?.includes('3:4')
      && r0cells[1]?.classList.contains('parallel-verse-cell-empty');
    const r1leftOnly = r1cells[0]?.classList.contains('parallel-verse-cell-empty')
      && r1cells[1]?.querySelector('.parallel-verse-ref')?.textContent?.includes('3:5');
    const rightCol = r1cells[1] ? getComputedStyle(r1cells[1]).gridColumnStart : '';
    if (typeof shiftRightColumnUp === 'function') shiftRightColumnUp();
    if (typeof render === 'function') render();
    return { ok: r0rightOnly && r1leftOnly && rightCol === '2', rightCol, r0rightOnly, r1leftOnly };
  });
  await page.waitForTimeout(300);
  record('parallel-shift-column-align', shiftColumns.ok,
    shiftColumns.ok ? 'shifted right verse stays in column 2' : `rightCol=${shiftColumns.rightCol || shiftColumns.reason || 'fail'}`);

  const legendParallel = await page.evaluate(() => {
    if (typeof syncLegendBelowEditor === 'function') syncLegendBelowEditor();
    const wrap = document.getElementById('legendBelowEditor');
    const anchor = document.getElementById('parallelCompareWrap');
    return {
      displayed: !!(wrap && getComputedStyle(wrap).display !== 'none'),
      afterParallel: !!(wrap && anchor && !anchor.classList.contains('hidden') && wrap.previousElementSibling === anchor),
      header: document.getElementById('legendBelowHeader')?.textContent || '',
    };
  });
  record('legend-parallel-visible', legendParallel.displayed && legendParallel.afterParallel,
    `header=${legendParallel.header.slice(0, 40)}`);

  // Parallel same-pane arc draw (regression: addArcFromLocsParallel must not recurse)
  await page.click('.annotation-tab-btn[data-panel="ann-arcs"]');
  await page.waitForTimeout(200);
  const parallelArcOk = await page.evaluate(() => {
    if (!isParallelActive()) return { active: false };
    const words = [...document.querySelectorAll('#parallelVerseRows .word[data-pane="0"]')];
    if (words.length < 4) return { active: true, words: words.length, reason: 'not enough words' };
    const loc1 = locFromWordElWithPane(words[0]);
    const loc2 = locFromWordElWithPane(words[3]);
    const before = stateBundle.panes[0].arcs.length;
    let err = null;
    let arc = null;
    try {
      arc = addArcFromLocsParallel(loc1, loc2);
    } catch (e) {
      err = e.message;
    }
    return {
      active: true,
      err,
      arcId: arc && arc.id,
      before,
      after: stateBundle.panes[0].arcs.length,
      samePane: loc1.pane === loc2.pane,
    };
  });
  record(
    'parallel-arc-draw-same-pane',
    parallelArcOk.active && !parallelArcOk.err && parallelArcOk.after > parallelArcOk.before,
    parallelArcOk.err
      ? `error=${parallelArcOk.err}`
      : `arcs ${parallelArcOk.before}->${parallelArcOk.after} id=${parallelArcOk.arcId || 'none'}`
  );

  // Parallel contour export modal — each choice must trigger download
  await page.evaluate(() => { window.__exportTest.downloads = 0; });
  await page.evaluate(() => exportContourDocxParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeLeft');
  await page.waitForTimeout(200);
  const leftExport = await page.evaluate(() => ({
    downloads: window.__exportTest.downloads,
    tableAlert: window.__lastAlert === 'Switch to Table View or create a table first.',
  }));
  record('parallel-export-left', leftExport.downloads > 0 && !leftExport.tableAlert,
    `downloads=${leftExport.downloads} tableAlert=${leftExport.tableAlert}`);

  await page.evaluate(() => { window.__lastAlert = ''; window.__exportTest.downloads = 0; });
  await page.evaluate(() => exportContourDocxParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeRight');
  await page.waitForTimeout(200);
  const rightExport = await page.evaluate(() => window.__exportTest.downloads);
  record('parallel-export-right', rightExport > 0, `downloads=${rightExport}`);

  await page.evaluate(() => { window.__exportTest.downloads = 0; });
  await page.evaluate(() => exportContourDocxParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeBoth');
  await page.waitForTimeout(200);
  const bothExport = await page.evaluate(() => window.__exportTest.downloads);
  record('parallel-export-both', bothExport > 0, `downloads=${bothExport}`);

  await page.evaluate(() => exportContourDocxParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeCancel');
  await page.waitForTimeout(100);
  const cancelClosed = await page.evaluate(() => !document.getElementById('exportScopeModal').classList.contains('show'));
  record('parallel-export-cancel', cancelClosed, cancelClosed ? 'modal closed' : 'modal still open');

  // Parallel table view
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(300);
  const parallelTables = await page.evaluate(() => ({
    blocks: document.querySelectorAll('.parallel-table-block').length,
    tables: document.querySelectorAll('.parallel-ann-table').length,
    leftRef: stateBundle.panes[0].verses[0]?.ref,
    rightRef: stateBundle.panes[1].verses[0]?.ref,
    leftRows: document.querySelector('.parallel-ann-table[data-pane="0"] tbody')?.rows.length,
    rightRows: document.querySelector('.parallel-ann-table[data-pane="1"] tbody')?.rows.length,
    titles: [...document.querySelectorAll('.parallel-table-title')].map((el) => el.textContent),
  }));
  record('parallel-table-view', parallelTables.blocks === 2 && parallelTables.tables === 2,
    `${parallelTables.blocks} blocks, titles: ${parallelTables.titles.join(' | ')}`);

  await page.evaluate(() => { window.__exportTest.downloads = 0; window.__exportTest.popups = 0; });
  await page.evaluate(() => exportContourPdfParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeLeft');
  await page.waitForTimeout(300);
  const contourPdfOk = await page.evaluate(() => {
    const hadTableAlert = window.__lastAlert === 'Switch to Table View or create a table first.';
    const popup = window.__exportTest.popups > 0;
    return { popup, hadTableAlert, editorFromState: typeof buildContourEditorHtmlFromState === 'function' && buildContourEditorHtmlFromState().indexOf('No text loaded yet') === -1 };
  });
  record('parallel-contour-pdf-left', contourPdfOk.popup && !contourPdfOk.hadTableAlert && contourPdfOk.editorFromState,
    `popup=${contourPdfOk.popup} tableAlert=${contourPdfOk.hadTableAlert}`);

  await page.click('[data-tab="table"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__exportTest.popups = 0; });
  await page.evaluate(() => exportTablePdfParallel());
  await page.waitForSelector('#exportScopeModal.show', { timeout: 5000 });
  await page.click('#exportScopeLeft');
  await page.waitForTimeout(300);
  const tablePdfOk = await page.evaluate(() => {
    const html = typeof getTableHtmlForExport === 'function' ? getTableHtmlForExport({ panes: [0], mode: 'left' }) : '';
    return { popup: window.__exportTest.popups > 0, hasTable: html.includes('<table'), hasHebrew: html.includes('</td>'), emptyState: html.includes('No text loaded') };
  });
  record('parallel-table-pdf-left', tablePdfOk.popup && tablePdfOk.hasTable && tablePdfOk.hasHebrew && !tablePdfOk.emptyState,
    `popup=${tablePdfOk.popup} table=${tablePdfOk.hasTable}`);

  await page.evaluate(() => { window.__exportTest.downloads = 0; });
  await page.click('#docxExport');
  if (await page.locator('#exportScopeModal.show').count()) {
    await page.click('#exportScopeLeft');
  }
  await page.waitForTimeout(200);
  const tableExport = await page.evaluate(() => window.__exportTest.downloads);
  record('parallel-table-export', tableExport > 0, `downloads=${tableExport}`);

  // Arc toolbar does not collapse editor (single-pane contour view)
  await page.click('[data-tab="contour"]');
  await page.evaluate(() => {
    const t = document.getElementById('parallelModeToggle');
    if (t) t.checked = false;
    stateBundle.parallelEnabled = false;
    render();
  });
  await page.waitForFunction(() => {
    const section = document.getElementById('singleEditorSection');
    const wrap = document.getElementById('editorWrap');
    return section && !section.classList.contains('hidden') && wrap && wrap.offsetHeight >= 180;
  }, { timeout: 8000 });
  await page.click('.annotation-tab-btn[data-panel="ann-arcs"]');
  await page.waitForTimeout(300);
  const arcLayout = await page.evaluate(() => {
    const wrap = document.getElementById('editorWrap');
    const scroll = document.querySelector('.parallel-scroll-area');
    const parallel = typeof isParallelActive === 'function' && isParallelActive();
    const el = parallel ? scroll : wrap;
    return { h: el ? el.offsetHeight : 0, parallel };
  });
  record('arc-toolbar-layout', arcLayout.h >= 180, `editor area height=${arcLayout.h}px${arcLayout.parallel ? ' (parallel)' : ''}`);

  // Single table view when parallel off
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(200);
  const singleTable = await page.evaluate(() => ({
    dualBlocks: document.querySelectorAll('.parallel-table-block').length,
    singleTable: !!document.getElementById('annTable'),
  }));
  record('single-table-view', singleTable.dualBlocks === 0 && singleTable.singleTable,
    singleTable.singleTable ? 'one #annTable' : 'missing table');

  // Table styling preserved (simple grid, no uppercase headers)
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(200);
  const tableOk = await page.evaluate(() => {
    const th = document.querySelector('#annTable th');
    if (!th) return { ok: false, reason: 'no table' };
    const cs = getComputedStyle(th);
    return {
      ok: cs.textTransform === 'none' || cs.textTransform === '',
      textTransform: cs.textTransform,
      cols: document.querySelectorAll('#annTable th').length,
    };
  });
  record('table-view-preserved', tableOk.ok, tableOk.ok ? `${tableOk.cols} columns, text-transform=${tableOk.textTransform}` : tableOk.reason);

  // Menus still work
  await page.click('[data-tab="contour"]');
  await page.evaluate(() => window.openProjectFileMenu());
  const fileOpen = await page.evaluate(() => document.getElementById('projectFileMenuCard')?.classList.contains('menu-open'));
  record('file-menu', fileOpen, fileOpen ? 'opens' : 'failed');

  await page.evaluate(() => window.closeTopMenus && window.closeTopMenus());
  await page.evaluate(() => window.openTopMenu('generate'));
  const genOpen = await page.evaluate(() => document.querySelector('[data-menu="generate"]')?.classList.contains('menu-open'));
  record('generate-menu', genOpen, genOpen ? 'opens' : 'failed');

  // Dark mode
  await page.evaluate(() => document.getElementById('themeToggleBtn')?.click());
  await page.waitForTimeout(150);
  const darkOk = await page.evaluate(() => {
    const word = document.querySelector('#editor .word, .parallel-verse-body .word');
    if (!word) return { ok: document.body.classList.contains('dark-mode'), reason: 'no word' };
    const color = getComputedStyle(word).color;
    const bg = getComputedStyle(document.getElementById('editor') || word).backgroundColor;
    const parse = (s) => s.match(/\d+/g).map(Number);
    const [r1, g1, b1] = parse(color);
    const [r2, g2, b2] = parse(bg);
    const lum = (r, g, b) => {
      const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const contrast = (Math.max(lum(r1, g1, b1), lum(r2, g2, b2)) + 0.05) / (Math.min(lum(r1, g1, b1), lum(r2, g2, b2)) + 0.05);
    return { ok: document.body.classList.contains('dark-mode') && contrast >= 4.5, contrast: contrast.toFixed(1) };
  });
  record('dark-mode', darkOk.ok, darkOk.contrast ? `contrast=${darkOk.contrast}` : String(darkOk.reason));

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  const report = { base: BASE, passed, total: results.length, results };
  fs.writeFileSync('scripts/verify-phase0-fixes-report.json', JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
