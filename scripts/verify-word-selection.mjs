#!/usr/bin/env node
/**
 * Word selection clear — click whitespace / Escape deselects without removing annotations.
 * Run: node scripts/verify-word-selection.mjs
 * Optional: HC_VERIFY_URL=https://hebrew-contour-app.vercel.app node scripts/verify-word-selection.mjs
 */
import { chromium } from 'playwright';

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
      typeof clearWordSelection === 'function' &&
      typeof parseText === 'function' &&
      typeof render === 'function',
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
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = ['Job 19:21'];
      state.ref = 'Job 19:21';
      state.language = 'hebrew';
      parseText('מִי יִתֵּן', 'Job 19:21', false, { skipRender: true });
      state.verses[0].clauses[0].words[0].format = { highlight: '#fff36d' };
      state.comments = [{
        id: 'comment-1',
        start: { v: 0, c: 0, w: 0 },
        end: { v: 0, c: 0, w: 0 },
        text: 'Test comment',
        createdAt: new Date().toISOString(),
      }];
      state.inclusios = [{
        id: 'inc-1',
        label: 'Test inclusio',
        openingAnchor: { v: 0, c: 0, w: 0, normalizedText: 'מִי' },
        closingAnchor: { v: 0, c: 0, w: 0, normalizedText: 'מִי' },
        showMarginEnvelope: true,
      }];
      state.arcs = [{
        id: 'arc-1',
        start: { v: 0, c: 0, w: 0 },
        end: { v: 0, c: 0, w: 0 },
        color: '#0b61d8',
        label: 'Test arc',
      }];
      if (typeof syncInclusioWordMarkers === 'function') syncInclusioWordMarkers(state);
      state.selected = { v: 0, c: 0, w: 0 };
      render();
      return {
        selectedAfterPick: !!document.querySelector('#editor .word.selected'),
        highlightBefore: !!document.querySelector('#editor .word.fmt-highlight'),
        commentCount: state.comments.length,
        inclusioCount: state.inclusios.length,
        arcCount: state.arcs.length,
      };
    });

    record('select-word', unit.selectedAfterPick, `selected=${unit.selectedAfterPick}`);

    await page.locator('#editorWrap').click({ position: { x: 24, y: 24 } });
    await page.waitForTimeout(80);
    const clearedByClick = await page.evaluate(
      () => !document.querySelector('#editor .word.selected') && !locOK(state.selected)
    );
    record('click-whitespace', clearedByClick, `cleared=${clearedByClick}`);

    await page.evaluate(() => {
      state.selected = { v: 0, c: 0, w: 0 };
      render();
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    const afterEsc = await page.evaluate(() => ({
      clearedByEsc: !document.querySelector('#editor .word.selected') && !locOK(state.selected),
      inspectorReset: (document.getElementById('wiWord')?.textContent || '—') === '—',
      highlightAfter: !!document.querySelector('#editor .word.fmt-highlight'),
      commentsAfter: state.comments.length,
      inclusiosAfter: state.inclusios.length,
      arcsAfter: state.arcs.length,
    }));

    record('escape-key', afterEsc.clearedByEsc, `cleared=${afterEsc.clearedByEsc}`);
    record('inspector-reset', afterEsc.inspectorReset, `wiWord placeholder=${afterEsc.inspectorReset}`);
    record('highlight-kept', unit.highlightBefore && afterEsc.highlightAfter, `highlight preserved=${afterEsc.highlightAfter}`);
    record('comments-kept', unit.commentCount === afterEsc.commentsAfter && unit.commentCount === 1, `comments=${afterEsc.commentsAfter}`);
    record('inclusios-kept', unit.inclusioCount === afterEsc.inclusiosAfter && unit.inclusioCount === 1, `inclusios=${afterEsc.inclusiosAfter}`);
    record('arcs-kept', unit.arcCount === afterEsc.arcsAfter && unit.arcCount === 1, `arcs=${afterEsc.arcsAfter}`);

    const fail = results.filter((r) => !r.pass).length;
    console.log(`\n${fail ? 'SOME FAILED' : 'ALL PASSED'} (${results.length - fail}/${results.length})`);
    process.exit(fail ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
