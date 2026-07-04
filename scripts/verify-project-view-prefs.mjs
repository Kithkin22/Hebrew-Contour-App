#!/usr/bin/env node
/**
 * Project view preference defaults and persistence verification.
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-project-view-prefs.mjs
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
    () => typeof setProjectViewPrefs === 'function' && typeof parseText === 'function',
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
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      generatedRefs = [];
      state.language = 'hebrew';

      setProjectViewPrefs(null, { reset: true, persist: false });
      const defaults = JSON.parse(JSON.stringify(getProjectViewPrefs()));
      parseText('בְּרֵאשִׁית בָּרָא אֱלֹהִים', 'Gen 1:1', false, { skipRender: true });
      render();

      const newGenHidden = state.verses.every((v) => v.hideRef === true);
      const noVerseRefDom = !document.querySelector('#editor .verse-ref');
      const singleDensity = document.body.classList.contains('contour-density-single');
      const editorLh = parseFloat(getComputedStyle(document.getElementById('editor')).lineHeight);

      setAllVerseRefsHidden(false);
      render();
      const shownRefs = !!document.querySelector('#editor .verse-ref');

      const payload = projectPayload();
      const savedPrefs = payload.viewPrefs;

      stateBundle.panes[0] = extractPaneFromPayload(JSON.parse(JSON.stringify(payload)), 0).pane;
      state = stateBundle.panes[0];
      restoreProjectViewPrefsFromPayload(payload);
      render();

      const restoredShowRefs = !!document.querySelector('#editor .verse-ref');
      const restoredPrefs = JSON.parse(JSON.stringify(getProjectViewPrefs()));

      restoreProjectViewPrefsFromPayload({ viewPrefs: null });
      const legacyPrefs = getProjectViewPrefs();

      return {
        defaults,
        newGenHidden,
        noVerseRefDom,
        singleDensity,
        editorLh,
        shownRefs,
        savedPrefs,
        restoredShowRefs,
        restoredPrefs,
        legacyPrefs,
        inspectorOff: !window.CONTOUR_INSPECTOR_ENABLED,
      };
    });

    record('default-hide-refs', unit.defaults.hideVerseRefs === true, `hideVerseRefs=${unit.defaults.hideVerseRefs}`);
    record('default-single-density', unit.defaults.contourDensity === 'single', `density=${unit.defaults.contourDensity}`);
    record('default-inspector-off', unit.defaults.inspectorEnabled === false, `inspector=${unit.defaults.inspectorEnabled}`);
    record('new-gen-hidden', unit.newGenHidden && unit.noVerseRefDom, `hidden=${unit.newGenHidden}, dom=${unit.noVerseRefDom}`);
    record('single-spacing-class', unit.singleDensity, `singleDensity=${unit.singleDensity}`);
    record('compact-line-height', unit.editorLh > 0 && unit.editorLh < 40, `lineHeight=${unit.editorLh}`);
    record('toggle-show-refs', unit.shownRefs, `shownRefs=${unit.shownRefs}`);
    record('prefs-in-payload', unit.savedPrefs && unit.savedPrefs.hideVerseRefs === false, `saved=${JSON.stringify(unit.savedPrefs)}`);
    record('restore-show-refs', unit.restoredShowRefs, `restoredShowRefs=${unit.restoredShowRefs}`);
    record('restore-prefs', unit.restoredPrefs.hideVerseRefs === false, `restored=${unit.restoredPrefs.hideVerseRefs}`);
    record('legacy-prefs', unit.legacyPrefs.contourDensity === 'comfortable', `legacy=${JSON.stringify(unit.legacyPrefs)}`);
    record('inspector-restored-off', unit.inspectorOff, `inspectorOff=${unit.inspectorOff}`);

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
