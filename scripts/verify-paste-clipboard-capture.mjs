#!/usr/bin/env node
/**
 * Paste modal clipboard capture verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-paste-clipboard-capture.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

const WORD_HTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word">
<body dir=RTL lang=HE>
<p dir=RTL style='margin-top:0in;margin-right:0in;margin-bottom:0in;margin-left:0in;text-align:right'>חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי</p>
<p dir=RTL style='margin-top:0in;margin-right:36.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי</p>
<p dir=RTL style='margin-top:0in;margin-right:72.0pt;margin-bottom:0in;margin-left:0in;text-align:right'>וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי</p>
</body></html>`;

const WORD_PLAIN = `חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי
כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי
וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי`;

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof capturePasteFromClipboard === 'function' && typeof getStoredPasteClipboardHtml === 'function',
    { timeout: 25000 }
  );
}

async function openPasteMenu(page) {
  await page.evaluate(() => {
    if (typeof openTopMenu === 'function') openTopMenu('paste');
  });
  await page.waitForSelector('#pasteBox', { state: 'visible', timeout: 5000 });
}

async function simulatePaste(page, html, plain) {
  return page.evaluate(({ html, plain }) => {
    const box = document.getElementById('pasteBox');
    box.focus();
    box.value = '';
    clearPendingPasteClipboard();
    const dt = new DataTransfer();
    if (html) dt.setData('text/html', html);
    if (plain) dt.setData('text/plain', plain);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    box.dispatchEvent(ev);
    return {
      status: document.getElementById('pasteLayoutStatus')?.textContent || '',
      statusKind: document.getElementById('pasteLayoutStatus')?.dataset.status || '',
      storedHtmlLen: getStoredPasteClipboardHtml().length,
      metaLines: getLastWordLayoutPasteMeta()?.lines?.length || 0,
      boxValue: box.value,
    };
  }, { html, plain });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);
    await openPasteMenu(page);

    const pasteResult = await simulatePaste(page, WORD_HTML, WORD_PLAIN);
    record('paste-html-captured', pasteResult.storedHtmlLen > 0, `storedHtml=${pasteResult.storedHtmlLen}`);
    record('paste-word-layout-status', pasteResult.statusKind === 'word-layout', pasteResult.status);
    record('paste-meta-lines', pasteResult.metaLines === 3, `metaLines=${pasteResult.metaLines}`);

    const afterLayout = await page.evaluate(() => {
      localStorage.setItem('hc-import-word-indent', 'yes');
      document.getElementById('refBox').value = 'Job 19:21-29';
      document.getElementById('makeTextWithLayout').click();
      const clauses = state?.verses?.[0]?.clauses || [];
      const indentPx = clauses.map(c => c.indentPx || 0);
      const status = document.getElementById('pasteLayoutStatus')?.textContent || '';
      return { indentPx, status, count: clauses.length };
    });
    record('layout-import-count', afterLayout.count === 3, `lines=${afterLayout.count}`);
    record('layout-import-indents', afterLayout.indentPx[1] === 48 && afterLayout.indentPx[2] === 96,
      `indentPx=${JSON.stringify(afterLayout.indentPx)}`);
    record('layout-import-summary', /Word layout: detected/.test(afterLayout.status), afterLayout.status);

    await openPasteMenu(page);
    await simulatePaste(page, WORD_HTML, WORD_PLAIN);
    const afterEdit = await page.evaluate(() => {
      const box = document.getElementById('pasteBox');
      box.value = box.value + ' ';
      box.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        status: document.getElementById('pasteLayoutStatus')?.textContent || '',
        statusKind: document.getElementById('pasteLayoutStatus')?.dataset.status || '',
        storedHtmlLen: getStoredPasteClipboardHtml().length,
      };
    });
    record('edit-clears-metadata', afterEdit.storedHtmlLen === 0 && afterEdit.statusKind === 'cleared', afterEdit.status);

    await openPasteMenu(page);
    const plainOnly = await simulatePaste(page, '', WORD_PLAIN);
    record('plain-only-status', plainOnly.statusKind === 'plain-only', plainOnly.status);

    const classHtml = `<html><head><style>p.MsoNormal{margin-right:0in} p.MsoIndent{margin-right:36.0pt} p.MsoIndent2{margin-right:72.0pt}</style></head><body dir=RTL>
<p class=MsoNormal dir=RTL>חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי</p>
<p class=MsoIndent dir=RTL>כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי</p>
<p class=MsoIndent2 dir=RTL>וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי</p>
</body></html>`;
    const classParsed = await page.evaluate((html) => {
      const parsed = parseWordHtmlLayoutLines(html, { isRtl: true });
      return {
        hasIndent: !!parsed?.hasIndent,
        indentPx: (parsed?.lines || []).map(l => l.indentPx || 0),
      };
    }, classHtml);
    record('word-class-styles', classParsed.hasIndent && classParsed.indentPx[1] === 48 && classParsed.indentPx[2] === 96,
      `indentPx=${JSON.stringify(classParsed.indentPx)}`);

    const passCount = results.filter(r => r.pass).length;
    console.log(`\n${passCount}/${results.length} passed`);
    if (passCount !== results.length) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
