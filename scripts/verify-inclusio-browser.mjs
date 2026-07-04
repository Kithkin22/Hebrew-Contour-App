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
        editorBracket: !!document.querySelector('#editor .word.bracket-start'),
        bracketStart: !!document.querySelector('#editor .word.bracket-start'),
        bracketEnd: !!document.querySelector('#editor .word.bracket-end'),
        wordBox: !!document.querySelector('#editor .word.inclusio-anchor-active, #editor .word.inclusio-registry-hover'),
        frameRails: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail').length,
        endcaps: document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-endcap').length,
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

      return { afterSet, afterReload, exportHasBrackets: exportHtml.includes('bracket-start'), docxOk: docx.includes('Units'), registryHasRow: registry.includes('Unit') };
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
    record('render-after-set', !unit.afterSet.editorBracket && unit.afterSet.frameRails >= 2 && !unit.afterSet.wordBox, `editorBracket=${unit.afterSet.editorBracket}, rails=${unit.afterSet.frameRails}, wordBox=${unit.afterSet.wordBox}`);
    record('margin-envelope', unit.afterSet.frameRails >= 2, `frameRails=${unit.afterSet.frameRails}`);
    record(
      'no-midline-prongs',
      unit.afterSet.endcaps === 4,
      `endcaps=${unit.afterSet.endcaps} (expect 4 per single frame)`
    );
    record('reload-data', unit.afterReload.hasOpening && unit.afterReload.hasClosing, `anchors in state after reload=${unit.afterReload.hasOpening && unit.afterReload.hasClosing}`);
    record('render-after-reload', !unit.afterReload.bracketStart && !unit.afterReload.bracketEnd, `no editor brackets after reload=${!unit.afterReload.bracketStart}`);
    record('export-html', unit.exportHasBrackets, `export HTML has bracket-start=${unit.exportHasBrackets}`);
    record('export-docx', unit.docxOk, `DOCX mentions Units=${unit.docxOk}`);
    record('registry', unit.registryHasRow, `legend registry lists unit=${unit.registryHasRow}`);
    record(
      'sync-from-data-only',
      regen.wordHasMarker && !regen.domHasBracket,
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
        registry: (document.getElementById('inclusioRegistry')?.textContent || '').includes('Unit'),
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

    const nestedRails = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText(
        'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י\n'
        + 'כִּ֤י יַ֣ד אֱל֙וֹהַּ נָ֣גְעָ֔ה בִּ֔י\n'
        + 'וּֽמִצְפִּ֥י וְאֵ֖לֶף אֲשֶׁר־בְּעַ֣ד תְּרִיעֽוּנִי׃\n'
        + 'לָ֤מָּה אַתֶּ֨ם רֹדְפִ֥ים כְּאֵ֗ל\n'
        + 'וּמִבְּשָׂרִ֥י לֹֽא־תִשְׂבָּֽעוּ׃\n'
        + 'מִֽי־יִתֵּ֣ן וְאֵיכָ֣כָה וְגוֹ׃\n'
        + 'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י',
        'Job 19:21–27',
        false,
        { preserveLayout: true, skipRender: true }
      );
      state.inclusios = [];
      clearInclusioWordMarkers();
      const lastC = state.verses[0].clauses.length - 1;
      addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
      addInclusioFromLocs({ v: 0, c: 2, w: 0 }, { v: 0, c: Math.min(4, lastC), w: 0 });
      render();
      let nestLevels = [0, 0];
      if (typeof computeInclusioNestLevels === 'function') {
        nestLevels = computeInclusioNestLevels(state.inclusios, state.verses).map((s) => s.inc.nestLevel);
      } else {
        nestLevels = state.inclusios.map(() => 0);
      }
      const maxNest = nestLevels.reduce((m, n) => Math.max(m, n), 0);
      const rails = [...document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail:not(.inclusio-frame-rail-preview)')];
      const byInc = {};
      rails.forEach((line) => {
        const id = line.getAttribute('data-inc-id') || '';
        const x1 = +line.getAttribute('x1');
        const x2 = +line.getAttribute('x2');
        const x = Math.abs(x2 - x1) < 0.01 ? x1 : null;
        if (x == null) return;
        if (!byInc[id]) byInc[id] = { xs: [] };
        byInc[id].xs.push(x);
      });
      const ids = Object.keys(byInc);
      if (ids.length < 2) return { ok: false, reason: 'need two frames', maxNest, nestLevels };
      const sets = ids.map((id) => ({
        id,
        xL: Math.min(...byInc[id].xs),
        xR: Math.max(...byInc[id].xs),
      }));
      sets.sort((a, b) => a.xL - b.xL);
      const outer = sets[0];
      const inner = sets[1];
      const minGap = (window.INCLUSIO_UNIT_FRAME && window.INCLUSIO_UNIT_FRAME.nestRailGap) || 20;
      const leftGap = inner.xL - outer.xL;
      const rightGap = outer.xR - inner.xR;
      const separated = leftGap >= minGap * 0.75 && rightGap >= minGap * 0.75;
      return {
        ok: separated && maxNest >= 1,
        leftGap,
        rightGap,
        minGap,
        maxNest,
        nestLevels,
        outer,
        inner,
      };
    });
    record(
      'nested-rail-separation',
      nestedRails.ok,
      `leftGap=${nestedRails.leftGap?.toFixed?.(1)}, rightGap=${nestedRails.rightGap?.toFixed?.(1)}, nest=${nestedRails.nestLevels}, maxNest=${nestedRails.maxNest}`
    );

    const anchorAlign = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText(
        'אֶ֣לֶף בֵּ֑ית גִּמֶל דָּלֶת\n'
        + 'הֵא וָו זַיִן\n'
        + 'חֵת טֵת יוֹד\n'
        + 'כָּף לָמֶד מֵם\n'
        + 'נוּן סָמֶךְ עַיִן',
        'Anchor align test',
        false,
        { preserveLayout: true, skipRender: true }
      );
      state.inclusios = [];
      clearInclusioWordMarkers();
      const openLoc = { v: 0, c: 1, w: 0 };
      const closeLoc = { v: 0, c: 3, w: 0 };
      addInclusioFromLocs(openLoc, closeLoc);
      render();
      const ed = document.getElementById('editor');
      const openWord = document.querySelector('.word[data-v="0"][data-c="1"][data-w="0"]');
      const closeWord = document.querySelector('.word[data-v="0"][data-c="3"][data-w="0"]');
      const firstClause = document.querySelector('.clause[data-v="0"][data-c="0"]');
      const rails = [...document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail:not(.inclusio-frame-rail-preview)')];
      const vertical = rails.filter((l) => Math.abs(+l.getAttribute('x2') - +l.getAttribute('x1')) < 0.01);
      if (!ed || !openWord || !closeWord || !vertical.length) {
        return { ok: false, reason: 'missing elements' };
      }
      const scale = typeof getArcOverlayScale === 'function' ? getArcOverlayScale() : 1;
      const er = ed.getBoundingClientRect();
      const openTop = (openWord.getBoundingClientRect().top - er.top) / scale;
      const closeBottom = (closeWord.getBoundingClientRect().bottom - er.top) / scale;
      const clauseTop = firstClause
        ? (firstClause.getBoundingClientRect().top - er.top) / scale
        : openTop;
      const y1 = Math.min(...vertical.map((l) => +l.getAttribute('y1')));
      const y2 = Math.max(...vertical.map((l) => +l.getAttribute('y2')));
      const anchorPad = (window.INCLUSIO_UNIT_FRAME && window.INCLUSIO_UNIT_FRAME.anchorPad) || 10;
      const startsNearOpen = y1 <= openTop - anchorPad * 0.5 && y1 >= openTop - anchorPad * 1.75;
      const endsNearClose = y2 >= closeBottom + anchorPad * 0.5 && y2 <= closeBottom + anchorPad * 1.75;
      const shorterThanFullPassage = y1 > clauseTop + 2;
      return {
        ok: startsNearOpen && endsNearClose && shorterThanFullPassage,
        y1,
        y2,
        openTop,
        closeBottom,
        clauseTop,
        anchorPad,
        startsNearOpen,
        endsNearClose,
        shorterThanFullPassage,
      };
    });
    record(
      'anchor-vertical-align',
      anchorAlign.ok,
      `y1=${anchorAlign.y1?.toFixed?.(1)}, openTop=${anchorAlign.openTop?.toFixed?.(1)}, y2=${anchorAlign.y2?.toFixed?.(1)}, closeBottom=${anchorAlign.closeBottom?.toFixed?.(1)}`
    );

    const colorManual = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText('אֶ֣לֶף בֵּ֑ית גִּמֶל', 'Color test', false, { skipRender: true });
      state.inclusios = [];
      addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: 0, w: 2 });
      const item = state.inclusios[0];
      item.color = '#6B7355';
      item.colorManual = true;
      render();
      const stroke = document.querySelector('#editor svg.inclusio-frame-svg line.inclusio-frame-rail')?.getAttribute('stroke');
      const payload = projectPayload();
      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      render();
      const strokeAfter = document.querySelector('#editor svg.inclusio-frame-svg line.inclusio-frame-rail')?.getAttribute('stroke');
      const registry = document.getElementById('inclusioRegistry')?.innerHTML || '';
      return {
        ok: stroke === '#6b7355' || stroke === '#6B7355',
        reloadOk: strokeAfter === '#6b7355' || strokeAfter === '#6B7355',
        manual: !!state.inclusios[0]?.colorManual,
        registryHasSwatch: registry.includes('#6B7355') || registry.includes('#6b7355'),
      };
    });
    record(
      'manual-color-persist',
      colorManual.ok && colorManual.reloadOk && colorManual.manual,
      `stroke=${colorManual.ok}, reload=${colorManual.reloadOk}, registry=${colorManual.registryHasSwatch}`
    );

    const horizontalBalance = await page.evaluate(() => {
      ensureStateBundle();
      state = stateBundle.panes[0];
      parseText(
        'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י\n'
        + 'כִּ֤י יַ֣ד אֱל֙וֹהַּ נָ֣גְעָ֔ה בִּ֔י\n'
        + 'וּֽמִצְפִּ֥י וְאֵ֖לֶף אֲשֶׁר־בְּעַ֣ד תְּרִיעֽוּנִי׃\n'
        + 'לָ֤מָּה אַתֶּ֨ם רֹדְפִ֥ים כְּאֵ֗ל\n'
        + 'וּמִבְּשָׂרִ֥י לֹֽא־תִשְׂבָּֽעוּ׃\n'
        + 'מִֽי־יִתֵּ֣ן וְאֵיכָ֣כָה וְגוֹ׃\n'
        + 'חָנֵּ֥נִי חָנֵּ֥נִי אַתֶּ֥ם רֵעָ֑י',
        'Job 19:21–27',
        false,
        { preserveLayout: true, skipRender: true }
      );
      state.inclusios = [];
      clearInclusioWordMarkers();
      const lastC = state.verses[0].clauses.length - 1;
      addInclusioFromLocs({ v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 0 });
      render();
      const ed = document.getElementById('editor');
      const scale = typeof getArcOverlayScale === 'function' ? getArcOverlayScale() : 1;
      const er = ed.getBoundingClientRect();
      const words = [...document.querySelectorAll('#editor .word')].filter((el) => {
        const v = +el.dataset.v;
        const c = +el.dataset.c;
        const w = +el.dataset.w;
        return locInRangeInVerses({ v, c, w }, { v: 0, c: 0, w: 0 }, { v: 0, c: lastC, w: 99 }, state.verses);
      });
      if (!words.length) return { ok: false, reason: 'no words' };
      let textL = Infinity;
      let textR = -Infinity;
      words.forEach((el) => {
        const r = el.getBoundingClientRect();
        textL = Math.min(textL, r.left);
        textR = Math.max(textR, r.right);
      });
      const rails = [...document.querySelectorAll('#editor svg.inclusio-frame-svg line.inclusio-frame-rail:not(.inclusio-frame-rail-preview)')];
      const xs = rails
        .filter((l) => Math.abs(+l.getAttribute('x2') - +l.getAttribute('x1')) < 0.01)
        .map((l) => er.left + (+l.getAttribute('x1')) * scale);
      if (xs.length < 2) return { ok: false, reason: 'no rails', xs: xs.length };
      const railL = Math.min(...xs);
      const railR = Math.max(...xs);
      const leftPad = textL - railL;
      const rightPad = railR - textR;
      const pad = window.INCLUSIO_FRAME_PADDING || { left: 44, right: 57 };
      const leftOk = leftPad >= pad.left - 8 && leftPad <= pad.left + 16;
      const rightOk = rightPad >= pad.right - 8 && rightPad <= pad.right + 16;
      const hugsText = leftOk && rightOk;
      const visuallyBalanced = rightPad >= leftPad - 4;
      const frameWidth = railR - railL;
      const textWidth = textR - textL;
      const notPageWide = frameWidth <= textWidth + 120;
      return {
        ok: hugsText && visuallyBalanced && notPageWide,
        leftPad,
        rightPad,
        frameWidth,
        textWidth,
        hugsText,
        visuallyBalanced,
        notPageWide,
      };
    });
    record(
      'horizontal-text-block-frame',
      horizontalBalance.ok,
      `leftPad=${horizontalBalance.leftPad?.toFixed?.(1)}, rightPad=${horizontalBalance.rightPad?.toFixed?.(1)}, frameW=${horizontalBalance.frameWidth?.toFixed?.(1)}, textW=${horizontalBalance.textWidth?.toFixed?.(1)}`
    );

    const exportPdf = await page.evaluate(async () => {
      if (typeof openPdfPrintWindow !== 'function') {
        return { ok: false, reason: 'missing openPdfPrintWindow' };
      }
      const meta = { title: 'test-contour.pdf', oldTitle: 'Hebrew Contour' };
      const html = typeof buildContourExportDocument === 'function'
        ? buildContourExportDocument({
          includePrintButton: true,
          docTitle: meta.title,
        })
        : '';
      if (!html || html.length < 500) return { ok: false, reason: 'export html too short' };
      if (!html.includes('window.print()')) return { ok: false, reason: 'missing print button' };
      let printed = false;
      const oldOpen = window.open;
      window.open = function () {
        const doc = { readyState: 'complete', open() {}, write() {}, close() {} };
        return {
          document: doc,
          focus() {},
          print() { printed = true; },
          addEventListener(type, cb) {
            if (type === 'load') setTimeout(cb, 0);
          },
        };
      };
      try {
        openPdfPrintWindow(html, meta);
        await new Promise((r) => setTimeout(r, 400));
      } finally {
        window.open = oldOpen;
      }
      const docx = typeof contourDocxXml === 'function' ? contourDocxXml() : '';
      return { ok: printed, htmlLen: html.length, docxOk: docx.length > 200 };
    });
    record('export-pdf-script', exportPdf.ok, exportPdf.ok ? `printTriggered, htmlLen=${exportPdf.htmlLen}` : exportPdf.reason);

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
