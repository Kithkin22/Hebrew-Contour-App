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
      };
    });

    record(
      'enter-split',
      unit.afterSplit.clauses === 2,
      `clauses=${unit.afterSplit.clauses}, a="${unit.afterSplit.w0}", b="${unit.afterSplit.w1}"`
    );
    record(
      'backspace-merge',
      unit.afterMerge.clauses === 1 && unit.afterMerge.allWords.includes('אֶ֣לֶף') && unit.afterMerge.allWords.includes('בֵּ֑ית'),
      `clauses=${unit.afterMerge.clauses}, words="${unit.afterMerge.allWords}"`
    );
    record('metadata-preserved', unit.metaPreserved, `bold+note kept=${unit.metaPreserved}`);
    record('inside-no-merge', unit.insideNoMerge, `mid-clause backspace did not merge=${unit.insideNoMerge}`);
    record('undo-restore', unit.clausesMerged && unit.undoRestored, `merged then undo restored=${unit.undoRestored}`);
    record('inclusio-remap', unit.inclusioRemapped, `closing anchor remapped=${unit.inclusioRemapped}`);
    record('export-single-line', unit.exportOneClause, `export has one clause=${unit.exportOneClause}`);

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
