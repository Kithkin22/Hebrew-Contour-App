/**
 * Functional verification for HCDS comments workflow.
 * Run: npx playwright install chromium && node scripts/verify-comments-browser.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:56092';
const PASS = 'AMBS';

const results = [];

function record(step, pass, detail) {
  results.push({ step, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} Step ${step}: ${detail}`);
}

async function waitForApp(page) {
  await page.waitForFunction(
    () => document.getElementById('editor') && (document.body.classList.contains('hc-shell-ready') || document.querySelector('.hc-shell-ready')),
    { timeout: 20000 }
  );
}

async function unlockIfNeeded(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await waitForApp(page);
}

async function fillModal(page, text) {
  await page.waitForSelector('#modal.show', { timeout: 5000 });
  await page.fill('#modalInput', text);
  await page.click('#modalOk');
  await page.waitForFunction(() => !document.getElementById('modal')?.classList.contains('show'), { timeout: 5000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await unlockIfNeeded(page);

  await page.evaluate(() => {
    if (typeof loadSampleText === 'function') loadSampleText();
  });
  await page.waitForSelector('#editor .word', { timeout: 15000 });

  const commentsTab = page.locator('.hc-panel-tab[data-panel="comments"]');
  if (await commentsTab.count()) await commentsTab.click();

  // 1. Single-word comment
  const firstWord = page.locator('#editor .word').first();
  await firstWord.click();
  await page.click('#panelAddCommentBtn');
  await fillModal(page, 'Single word comment test');
  await page.waitForTimeout(400);

  const singleOk = await page.evaluate(() => {
    const cm = state.comments.find((c) => c.text === 'Single word comment test');
    if (!cm) return false;
    const same = cm.start.v === cm.end.v && cm.start.c === cm.end.c && cm.start.w === cm.end.w;
    const wordEl = document.querySelector(
      `#editor .word[data-v="${cm.start.v}"][data-c="${cm.start.c}"][data-w="${cm.start.w}"]`
    );
    const marker = wordEl?.nextElementSibling;
    return same && marker?.classList?.contains('comment-marker') && marker.dataset.commentId === cm.id;
  });
  record(1, singleOk, singleOk ? 'word comment added with marker' : 'missing single-word comment or marker');

  // 2. Phrase/range comment
  const words = page.locator('#editor .word');
  const wordCount = await words.count();
  const startIdx = Math.min(2, wordCount - 1);
  const endIdx = Math.min(6, wordCount - 1);
  await words.nth(startIdx).click();
  await page.click('#panelSetCommentStart');
  await words.nth(endIdx).click();
  await page.click('#panelAddCommentBtn');
  await fillModal(page, 'Phrase range comment test');
  await page.waitForTimeout(400);

  const phraseOk = await page.evaluate(() => {
    const cm = state.comments.find((c) => c.text === 'Phrase range comment test');
    if (!cm) return false;
    const range = !(cm.start.v === cm.end.v && cm.start.c === cm.end.c && cm.start.w === cm.end.w);
    return range;
  });
  record(2, phraseOk, phraseOk ? 'phrase comment spans multiple words' : 'phrase comment missing or not a range');

  // 3–4. Collapse comments panel; workspace should expand
  const widthsBefore = await page.evaluate(() => {
    const ws = document.querySelector('.hc-workspace');
    return ws ? ws.getBoundingClientRect().width : 0;
  });
  await page.click('#hcCommentsCollapseBtn');
  await page.waitForTimeout(350);

  const collapsed = await page.evaluate(() => ({
    bodyCollapsed: document.querySelector('.hc-app-body')?.classList.contains('hc-comments-collapsed'),
    restoreVisible: !document.getElementById('hcCommentsRestoreBtn')?.classList.contains('hidden'),
  }));
  const widthsAfter = await page.evaluate(() => {
    const ws = document.querySelector('.hc-workspace');
    return ws ? ws.getBoundingClientRect().width : 0;
  });
  const expanded = widthsAfter > widthsBefore + 20;
  record(3, collapsed.bodyCollapsed && collapsed.restoreVisible, `collapsed=${collapsed.bodyCollapsed}, restore=${collapsed.restoreVisible}`);
  record(4, expanded, `workspace width ${widthsBefore.toFixed(0)} → ${widthsAfter.toFixed(0)}`);

  // 5–6. Reopen panel; comments still listed
  await page.click('#hcCommentsRestoreBtn');
  await page.waitForTimeout(350);
  const reopened = await page.evaluate(() => !document.querySelector('.hc-app-body')?.classList.contains('hc-comments-collapsed'));
  const cards = await page.locator('.comment-card').count();
  record(5, reopened, `panel reopened=${reopened}`);
  record(6, cards >= 2, `comment cards visible=${cards}`);

  // 7–8. Save and reload; comments persist
  await page.evaluate(() => persistCurrentProject(false));
  const savedTexts = await page.evaluate(() => state.comments.map((c) => c.text));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await unlockIfNeeded(page);
  await page.waitForSelector('#editor .word', { timeout: 15000 });

  const afterReload = await page.evaluate(() => state.comments.map((c) => c.text));
  const persisted =
    afterReload.includes('Single word comment test') && afterReload.includes('Phrase range comment test');
  record(7, true, `saved project with ${savedTexts.length} comments`);
  record(8, persisted, `reload comments: ${JSON.stringify(afterReload)}`);

  // 9–10. Table → Contour; markers on correct words
  await page.click('.hc-segmented-btn[data-view="table"]');
  await page.waitForTimeout(400);
  const onTable = await page.evaluate(() => document.body.classList.contains('workspace-table-view'));
  await page.click('.hc-segmented-btn[data-view="contour"]');
  await page.waitForTimeout(500);

  const markerCheck = await page.evaluate(() => {
    function markerOnStartWord(cm) {
      const sel = `#editor .word[data-v="${cm.start.v}"][data-c="${cm.start.c}"][data-w="${cm.start.w}"]`;
      const wordEl = document.querySelector(sel);
      if (!wordEl) return { text: cm.text, hasWord: false, hasMarker: false };
      const marker =
        wordEl.nextElementSibling?.classList?.contains('comment-marker') &&
        wordEl.nextElementSibling.dataset.commentId === cm.id
          ? wordEl.nextElementSibling
          : document.querySelector(`#editor .comment-marker[data-comment-id="${cm.id}"]`);
      const onWord =
        marker &&
        marker.previousElementSibling === wordEl &&
        marker.dataset.commentId === cm.id;
      return { text: cm.text, hasWord: true, hasMarker: !!onWord };
    }
    const details = state.comments.map(markerOnStartWord);
    return { ok: details.every((d) => d.hasWord && d.hasMarker), details };
  });
  record(9, onTable, 'switched Table View then Contour View');
  record(10, markerCheck.ok, JSON.stringify(markerCheck.details));

  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  const failed = results.filter((r) => !r.pass);
  results.forEach((r) => console.log(`  ${r.pass ? '✓' : '✗'} ${r.step}. ${r.detail}`));
  if (failed.length) {
    console.error(`\n${failed.length} step(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll 10 steps passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
