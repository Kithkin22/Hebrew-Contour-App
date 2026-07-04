#!/usr/bin/env node
/**
 * Page zoom / print preview verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-page-zoom.mjs
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
    () => typeof applyPageZoom === 'function' && typeof buildContourEditorHtmlFromState === 'function',
    { timeout: 25000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const unit = await page.evaluate(() => {
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      localStorage.setItem('hc-import-word-indent', 'yes');

      const wordHtml = `<html><body dir=RTL>
<p dir=RTL style='margin-right:0pt;text-align:right'>חָנֵּנִי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי יַד־אֱלוֹהַּ</p>
</body></html>`;
      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      parseText(parsed.text, 'Job 19:21-29 (BHS OT)', false, {
        preserveLayout: true,
        layoutLines: parsed.lines,
      });
      if (state.verses[0]) state.verses[0].hideRef = true;
      render();

      setPageZoomMode('85', { skipPersist: true });
      const stage = document.getElementById('contourPageZoomStage');
      const inner = stage?.querySelector('.contour-page-zoom-inner');
      const scale85 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));
      const titleVisible = !!(document.getElementById('contourPassageTitle') && !document.getElementById('contourPassageTitle').hidden);
      const titleTop = document.getElementById('contourPassageTitle')?.getBoundingClientRect().top || 0;
      const wrapTop = document.getElementById('editorWrap')?.getBoundingClientRect().top || 0;

      setPageZoomMode('100', { skipPersist: true });
      const scale100 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));

      setPageZoomMode('fit', { skipPersist: true });
      const scaleFit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--contour-page-zoom'));
      const sheet = document.querySelector('.contour-document-sheet');
      const wrap = document.getElementById('editorWrap');
      const sheetRect = sheet?.getBoundingClientRect();
      const wrapRect = wrap?.getBoundingClientRect();
      const port = wrap?.closest('.contour-with-comments') || wrap;
      const portRect = port?.getBoundingClientRect();
      const viewportBottom = Math.min(portRect?.bottom || window.innerHeight, window.innerHeight);
      const fitsVertically = sheetRect && sheetRect.bottom <= viewportBottom + 4;
      const fitsHorizontally = sheetRect && wrapRect
        && sheetRect.left >= wrapRect.left - 4
        && sheetRect.right <= wrapRect.right + 4;
      const heightLimited = scaleFit <= (scale100 - 0.01) || sheetRect.height <= viewportBottom - wrapRect.top;

      const exportHtml = buildContourEditorHtmlFromState(true);
      const exportHasZoom = exportHtml.includes('contour-page-zoom') || exportHtml.includes('contourPageZoomStage');

      const firstWord = document.querySelector('#editor .word');
      const gapTop = firstWord ? firstWord.getBoundingClientRect().top - wrap.getBoundingClientRect().top : 999;
      const stageLayoutH = stage?.offsetHeight || 0;
      const stageVisualH = stage?.getBoundingClientRect().height || 0;
      const stageLayoutMatchesVisual = stageLayoutH > 0 && Math.abs(stageLayoutH - stageVisualH) < 8;
      const hasZoomInner = !!inner;

      setPageZoomMode('75', { skipPersist: true });
      const captured = captureProjectViewPrefs();

      setPageZoomScale(0.92, { skipPersist: true });
      const customScale = getPageZoomScaleValue();
      const customMode = getPageZoomMode();
      const customLabel = document.getElementById('pageZoomStatus')?.textContent || '';
      const customBtnActive = document.querySelector('[data-page-zoom="100"]')?.classList.contains('active');

      setPageZoomScale(1, { skipPersist: true });
      const preset100Active = document.querySelector('[data-page-zoom="100"]')?.classList.contains('active');

      const beforeWheel = getPageZoomScaleValue();
      wrap.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: wrap.getBoundingClientRect().left + wrap.clientWidth / 2,
        clientY: wrap.getBoundingClientRect().top + wrap.clientHeight / 2,
        deltaY: -50,
        ctrlKey: true,
      }));
      const afterWheel = getPageZoomScaleValue();

      const payload = projectPayload();
      const savedZoom = payload.viewPrefs?.pageZoom;
      setPageZoomScale(0.92, { skipPersist: true });
      syncPageZoomPref(getPageZoomPersistValue());
      const payloadCustom = projectPayload();
      const savedCustom = payloadCustom.viewPrefs?.pageZoom;

      state.arcs = [{
        id: 'arc-test',
        start: { v: 0, c: 0, w: 0 },
        end: { v: 0, c: 1, w: 0 },
        color: '#0b61d8',
        label: '',
      }];
      renderArcOverlay();
      function arcAnchorError(scaleMode) {
        setPageZoomMode(scaleMode, { skipPersist: true });
        renderArcOverlay();
        const words = Array.from(document.querySelectorAll('#editor .word'));
        const start = words[0];
        const end = words.find((w, i) => i > 0 && w.closest('.clause') !== start.closest('.clause')) || words[1];
        if (!start || !end) return 999;
        const sr = start.getBoundingClientRect();
        const er = end.getBoundingClientRect();
        const ed = document.getElementById('editor');
        const edr = ed.getBoundingClientRect();
        const scale = getPageZoomScaleValue();
        const expectedY1 = (sr.top + sr.height / 2 - edr.top) / scale;
        const expectedY2 = (er.top + er.height / 2 - edr.top) / scale;
        const circles = Array.from(document.querySelectorAll('#arcSvg circle'));
        if (circles.length < 2) return 999;
        const y1 = parseFloat(circles[0].getAttribute('cy'));
        const y2 = parseFloat(circles[1].getAttribute('cy'));
        return Math.max(Math.abs(y1 - expectedY1), Math.abs(y2 - expectedY2));
      }
      const err85 = arcAnchorError('85');
      const err100 = arcAnchorError('100');

      return {
        hasStage: !!stage,
        scale85,
        scale100,
        scaleFit,
        fitsVertically,
        fitsHorizontally,
        heightLimited,
        titleVisible,
        titleNearTop: titleVisible && titleTop >= wrapTop && titleTop - wrapTop < 200,
        exportHasZoom,
        gapTop,
        stageLayoutMatchesVisual,
        hasZoomInner,
        capturedZoom: captured.pageZoom,
        customScale,
        customMode,
        customLabel,
        customBtnActive,
        preset100Active,
        wheelZoomed: afterWheel > beforeWheel,
        savedCustom,
        arcErr85: err85,
        arcErr100: err100,
      };
    });

    record('zoom-stage', unit.hasStage, `hasStage=${unit.hasStage}`);
    record('zoom-85', Math.abs(unit.scale85 - 0.85) < 0.02, `scale85=${unit.scale85}`);
    record('zoom-100', Math.abs(unit.scale100 - 1) < 0.02, `scale100=${unit.scale100}`);
    record('zoom-fit-visible', unit.fitsVertically && unit.fitsHorizontally, `fit=${unit.scaleFit} vertical=${unit.fitsVertically} horizontal=${unit.fitsHorizontally}`);
    record('zoom-fit-height', unit.heightLimited, `heightLimited=${unit.heightLimited} fitScale=${unit.scaleFit}`);
    record('title-visible', unit.titleVisible && unit.titleNearTop, `titleVisible=${unit.titleVisible} nearTop=${unit.titleNearTop}`);
    record('fit-content-near-top', unit.gapTop < 120, `gapTop=${unit.gapTop}`);
    record('stage-layout-box', unit.stageLayoutMatchesVisual && unit.hasZoomInner, `layoutMatchesVisual=${unit.stageLayoutMatchesVisual} inner=${unit.hasZoomInner}`);
    record('export-no-zoom', !unit.exportHasZoom, `exportHasZoom=${unit.exportHasZoom}`);
    record('prefs-capture', unit.capturedZoom === '75', `captured=${unit.capturedZoom}`);
    record('custom-zoom-scale', Math.abs(unit.customScale - 0.92) < 0.02 && unit.customMode === 'custom', `scale=${unit.customScale} mode=${unit.customMode}`);
    record('custom-zoom-label', unit.customLabel === '92%', `label=${unit.customLabel}`);
    record('custom-no-preset-active', !unit.customBtnActive, `100btnActive=${unit.customBtnActive}`);
    record('preset-rehighlight', unit.preset100Active, `100btnActive=${unit.preset100Active}`);
    record('wheel-pinch-zoom', unit.wheelZoomed, `before/after wheel`);
    record('custom-persist', unit.savedCustom === '92', `saved=${unit.savedCustom}`);
    record('arc-align-85', unit.arcErr85 < 3, `err=${unit.arcErr85}`);
    record('arc-align-100', unit.arcErr100 < 3, `err=${unit.arcErr100}`);

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
