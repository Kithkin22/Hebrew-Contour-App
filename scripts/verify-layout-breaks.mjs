#!/usr/bin/env node
/**
 * Visual discourse breaks (spacingAfter) verification.
 * Run: node scripts/verify-layout-breaks.mjs
 * Optional: HC_VERIFY_URL=http://127.0.0.1:8080 node scripts/verify-layout-breaks.mjs
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
    () =>
      typeof normalizeSpacingAfter === 'function' &&
      typeof normalizeVerseSpacingAfter === 'function' &&
      typeof mergeVerseData === 'function' &&
      typeof buildContourEditorHtmlFromState === 'function',
    { timeout: 25000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(async () => {
      function loadSingleVerse() {
        ensureStateBundle();
        stateBundle.parallelEnabled = false;
        stateBundle.activePane = 0;
        state = stateBundle.panes[0];
        generatedRefs = ['Genesis 1:1'];
        state.ref = 'Genesis 1:1';
        state.language = 'hebrew';
        parseText('בְּרֵאשִׁית בָּרָא אֱלֹהִים', 'Genesis 1:1', false, { skipRender: true });
        state.selected = { v: 0, c: 0, w: 0 };
        render();
      }

      function clauseSpacing(v, c) {
        return state.verses[v].clauses[c].spacingAfter || 'default';
      }

      function editorClauseClass(v, c) {
        const el = document.querySelector(`#editor .clause[data-v="${v}"][data-c="${c}"]`);
        return el ? el.className : '';
      }

      loadSingleVerse();
      setSelectedClauseSpacingAfter('medium');
      const afterMedium = {
        data: clauseSpacing(0, 0),
        cls: editorClauseClass(0, 0),
      };

      setSelectedClauseSpacingAfter('default');
      const afterDefault = {
        data: clauseSpacing(0, 0),
        hasProp: Object.prototype.hasOwnProperty.call(state.verses[0].clauses[0], 'spacingAfter'),
        cls: editorClauseClass(0, 0),
      };

      setSelectedClauseSpacingAfter('large');
      const payload = projectPayload();
      const savedSpacing =
        payload.state.panes[0].verses[0].clauses[0].spacingAfter || 'default';

      const reloaded = JSON.parse(JSON.stringify(payload));
      stateBundle.panes[0] = extractPaneFromPayload(reloaded, 0).pane;
      state = stateBundle.panes[0];
      state.selected = { v: 0, c: 0, w: 0 };
      render();
      const afterReload = clauseSpacing(0, 0);

      setSelectedClauseSpacingAfter('small');
      const oldV = JSON.parse(JSON.stringify(state.verses[0]));
      const line = oldV.clauses.map((c) => c.words.map((w) => w.text).join(' ')).join(' ');
      const newV = {
        ref: oldV.ref,
        clauses: [
          {
            indent: 0,
            words: tokenizeClauseWords(line.trim().split(/\s+/).filter(Boolean), 'hebrew'),
            ann: {},
          },
        ],
      };
      mergeVerseData(oldV, newV);
      const afterMerge = newV.clauses[0].spacingAfter || 'default';

      ensureStateBundle();
      stateBundle.parallelEnabled = true;
      stateBundle.activePane = 0;
      const toggle = document.getElementById('parallelModeToggle');
      if (toggle) toggle.checked = true;
      stateBundle.panes[1] = freshPaneState();
      stateBundle.panes[1].language = 'hebrew';
      stateBundle.panes[1].verses = [
        {
          ref: 'Genesis 1:1',
          clauses: [
            {
              indent: 0,
              words: tokenizeClauseWords(['שָׁמַיִם', 'וָאָרֶץ'], 'hebrew'),
              ann: {},
            },
          ],
        },
      ];
      stateBundle.panes[0].verses[0].clauses[0].spacingAfter = 'medium';
      delete stateBundle.panes[1].verses[0].clauses[0].spacingAfter;
      bindActivePane(0);
      render();
      const pane0 = stateBundle.panes[0].verses[0].clauses[0].spacingAfter || 'default';
      const pane1 = stateBundle.panes[1].verses[0].clauses[0].spacingAfter || 'default';

      bindActivePane(0);
      state.selected = { v: 0, c: 0, w: 0 };
      setSelectedClauseSpacingAfter('medium');
      const exportHtml = buildContourEditorHtmlFromState(true);
      const docx = contourDocxXml();

      generatedRefs = ['Genesis 1:1', 'Genesis 1:2'];
      state.ref = 'Genesis 1:1-2';
      stateBundle.parallelEnabled = false;
      const toggle2 = document.getElementById('parallelModeToggle');
      if (toggle2) toggle2.checked = false;
      parseText('בְּרֵאשִׁית בָּרָא\nוְהָאָרֶץ הָיְתָה', 'Genesis 1:1-2', false, { skipRender: true });
      state.selected = { v: 0, c: 0, w: 0 };
      render();
      setSelectedVerseSpacingAfter('double');
      const verseAfterDouble = {
        data: state.verses[0].spacingAfter || 'default',
        cls: document.querySelector('#editor .verse-block[data-v="0"]')?.className || '',
      };
      setSelectedVerseSpacingAfter('default');
      const verseAfterDefault = {
        hasProp: Object.prototype.hasOwnProperty.call(state.verses[0], 'spacingAfter'),
      };
      setSelectedVerseSpacingAfter('oneHalf');
      const oldVerse = JSON.parse(JSON.stringify(state.verses[0]));
      const newVerse = JSON.parse(JSON.stringify(state.verses[0]));
      delete newVerse.spacingAfter;
      mergeVerseData(oldVerse, newVerse);
      const verseAfterMerge = newVerse.spacingAfter || 'default';
      const verseExportHtml = buildContourEditorHtmlFromState(true);
      const verseDocx = contourDocxXml();

      stateBundle.parallelEnabled = false;
      if (toggle2) toggle2.checked = false;
      state.selected = { v: 0, c: 0, w: 0 };
      render();
      if (!verseRefHidden(state.verses[0])) toggleSelectedVerseRefHidden();
      const hideRefEditor = !document.querySelector('#editor .verse-block[data-v="0"] .verse-ref');
      const hideRefExport = !buildContourEditorHtmlFromState(true).includes('Genesis 1:1');
      setAllVerseRefsHidden(false);
      setAllVerseRefsHidden(true);
      const hideAll = state.verses.every((v) => v.hideRef === true)
        && !document.querySelector('#editor .verse-ref');
      setAllVerseRefsHidden(false);
      const oldVerseHide = JSON.parse(JSON.stringify(state.verses[0]));
      oldVerseHide.hideRef = true;
      const newVerseHide = JSON.parse(JSON.stringify(state.verses[0]));
      delete newVerseHide.hideRef;
      mergeVerseData(oldVerseHide, newVerseHide);

      return {
        afterMedium,
        afterDefault,
        savedSpacing,
        afterReload,
        afterMerge,
        pane0,
        pane1,
        exportHasClass: exportHtml.includes('layout-break-md'),
        docxHasSpacing: docx.includes('w:spacing w:after="480"'),
        wordsUnchanged:
          state.verses[0].clauses[0].words.length > 0 &&
          !state.verses[0].clauses.some((c) => c.words.some((w) => w.text === '')),
        verseAfterDouble,
        verseAfterDefault,
        verseAfterMerge,
        verseExportHasClass: verseExportHtml.includes('verse-spacing-oneHalf'),
        verseDocxHasSpacing: verseDocx.includes('w:spacing w:after="720"'),
        hideRefEditor,
        hideAll,
        hideRefMerge: newVerseHide.hideRef === true,
      };
    });

    record(
      'set-medium',
      unit.afterMedium.data === 'medium' && unit.afterMedium.cls.includes('layout-break-md'),
      `spacingAfter=${unit.afterMedium.data}, class=${unit.afterMedium.cls}`
    );
    record(
      'clear-default',
      unit.afterDefault.data === 'default' &&
        !unit.afterDefault.hasProp &&
        !unit.afterDefault.cls.includes('layout-break'),
      `spacingAfter=${unit.afterDefault.data}, hasProp=${unit.afterDefault.hasProp}`
    );
    record(
      'save-reload',
      unit.savedSpacing === 'large' && unit.afterReload === 'large',
      `saved=${unit.savedSpacing}, reloaded=${unit.afterReload}`
    );
    record(
      'merge-verse',
      unit.afterMerge === 'small',
      `spacingAfter after mergeVerseData=${unit.afterMerge}`
    );
    record(
      'parallel-independent',
      unit.pane0 === 'medium' && unit.pane1 === 'default',
      `pane0=${unit.pane0}, pane1=${unit.pane1}`
    );
    record('pdf-html-export', unit.exportHasClass, `export HTML has layout-break-md=${unit.exportHasClass}`);
    record('docx-export', unit.docxHasSpacing, `DOCX has w:spacing after medium=${unit.docxHasSpacing}`);
    record('words-unchanged', unit.wordsUnchanged, `words[] not modified by spacingAfter=${unit.wordsUnchanged}`);
    record(
      'verse-set-double',
      unit.verseAfterDouble.data === 'double' && unit.verseAfterDouble.cls.includes('verse-spacing-double'),
      `verse spacingAfter=${unit.verseAfterDouble.data}, class=${unit.verseAfterDouble.cls}`
    );
    record(
      'verse-clear-default',
      !unit.verseAfterDefault.hasProp,
      `verse spacingAfter property removed=${!unit.verseAfterDefault.hasProp}`
    );
    record(
      'verse-merge',
      unit.verseAfterMerge === 'oneHalf',
      `verse spacingAfter after mergeVerseData=${unit.verseAfterMerge}`
    );
    record(
      'verse-export-html',
      unit.verseExportHasClass,
      `export HTML has verse-spacing-oneHalf=${unit.verseExportHasClass}`
    );
    record(
      'verse-docx',
      unit.verseDocxHasSpacing,
      `DOCX has verse w:spacing 720 twips=${unit.verseDocxHasSpacing}`
    );
    record('hide-verse-ref', unit.hideRefEditor, `contour editor hides selected verse ref=${unit.hideRefEditor}`);
    record('hide-all-verse-refs', unit.hideAll, `hide all verse refs in pane=${unit.hideAll}`);
    record('hide-ref-merge', unit.hideRefMerge, `mergeVerseData preserves hideRef=${unit.hideRefMerge}`);

    const report = {
      feature: 'layout-breaks',
      url: BASE,
      at: new Date().toISOString(),
      pass: results.every((r) => r.pass),
      results,
    };
    fs.writeFileSync('scripts/verify-layout-breaks-report.json', JSON.stringify(report, null, 2));
    console.log(`\n${report.pass ? 'ALL PASSED' : 'SOME FAILED'} (${results.filter((r) => r.pass).length}/${results.length})`);
    process.exit(report.pass ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
