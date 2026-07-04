#!/usr/bin/env node
/**
 * Backspace clause-merge verification (reverse of Enter).
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-contour-backspace.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
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
      typeof mergeClauseWithPrevious === 'function' &&
      typeof handleContourBackspace === 'function' &&
      typeof insertBreak === 'function',
    { timeout: 25000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(() => {
      function loadTwoWords() {
        ensureStateBundle();
        stateBundle.parallelEnabled = false;
        state = stateBundle.panes[0];
        parseText('אֶ֣לֶף בֵּ֑ית', 'Merge test', false, { skipRender: true });
        state.selected = { v: 0, c: 0, w: 1 };
        render();
      }

      loadTwoWords();
      insertBreak();
      const afterSplit = {
        clauses: state.verses[0].clauses.length,
        w0: state.verses[0].clauses[0].words.map((w) => w.text).join(' '),
        w1: state.verses[0].clauses[1].words.map((w) => w.text).join(' '),
      };

      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      const afterMerge = {
        clauses: state.verses[0].clauses.length,
        allWords: state.verses[0].clauses[0].words.map((w) => w.text).join(' '),
        selected: state.selected,
      };

      loadTwoWords();
      state.verses[0].clauses[0].words[1].format = { bold: true };
      state.verses[0].clauses[0].words[1].note = 'test note';
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      const w1 = state.verses[0].clauses[0].words[1];
      const metaPreserved = w1.format?.bold === true && w1.note === 'test note';

      loadTwoWords();
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.verses[0].clauses[0].indentPx = 30;
      state.verses[0].clauses[0].indent = 1;
      state.selected = { v: 0, c: 1, w: 1 };
      const clausesBefore = state.verses[0].clauses.length;
      handleContourBackspace();
      const insideNoMerge = state.verses[0].clauses.length === clausesBefore;

      loadTwoWords();
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      markUndo();
      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      const clausesMerged = state.verses[0].clauses.length === 1;
      undoLastChange();
      const undoRestored = state.verses[0].clauses.length === 2;

      loadTwoWords();
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      const open = makeTextAnchorFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: 0, w: 0 });
      const close = makeTextAnchorFromLocs({ v: 0, c: 1, w: 0 }, { v: 0, c: 1, w: 0 });
      state.inclusios = [
        {
          id: 'inc1',
          label: 'A',
          color: '#6B7280',
          openingAnchor: open,
          closingAnchor: close,
        },
      ];
      syncInclusioWordMarkers();
      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      syncInclusioWordMarkers();
      const incClose = anchorRangeOrdered(state.inclusios[0].closingAnchor);
      const inclusioRemapped =
        incClose &&
        incClose.start.v === 0 &&
        incClose.start.c === 0 &&
        incClose.start.w === 1;

      loadTwoWords();
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      const exportHtml = buildContourEditorHtmlFromState(true);
      const exportOneClause = (exportHtml.match(/class="clause/g) || []).length === 1;

      const payload = projectPayload();
      const savedClauses = payload.state.panes[0].verses[0].clauses.length;

      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText('אֶ֣לֶף\n\nבֵּ֑ית', 'Gap test', false, {
        skipRender: true,
        preserveLayout: true,
      });
      render();
      const gapBefore = {
        clauses: state.verses[0].clauses.length,
        spacingAfterPx: state.verses[0].clauses[0].spacingAfterPx || 0,
      };
      state.selected = { v: 0, c: 1, w: 0 };
      mergeClauseWithPrevious(state.selected);
      const gapAfter = {
        clauses: state.verses[0].clauses.length,
        spacingAfterPx: state.verses[0].clauses[0].spacingAfterPx || 0,
      };

      loadTwoWords();
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.selected = { v: 0, c: 1, w: 0 };
      render();
      focusContourEditor();
      return {
        afterSplit,
        afterMerge,
        metaPreserved,
        insideNoMerge,
        clausesMerged,
        undoRestored,
        inclusioRemapped,
        exportOneClause,
        savedClauses,
        gapBefore,
        gapAfter,
      };
    });

    record(
      'layout-gap-cleared',
      unit.gapBefore.clauses === 2 &&
        unit.gapBefore.spacingAfterPx > 0 &&
        unit.gapAfter.clauses === 1 &&
        unit.gapAfter.spacingAfterPx === 0,
      `before sp=${unit.gapBefore.spacingAfterPx} clauses=${unit.gapBefore.clauses}, after sp=${unit.gapAfter.spacingAfterPx} clauses=${unit.gapAfter.clauses}`
    );

    await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText('אֶ֣לֶף בֵּ֑ית', 'Keyboard', false, { skipRender: true });
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.selected = { v: 0, c: 1, w: 0 };
      render();
    });
    await page.click('.word[data-v="0"][data-c="1"][data-w="0"]');
    await page.keyboard.press('Backspace');
    const keyboardMerge = await page.evaluate(() => ({
      clauses: state.verses[0].clauses.length,
      focused: document.activeElement?.id || document.activeElement?.tagName,
    }));
    record(
      'keyboard-merge',
      keyboardMerge.clauses === 1 && keyboardMerge.focused === 'editorWrap',
      `clauses=${keyboardMerge.clauses}, focus=${keyboardMerge.focused}`
    );

    await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText('א ב', 'Blocked', false, { skipRender: true });
      state.selected = { v: 0, c: 0, w: 1 };
      insertBreak();
      state.selected = { v: 0, c: 1, w: 0 };
      render();
    });
    await page.click('.word[data-v="0"][data-c="1"][data-w="0"]');
    const input = page.locator('#modalInput');
    if (await input.count()) {
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => {
      const inp = document.querySelector('#inclusioThemeInput') || document.createElement('input');
      if (!inp.id) {
        inp.id = 'testFocusInput';
        document.body.appendChild(inp);
      }
      inp.focus();
    });
    await page.keyboard.press('Backspace');
    const blocked = await page.evaluate(() => state.verses[0].clauses.length);
    await page.click('.word[data-v="0"][data-c="1"][data-w="0"]');
    await page.keyboard.press('Backspace');
    const afterRefocus = await page.evaluate(() => state.verses[0].clauses.length);
    record(
      'focus-blocks-then-recovers',
      blocked === 2 && afterRefocus === 1,
      `input-focus kept=${blocked}, after word click=${afterRefocus}`
    );

    const unitRest = unit;

    record(
      'enter-split',
      unitRest.afterSplit.clauses === 2,
      `clauses=${unitRest.afterSplit.clauses}, a="${unitRest.afterSplit.w0}", b="${unitRest.afterSplit.w1}"`
    );
    record(
      'backspace-merge',
      unitRest.afterMerge.clauses === 1 && unitRest.afterMerge.allWords.includes('אֶ֣לֶף') && unitRest.afterMerge.allWords.includes('בֵּ֑ית'),
      `clauses=${unitRest.afterMerge.clauses}, words="${unitRest.afterMerge.allWords}"`
    );
    record('metadata-preserved', unitRest.metaPreserved, `bold+note kept=${unitRest.metaPreserved}`);
    record('inside-no-merge', unitRest.insideNoMerge, `mid-clause backspace did not merge=${unitRest.insideNoMerge}`);
    record('undo-restore', unitRest.clausesMerged && unitRest.undoRestored, `merged then undo restored=${unitRest.undoRestored}`);
    record('inclusio-remap', unitRest.inclusioRemapped, `closing anchor remapped=${unitRest.inclusioRemapped}`);
    record('export-single-line', unitRest.exportOneClause, `export has one clause=${unitRest.exportOneClause}`);

    const report = {
      feature: 'contour-backspace-merge',
      url: BASE,
      at: new Date().toISOString(),
      pass: results.every((r) => r.pass),
      results,
    };
    fs.writeFileSync('scripts/verify-contour-backspace-report.json', JSON.stringify(report, null, 2));
    console.log(`\n${report.pass ? 'ALL PASSED' : 'SOME FAILED'} (${results.filter((r) => r.pass).length}/${results.length})`);
    process.exit(report.pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
