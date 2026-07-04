#!/usr/bin/env node
/**
 * Final presentation QA for Word contour fidelity (Job 19:21–29).
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-presentation-qa.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const EXPECTED_TITLE = 'Job 19:21\u201329 (BHS OT)';
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
    () => typeof contourPassageTitleHtml === 'function' && typeof parseWordHtmlLayoutLines === 'function',
    { timeout: 25000 }
  );
}

const JOB_WORD_HTML = `<html><body dir=RTL>
<p dir=RTL style='margin-right:0pt;text-align:right'>חָנֵּנִי חָנֵּנִי אַתֶּם רֵעָי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי יַד־אֱלוֹהַּ נָגְעָה בִּי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>לָמָּה תִּרְדְּפֻנִי כְמוֹ־אֵל</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְכִבְשָׂרִי דָבֵק בְּעַצְמֹתָי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>וָאֶתְמַלֵּטָה בְּעוֹר־שִׁנָּי</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וַיַּעֲנוּ אֶת־אֱיּוֹב וַיֹּאמְרוּ</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>מָה־יֹּסֶף מַעַלְלֵינוּ דָּבָר</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאֵי־מִזֶּה כֹחַ־לָנוּ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וַאֲנִי יָדַעְתִּי גֹּאֲלִי חַי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאַחֲרוֹן עַל־עָפָר יָקוּם</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וְאַחַר עוֹרִי נִקְּפוּ־זֹאת</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וּמִבְּשָׂרִי אֶחֱזֶה אֱלוֹהַּ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>וַאֲשֶׁר אֲנִי אֶחֱזֶה־לּוֹ לִי</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וְעֵינַי רָאוּ וְלֹא־זָר</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>אִם־תֹּאמְרוּ נִשְׂגְּבָה עָלָיו</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>גֹּרֶם הַמְּיַסֵּר אוֹיֵב לוֹ</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי־אַתֶּם תֹּאמְרוּ מַדּוּעַ</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>יִרְדֹּף אֱלוֹהַּ דְּרָכוֹ</p>
</body></html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const qa = await page.evaluate(async (wordHtml) => {
      localStorage.setItem('hc-import-word-indent', 'yes');
      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      state.language = 'hebrew-bhsa';
      parseText(parsed.text, 'Job 19:21-29 (BHS OT)', false, {
        preserveLayout: true,
        layoutLines: parsed.lines,
      });
      if (state.verses[0]) state.verses[0].hideRef = true;
      render();

      const titleEl = document.getElementById('contourPassageTitle');
      const editor = document.getElementById('editor');
      const wrap = document.getElementById('editorWrap');
      const sheet = document.querySelector('.contour-document-sheet');
      const titleText = titleEl && !titleEl.hidden ? titleEl.textContent.trim() : '';
      const titleUsesBdi = !!(titleEl && titleEl.querySelector('bdi'));
      const noEditorVerseRef = !document.querySelector('#editor .verse-ref');
      const titleRect = titleEl && !titleEl.hidden ? titleEl.getBoundingClientRect() : null;
      const sheetRect = sheet ? sheet.getBoundingClientRect() : editor.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();

      const titleLeftInset = titleRect ? titleRect.left - sheetRect.left : null;
      const titleTopInset = titleRect ? titleRect.top - sheetRect.top : null;
      const sheetCenter = sheetRect.left + sheetRect.width / 2;
      const wrapCenter = wrapRect.left + wrapRect.width / 2;
      const centerDelta = Math.abs(sheetCenter - wrapCenter);
      const sheetWidth = sheetRect.width;

      const clauseEls = Array.from(document.querySelectorAll('#editor .clause'));
      const mdEl = clauseEls.find((el) => el.classList.contains('layout-break-md'));
      const lgEl = clauseEls.find((el) => el.classList.contains('layout-break-lg'));
      const mdMb = mdEl ? parseFloat(getComputedStyle(mdEl).marginBottom) : 0;
      const lgMb = lgEl ? parseFloat(getComputedStyle(lgEl).marginBottom) : 0;

      const rightmost = clauseEls.reduce((max, el) => {
        const r = el.getBoundingClientRect();
        return Math.max(max, r.right);
      }, 0);
      const rightInset = sheetRect.right - rightmost;

      const indentSample = clauseEls
        .map((el) => parseFloat(getComputedStyle(el).marginRight) || 0)
        .filter((mr) => mr >= 36);

      const exportCss = typeof exportLayoutBreakCss === 'function' ? exportLayoutBreakCss() : '';
      const exportHtml = typeof buildContourEditorHtmlFromState === 'function'
        ? buildContourEditorHtmlFromState(true)
        : '';
      const docx = typeof contourDocxXml === 'function' ? contourDocxXml() : '';

      const payload = projectPayload();
      const saved = JSON.stringify(payload);
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(saved), 0).pane;
      state = stateBundle.panes[0];
      render();
      const reloadOk = state.verses[0].clauses.some((c) => (c.indent || 0) > 0)
        && state.verses[0].clauses.some((c) => c.spacingAfter === 'medium' || c.spacingAfter === 'large');

      const snapshot = {
        titleText,
        titleUsesBdi,
        noEditorVerseRef,
        titleLeftInset,
        titleTopInset,
        centerDelta,
        editorMaxWidth: sheetWidth,
        rightInset,
        mdMb,
        lgMb,
        indentCount: indentSample.length,
        exportCssHas40: exportCss.includes('40px'),
        exportCssHas72: exportCss.includes('72px'),
        exportHasBreaks: exportHtml.includes('layout-break-md') && exportHtml.includes('layout-break-lg'),
        exportHasIndent: exportHtml.includes('margin-right:30px') || exportHtml.includes('margin-right:60px'),
        docxBreaks: docx.includes('w:spacing w:after="480"') && docx.includes('w:spacing w:after="960"'),
        docxIndent: docx.includes('w:ind w:right="720"') || docx.includes('w:ind w:right="1440"'),
        reloadOk,
        hasDocumentPage: editor.classList.contains('contour-document-page') && !!sheet,
        hasDocumentSurface: wrap.classList.contains('contour-document-surface'),
        clauseCount: clauseEls.length,
      };
      return snapshot;
    }, JOB_WORD_HTML);

    await page.locator('#editorWrap').scrollIntoViewIfNeeded();
    const shotPath = 'docs/assets/presentation-qa-after.png';
    fs.mkdirSync('docs/assets', { recursive: true });
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`\nScreenshot: ${shotPath}`);

    const parallelOk = await page.evaluate(() => {
      stateBundle.parallelEnabled = true;
      stateBundle.panes[1] = freshPaneState();
      stateBundle.panes[1].ref = 'Ruth 1:1';
      stateBundle.panes[1].verses = [{
        ref: 'Ruth 1:1',
        clauses: [{ indent: 0, words: [{ text: 'וַיְהִי', deleted: false }], ann: {} }],
      }];
      renderParallelEditors();
      return !document.getElementById('parallelCompareWrap').classList.contains('hidden');
    });
    qa.parallelVisible = parallelOk;

    record('passage-title-text', qa.titleText === EXPECTED_TITLE, `title="${qa.titleText}" expected="${EXPECTED_TITLE}"`);
    record('passage-title-bidi', qa.titleUsesBdi && qa.noEditorVerseRef, `bdi=${qa.titleUsesBdi} noEditorVerseRef=${qa.noEditorVerseRef}`);
    record('passage-title-upper-left', qa.titleLeftInset != null && qa.titleLeftInset >= 88 && qa.titleLeftInset <= 110 && qa.titleTopInset >= 88 && qa.titleTopInset <= 110,
      `leftInset=${qa.titleLeftInset?.toFixed(0)}px topInset=${qa.titleTopInset?.toFixed(0)}px`);
    record('page-centered', qa.centerDelta <= 40 && qa.editorMaxWidth >= 780 && qa.editorMaxWidth <= 830, `centerDelta=${qa.centerDelta?.toFixed(0)}px sheetWidth=${qa.editorMaxWidth?.toFixed(0)}px`);
    record('right-margin-breathing', qa.rightInset >= 115 && qa.rightInset <= 145, `rightInset=${qa.rightInset?.toFixed(0)}px`);
    record('medium-break-spacing', qa.mdMb >= 36 && qa.mdMb <= 48, `medium margin-bottom=${qa.mdMb}px`);
    record('large-break-spacing', qa.lgMb >= 64 && qa.lgMb <= 80, `large margin-bottom=${qa.lgMb}px`);
    record('word-indent-visual', qa.indentCount >= 3, `indented clauses=${qa.indentCount}`);
    record('document-page-classes', qa.hasDocumentPage && qa.hasDocumentSurface, `page=${qa.hasDocumentPage} surface=${qa.hasDocumentSurface}`);
    record('export-html-spacing', qa.exportCssHas40 && qa.exportCssHas72, `css40=${qa.exportCssHas40} css72=${qa.exportCssHas72}`);
    record('export-html-breaks-indent', qa.exportHasBreaks && qa.exportHasIndent, `breaks=${qa.exportHasBreaks} indent=${qa.exportHasIndent}`);
    record('export-docx', qa.docxBreaks && qa.docxIndent, `breaks=${qa.docxBreaks} indent=${qa.docxIndent}`);
    record('save-reload', qa.reloadOk, `reloadOk=${qa.reloadOk}`);
    record('parallel-mode', qa.parallelVisible, `parallelVisible=${qa.parallelVisible}`);
    record('paste-clause-count', qa.clauseCount >= 10, `clauses=${qa.clauseCount}`);

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
