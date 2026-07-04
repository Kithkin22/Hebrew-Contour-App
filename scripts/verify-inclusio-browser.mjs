#!/usr/bin/env node
/**
 * Inclusio end-to-end browser verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-inclusio-browser.mjs
 */
import { chromium } from 'playwright';

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
    () => typeof setInclusioAnchor === 'function' && typeof addInclusio === 'function',
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
      generatedRefs = ['Ruth 1:1', 'Ruth 1:2'];
      state.ref = 'Ruth 1:1-2';
      state.language = 'hebrew';
      parseText('וַיְהִי בִּימֵי שְׁפֹט\nוַיֵּלֶךְ אִישׁ', 'Ruth 1:1-2', false, { skipRender: true });
      state.selected = { v: 0, c: 0, w: 0 };
      render();

      addInclusio();
      state.selected = { v: 0, c: 0, w: 0 };
      setInclusioAnchor('opening');
      state.selected = { v: 1, c: 0, w: 0 };
      setInclusioAnchor('closing');

      const afterSet = {
        hasOpening: !!state.inclusios[0]?.openingAnchor,
        hasClosing: !!state.inclusios[0]?.closingAnchor,
        bracketStart: !!document.querySelector('#editor .word.bracket-start'),
        bracketEnd: !!document.querySelector('#editor .word.bracket-end'),
        frameRails: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail').length,
      };

      const payload = projectPayload();
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      clearInclusioWordMarkers();
      state.selected = { v: 0, c: 0, w: 0 };
      render();

      const afterReload = {
        hasOpening: !!state.inclusios[0]?.openingAnchor,
        hasClosing: !!state.inclusios[0]?.closingAnchor,
        bracketStart: !!document.querySelector('#editor .word.bracket-start'),
        bracketEnd: !!document.querySelector('#editor .word.bracket-end'),
      };

      const exportHtml = buildContourEditorHtmlFromState(true);
      const docx = typeof contourDocxXml === 'function' ? contourDocxXml() : '';
      const registry = document.getElementById('inclusioRegistry')?.textContent || '';

      return { afterSet, afterReload, exportHasBrackets: exportHtml.includes('bracket-start'), docxOk: docx.includes('Inclusios'), registryHasRow: registry.includes('Inclusio') };
    });

    const regen = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      clearInclusioWordMarkers();
      const open = makeTextAnchorFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: 0, w: 0 });
      const close = makeTextAnchorFromLocs({ v: 0, c: 0, w: 2 }, { v: 0, c: 0, w: 2 });
      state.inclusios = [{ id: 'inc1', label: 'Test', color: '#315efb', openingAnchor: open, closingAnchor: close }];
      render();
      return {
        wordHasMarker: !!state.verses[0].clauses[0].words[0].bracketStart,
        domHasBracket: !!document.querySelector('#editor .word.bracket-start'),
      };
    });

    record('set-anchors', unit.afterSet.hasOpening && unit.afterSet.hasClosing, `opening=${unit.afterSet.hasOpening}, closing=${unit.afterSet.hasClosing}`);
    record('render-after-set', unit.afterSet.bracketStart && unit.afterSet.bracketEnd, `brackets visible after set=${unit.afterSet.bracketStart && unit.afterSet.bracketEnd}`);
    record('margin-envelope', unit.afterSet.frameRails >= 2, `frameRails=${unit.afterSet.frameRails}`);
    record('reload-data', unit.afterReload.hasOpening && unit.afterReload.hasClosing, `anchors in state after reload=${unit.afterReload.hasOpening && unit.afterReload.hasClosing}`);
    record('render-after-reload', unit.afterReload.bracketStart && unit.afterReload.bracketEnd, `brackets visible after reload=${unit.afterReload.bracketStart && unit.afterReload.bracketEnd}`);
    record('export-html', unit.exportHasBrackets, `export HTML has bracket-start=${unit.exportHasBrackets}`);
    record('export-docx', unit.docxOk, `DOCX mentions Inclusios=${unit.docxOk}`);
    record('registry', unit.registryHasRow, `legend registry lists inclusio=${unit.registryHasRow}`);
    record(
      'sync-from-data-only',
      regen.wordHasMarker && regen.domHasBracket,
      `markers on words=${regen.wordHasMarker}, DOM brackets=${regen.domHasBracket}`
    );

    const draw = await page.evaluate(() => {
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      parseText('אֶ֣לֶף בֵּ֑ית גִּמֶל\nדָּלֶת הֵא', 'Draw test', false, { skipRender: true });
      state.inclusios = [];
      state.activeInclusioId = null;
      clearInclusioWordMarkers();
      render();

      const item = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 1, c: 0, w: 0 });
      render();

      const nested = addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: 0, w: 2 });
      render();

      toggleDrawArcMode(true);
      const arcOn = window.arcDraw && window.arcDraw.active;
      toggleDrawInclusioMode(true);
      const arcOff = !(window.arcDraw && window.arcDraw.active);
      const incOn = inclusioDraw.active;
      toggleDrawInclusioMode(false);
      toggleDrawArcMode(false);

      const noTitle = !document.querySelector('#contourPassageTitle .contour-passage-title-text');
      state.ref = '';
      state.verses[0].ref = '';
      syncContourPassageTitle();
      const pastedHidden = document.getElementById('contourPassageTitle')?.hidden !== false;

      return {
        drawn: !!item && !!item.openingAnchor && !!item.closingAnchor,
        rails: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail:not(.inclusio-frame-rail-preview)').length,
        registry: (document.getElementById('inclusioRegistry')?.textContent || '').includes('Inclusio'),
        nestedOk: state.inclusios.length === 2,
        arcMutual: arcOn && arcOff && incOn,
        pastedHidden,
        noPlaceholderTitle: noTitle || pastedHidden,
      };
    });

    record('draw-from-locs', draw.drawn, `addInclusioFromLocs created=${draw.drawn}`);
    record('draw-frame-rails', draw.rails >= 2, `frameRails=${draw.rails}`);
    record('draw-registry', draw.registry, `legend lists drawn inclusio=${draw.registry}`);
    record('nested-draw', draw.nestedOk, `nested count=${draw.nestedOk}`);
    record('arc-mutual-exclusion', draw.arcMutual, `arc/inclusio draw modes exclusive=${draw.arcMutual}`);
    record('no-pasted-passage-title', draw.noPlaceholderTitle, `placeholder title hidden=${draw.noPlaceholderTitle}`);

    const margin = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText('אֶ֣לֶף בֵּ֑ית גִּמֶל דָּלֶת', 'Margin test', false, { skipRender: true });
      state.inclusios = [];
      clearInclusioWordMarkers();
      addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: 0, w: 3 });
      render();
      const ed = document.getElementById('editor');
      const word = document.querySelector('#editor .word[data-v="0"][data-c="0"][data-w="1"]');
      const rail = document.querySelector('#editor svg.inclusio-frame-svg line.inclusio-frame-rail');
      if (!ed || !word || !rail) return { ok: false, reason: 'missing elements' };
      const wBox = word.getBoundingClientRect();
      const x1 = +rail.getAttribute('x1');
      const x2 = +rail.getAttribute('x2');
      const railLeft = Math.min(x1, x2);
      const railRight = Math.max(x1, x2);
      const edRect = ed.getBoundingClientRect();
      const scale = typeof getArcOverlayScale === 'function' ? getArcOverlayScale() : 1;
      const railScreenL = edRect.left + railLeft * scale;
      const railScreenR = edRect.left + railRight * scale;
      const clearsText = railScreenR <= wBox.left || railScreenL >= wBox.right;
      const noSpanWash = !document.querySelector('#editor .word.inclusio-span');
      const gutter = ed.classList.contains('has-inclusio-frames');
      const hiddenBrackets = !getComputedStyle(word, '::before').content || getComputedStyle(word, '::before').content === 'none';
      return { ok: clearsText && noSpanWash && gutter, clearsText, noSpanWash, gutter, rails: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail').length };
    });
    record('margin-clears-text', margin.ok, `clears=${margin.clearsText}, noSpan=${margin.noSpanWash}, gutter=${margin.gutter}, rails=${margin.rails}`);

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
