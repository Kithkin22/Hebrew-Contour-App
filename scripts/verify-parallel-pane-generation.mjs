#!/usr/bin/env node
/**
 * Parallel pane generation independence checks.
 * Run: node scripts/verify-parallel-pane-generation.mjs
 * Optional: HC_VERIFY_URL=http://127.0.0.1:8080 node scripts/verify-parallel-pane-generation.mjs
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
    () => typeof applyPaneReferenceFromInput === 'function' && typeof getWlcText === 'function',
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
      function paneRef(st) {
        return (st && st.ref) || '';
      }
      function firstWord(st) {
        const v = st && st.verses && st.verses[0];
        const w = v && v.clauses && v.clauses[0] && v.clauses[0].words && v.clauses[0].words[0];
        return (w && w.text) || '';
      }
      function resetParallel() {
        stateBundle = {
          parallelEnabled: true,
          activePane: 0,
          crossArcs: [],
          verseAlignPairs: null,
          generatedRefsByPane: [[], []],
          panes: [freshPaneState(), freshPaneState()],
        };
        state = stateBundle.panes[0];
        generatedRefs = [];
        versePairPick = null;
        const toggle = document.getElementById('parallelModeToggle');
        if (toggle) toggle.checked = true;
      }

      async function loadPaneWlc(pane, refStr) {
        const parsed = parseBibleReference(refStr);
        const verses = getWlcText(parsed.bookId, parsed.sc, parsed.sv, parsed.ec, parsed.ev);
        const refs = verses.map((v) => parsed.bookName + ' ' + v.chapter + ':' + v.verse);
        const text = verses.map((v) => v.text).join('\n');
        const rangeRef = formatPassageRangeRef(
          parsed.bookName,
          parsed.sc,
          parsed.sv,
          parsed.ec,
          parsed.ev
        );
        await runWithPaneAsync(pane, async () => {
          state.language = 'hebrew';
          generatedRefs = refs;
          stateBundle.generatedRefsByPane[pane] = refs;
          parseText(text, rangeRef, false, { skipRender: true });
        });
      }

      resetParallel();

      // Sequence: left Ruth, right Job, left Psalm — right must keep Job
      await loadPaneWlc(0, 'Ruth 1:1-5');
      const afterRuth = {
        left: paneRef(stateBundle.panes[0]),
        right: paneRef(stateBundle.panes[1]),
        sameObject: stateBundle.panes[0] === stateBundle.panes[1],
      };

      await loadPaneWlc(1, 'Job 19:21-27');
      const afterJob = {
        left: paneRef(stateBundle.panes[0]),
        right: paneRef(stateBundle.panes[1]),
        leftFirst: firstWord(stateBundle.panes[0]),
        rightFirst: firstWord(stateBundle.panes[1]),
        sameObject: stateBundle.panes[0] === stateBundle.panes[1],
      };

      await loadPaneWlc(0, 'Psalm 73:23-26');
      const afterPsalm = {
        left: paneRef(stateBundle.panes[0]),
        right: paneRef(stateBundle.panes[1]),
        sameObject: stateBundle.panes[0] === stateBundle.panes[1],
      };

      // Reverse order: right first, then left
      resetParallel();
      await loadPaneWlc(1, 'Job 19:21-27');
      await loadPaneWlc(0, 'Ruth 1:1-5');
      const reverse = {
        left: paneRef(stateBundle.panes[0]),
        right: paneRef(stateBundle.panes[1]),
        sameObject: stateBundle.panes[0] === stateBundle.panes[1],
      };

      // Desync guard: activePane=1 while state points at pane 0 must not alias panes
      resetParallel();
      await loadPaneWlc(0, 'Ruth 1:1-5');
      await loadPaneWlc(1, 'Job 19:21-27');
      const ruthFirst = firstWord(stateBundle.panes[0]);
      stateBundle.activePane = 1;
      state = stateBundle.panes[0];
      syncStateBundle();
      const desyncGuard = {
        sameObject: stateBundle.panes[0] === stateBundle.panes[1],
        leftFirst: firstWord(stateBundle.panes[0]),
        rightFirst: firstWord(stateBundle.panes[1]),
        rightRef: paneRef(stateBundle.panes[1]),
      };

      return { afterRuth, afterJob, afterPsalm, reverse, desyncGuard, ruthFirst };
    });

    record(
      'pane-objects-distinct-after-ruth',
      !unit.afterRuth.sameObject,
      `sameObject=${unit.afterRuth.sameObject}`
    );
    record(
      'left-ruth-right-job',
      unit.afterJob.left.includes('Ruth') &&
        unit.afterJob.right.includes('Job') &&
        !unit.afterJob.sameObject,
      `left=${unit.afterJob.left} right=${unit.afterJob.right}`
    );
    record(
      'left-psalm-right-still-job',
      unit.afterPsalm.left.includes('Psalm') && unit.afterPsalm.right.includes('Job'),
      `left=${unit.afterPsalm.left} right=${unit.afterPsalm.right}`
    );
    record(
      'reverse-order-independent',
      unit.reverse.left.includes('Ruth') && unit.reverse.right.includes('Job'),
      `left=${unit.reverse.left} right=${unit.reverse.right}`
    );
    record(
      'desync-does-not-alias-panes',
      !unit.desyncGuard.sameObject &&
        unit.desyncGuard.leftFirst === unit.ruthFirst &&
        unit.desyncGuard.rightRef.includes('Job'),
      `sameObject=${unit.desyncGuard.sameObject} right=${unit.desyncGuard.rightRef}`
    );

    // UI path: parallel ref inputs via applyPaneReferenceFromInput
    await page.evaluate(() => {
      stateBundle = {
        parallelEnabled: true,
        activePane: 0,
        crossArcs: [],
        verseAlignPairs: null,
        generatedRefsByPane: [[], []],
        panes: [freshPaneState(), freshPaneState()],
      };
      state = stateBundle.panes[0];
      generatedRefs = [];
      const toggle = document.getElementById('parallelModeToggle');
      if (toggle) toggle.checked = true;
    });

    await page.evaluate(() => applyPaneReferenceFromInput(0, 'Ruth 1:1-5'));
    await page.waitForTimeout(300);
    await page.evaluate(() => applyPaneReferenceFromInput(1, 'Job 19:21-27'));
    await page.waitForTimeout(300);
    await page.evaluate(() => applyPaneReferenceFromInput(0, 'Psalm 73:23-26'));
    await page.waitForTimeout(300);

    const ui = await page.evaluate(() => ({
      left: stateBundle.panes[0].ref || '',
      right: stateBundle.panes[1].ref || '',
      sameObject: stateBundle.panes[0] === stateBundle.panes[1],
    }));

    record(
      'ui-applyPaneReference-sequence',
      ui.left.includes('Psalm') && ui.right.includes('Job') && !ui.sameObject,
      `left=${ui.left} right=${ui.right}`
    );
  } catch (err) {
    record('runner', false, String(err.message || err));
  } finally {
    await browser.close();
  }

  const fail = results.filter((r) => !r.pass);
  const report = {
    pass: results.filter((r) => r.pass).length,
    fail: fail.length,
    failures: fail,
    results,
  };
  fs.writeFileSync('scripts/verify-parallel-pane-generation-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, fail: report.fail }, null, 2));
  process.exit(fail.length ? 1 : 0);
}

main();
