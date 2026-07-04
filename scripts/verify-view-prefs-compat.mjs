#!/usr/bin/env node
/**
 * viewPrefs compatibility audit (v43).
 * Run: HC_VERIFY_URL=http://127.0.0.1:8765 node scripts/verify-view-prefs-compat.mjs
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
    () => typeof setProjectViewPrefs === 'function' && typeof parseWordHtmlLayoutLines === 'function',
    { timeout: 25000 }
  );
}

const LEGACY_PAYLOAD = {
  app: 'Hebrew Contour Table App',
  version: '1.3.9',
  state: {
    parallelEnabled: false,
    activePane: 0,
    crossArcs: [],
    verseAlignPairs: null,
    panes: [{
      ref: 'Ruth 3:4',
      language: 'hebrew',
      verses: [{
        ref: 'Ruth 3:4',
        clauses: [{ indent: 0, words: [{ text: 'וַיְהִי' }, { text: 'בַשְׁכִּיבוֹ' }], ann: {} }],
      }],
      columns: [],
      legend: [],
      inclusios: [],
      comments: [],
      arcs: [],
    }, {
      ref: '',
      verses: [],
      columns: [],
      legend: [],
      language: 'hebrew-bhsa',
      inclusios: [],
      comments: [],
      arcs: [],
    }],
  },
  generatedRefsByPane: [['Ruth 3:4'], []],
  generatedRefs: ['Ruth 3:4'],
};

const SAVED_PREFS_PAYLOAD = {
  app: 'Hebrew Contour Table App',
  version: '1.3.9',
  viewPrefs: {
    hideVerseRefs: true,
    inspectorEnabled: true,
    commentsPanelOpen: true,
    contourDensity: 'comfortable',
  },
  state: {
    parallelEnabled: true,
    activePane: 0,
    crossArcs: [],
    verseAlignPairs: null,
    panes: [{
      ref: 'Job 19:21-29',
      language: 'hebrew-bhsa',
      verses: [{
        ref: 'Job 19:21-29',
        hideRef: true,
        clauses: [
          { indent: 1, spacingAfter: 'medium', words: [{ text: 'חָנֵּנִי' }], ann: {} },
          { indent: 0, words: [{ text: 'כִּי' }], ann: {} },
        ],
      }],
      columns: [],
      legend: [],
      inclusios: [],
      comments: [{ id: 'c1', start: { v: 0, c: 0, w: 0 }, end: { v: 0, c: 0, w: 0 }, text: 'test' }],
      arcs: [],
    }, {
      ref: '',
      verses: [],
      columns: [],
      legend: [],
      language: 'hebrew-bhsa',
      inclusios: [],
      comments: [],
      arcs: [],
    }],
  },
  generatedRefsByPane: [['Job 19:21-29'], []],
  generatedRefs: ['Job 19:21-29'],
};

const WORD_HTML = `<html><body dir=RTL>
<p dir=RTL style='margin-right:0pt;text-align:right'>חָנֵּנִי</p>
<p dir=RTL style='margin-right:36.0pt;text-align:right'>כִּי יַד</p>
<p dir=RTL style='margin-right:0pt;text-align:right'>&nbsp;</p>
<p dir=RTL style='margin-right:72.0pt;text-align:right'>וַאֲנִי</p>
</body></html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const audit = await page.evaluate(({ legacyPayload, savedPrefsPayload, wordHtml }) => {
      const out = {};

      // 1. Brand new project defaults
      ensureStateBundle();
      stateBundle.parallelEnabled = false;
      state = stateBundle.panes[0];
      setProjectViewPrefs(null, { reset: true, persist: false });
      parseText('בְּרֵאשִׁית בָּרָא', 'Gen 1:1', false, { skipRender: true });
      render();
      const prefs1 = JSON.parse(JSON.stringify(getProjectViewPrefs()));
      out.newProject = {
        prefs: prefs1,
        hideRefs: state.verses.every((v) => v.hideRef === true),
        noVerseRefDom: !document.querySelector('#editor .verse-ref'),
        singleDensity: document.body.classList.contains('contour-density-single'),
        inspectorOff: !window.CONTOUR_INSPECTOR_ENABLED,
        commentsClosed: !!commentsPanelCollapsed,
        parallelOff: !stateBundle.parallelEnabled,
      };

      // 2. Legacy project (no viewPrefs)
      applyProjectPayloadParallel(legacyPayload);
      restoreProjectViewPrefsFromPayload(legacyPayload);
      render();
      const legacyPrefs = JSON.parse(JSON.stringify(getProjectViewPrefs()));
      out.legacy = {
        prefs: legacyPrefs,
        verseRefVisible: !!document.querySelector('#editor .verse-ref'),
        verseHasNoHideRef: !state.verses[0].hideRef,
        comfortableDensity: document.body.classList.contains('contour-density-comfortable'),
        parallelOff: !stateBundle.parallelEnabled,
        refPreserved: state.ref === 'Ruth 3:4',
      };

      // 3. Project with saved viewPrefs
      applyProjectPayloadParallel(savedPrefsPayload);
      restoreProjectViewPrefsFromPayload(savedPrefsPayload);
      render();
      const toggle = document.getElementById('parallelModeToggle');
      out.savedPrefs = {
        prefs: JSON.parse(JSON.stringify(getProjectViewPrefs())),
        hideRefs: state.verses[0].hideRef === true,
        noVerseRefDom: !document.querySelector('#editor .verse-ref'),
        comfortableDensity: document.body.classList.contains('contour-density-comfortable'),
        inspectorOn: !!window.CONTOUR_INSPECTOR_ENABLED,
        commentsOpen: !commentsPanelCollapsed,
        parallelOn: !!stateBundle.parallelEnabled,
        parallelToggle: toggle ? toggle.checked : false,
        spacingMedium: state.verses[0].clauses[0].spacingAfter === 'medium',
        indent1: state.verses[0].clauses[0].indent === 1,
        commentCount: state.comments.length,
      };

      // 4. Save/Load roundtrip
      const payload = projectPayload();
      const hasViewPrefs = !!payload.viewPrefs;
      const exported = JSON.stringify(payload);
      const imported = JSON.parse(exported);
      applyProjectPayloadParallel(imported);
      restoreProjectViewPrefsFromPayload(imported);
      render();
      out.saveLoad = {
        hasViewPrefs,
        exportedPrefs: imported.viewPrefs,
        restoredHideRefs: getProjectViewPrefs().hideVerseRefs,
        restoredInspector: getProjectViewPrefs().inspectorEnabled,
        restoredComments: getProjectViewPrefs().commentsPanelOpen,
        restoredDensity: getProjectViewPrefs().contourDensity,
        restoredParallel: stateBundle.parallelEnabled,
      };

      // 5. Interaction checks
      setProjectViewPrefs(null, { reset: true, persist: false });
      parseText('א\n\nב\n\n\nג', 'Test', false, { preserveLayout: true, skipRender: true });
      render();
      const spacing = state.verses[0].clauses.map((c) => c.spacingAfter || 'default');
      const mdMargin = (() => {
        const el = document.querySelector('#editor .layout-break-md');
        return el ? parseFloat(getComputedStyle(el).marginBottom) || 0 : 0;
      })();

      const parsed = parseWordHtmlLayoutLines(wordHtml, { isRtl: true });
      const layoutVerses = buildVersesFromLayoutPaste(parsed.text, 'Job', 'hebrew-bhsa', [], parsed.lines);
      const wordIndents = layoutVerses[0].clauses.map((c) => c.indent || 0);

      // Inclusio smoke
      let inclusioOk = true;
      try {
        if (typeof migrateInclusiosOnPane === 'function') migrateInclusiosOnPane(state);
        if (typeof syncAllPaneInclusioWordMarkers === 'function') syncAllPaneInclusioWordMarkers();
        inclusioOk = typeof renderInclusioUI === 'function';
      } catch (e) {
        inclusioOk = false;
      }

      out.interactions = {
        pasteSpacing: spacing.join(','),
        mdMargin,
        wordIndents: wordIndents.join(','),
        wordIndentOk: wordIndents.some((i) => i > 0),
        inclusioOk,
        inspectorToggleOk: typeof setInspectorEnabled === 'function',
        commentsFnOk: typeof renderCommentsPanel === 'function',
      };

      return out;
    }, { legacyPayload: LEGACY_PAYLOAD, savedPrefsPayload: SAVED_PREFS_PAYLOAD, wordHtml: WORD_HTML });

    // 1. Brand new project
    record('new-hide-refs-pref', audit.newProject.prefs.hideVerseRefs === true, `pref=${audit.newProject.prefs.hideVerseRefs}`);
    record('new-hide-refs-verses', audit.newProject.hideRefs && audit.newProject.noVerseRefDom, `verses=${audit.newProject.hideRefs}, dom=${audit.newProject.noVerseRefDom}`);
    record('new-single-density', audit.newProject.singleDensity && audit.newProject.prefs.contourDensity === 'single', `single=${audit.newProject.singleDensity}`);
    record('new-inspector-off', audit.newProject.inspectorOff && !audit.newProject.prefs.inspectorEnabled, `off=${audit.newProject.inspectorOff}`);
    record('new-comments-closed', audit.newProject.commentsClosed && !audit.newProject.prefs.commentsPanelOpen, `closed=${audit.newProject.commentsClosed}`);
    record('new-parallel-off', audit.newProject.parallelOff, `parallel=${audit.newProject.parallelOff}`);

    // 2. Legacy project
    record('legacy-no-viewprefs', !LEGACY_PAYLOAD.viewPrefs, 'payload has no viewPrefs');
    record('legacy-refs-visible', audit.legacy.verseRefVisible && audit.legacy.verseHasNoHideRef, `dom=${audit.legacy.verseRefVisible}`);
    record('legacy-comfortable', audit.legacy.comfortableDensity && audit.legacy.prefs.contourDensity === 'comfortable', `density=${audit.legacy.prefs.contourDensity}`);
    record('legacy-parallel-off', audit.legacy.parallelOff, `parallel=${audit.legacy.parallelOff}`);
    record('legacy-content-intact', audit.legacy.refPreserved, `ref=${audit.legacy.refPreserved}`);

    // 3. Saved viewPrefs restore
    record('saved-hide-refs', audit.savedPrefs.hideRefs && audit.savedPrefs.prefs.hideVerseRefs, `pref=${audit.savedPrefs.prefs.hideVerseRefs}`);
    record('saved-comfortable', audit.savedPrefs.comfortableDensity, `density=${audit.savedPrefs.prefs.contourDensity}`);
    record('saved-inspector-on', audit.savedPrefs.inspectorOn && audit.savedPrefs.prefs.inspectorEnabled, `on=${audit.savedPrefs.inspectorOn}`);
    record('saved-comments-open', audit.savedPrefs.commentsOpen && audit.savedPrefs.prefs.commentsPanelOpen, `open=${audit.savedPrefs.commentsOpen}`);
    record('saved-parallel-on', audit.savedPrefs.parallelOn && audit.savedPrefs.parallelToggle, `parallel=${audit.savedPrefs.parallelOn}`);
    record('saved-layout-metadata', audit.savedPrefs.spacingMedium && audit.savedPrefs.indent1, `spacing+indent preserved`);

    // 4. Save/Load
    record('save-has-viewprefs', audit.saveLoad.hasViewPrefs, `hasViewPrefs=${audit.saveLoad.hasViewPrefs}`);
    record('save-roundtrip-prefs', audit.saveLoad.restoredHideRefs === true
      && audit.saveLoad.restoredInspector === true
      && audit.saveLoad.restoredComments === true
      && audit.saveLoad.restoredDensity === 'comfortable', `prefs=${JSON.stringify(audit.saveLoad.exportedPrefs)}`);
    record('save-roundtrip-parallel', audit.saveLoad.restoredParallel === true, `parallel=${audit.saveLoad.restoredParallel}`);

    // 5. Interactions
    record('interact-paste-layout', audit.interactions.pasteSpacing.includes('medium') && audit.interactions.pasteSpacing.includes('large'), `spacing=${audit.interactions.pasteSpacing}`);
    record('interact-visual-breaks-margin', audit.interactions.mdMargin >= 24, `mdMargin=${audit.interactions.mdMargin}px`);
    record('interact-word-indent', audit.interactions.wordIndentOk, `indents=${audit.interactions.wordIndents}`);
    record('interact-inclusio', audit.interactions.inclusioOk, `inclusio=${audit.interactions.inclusioOk}`);
    record('interact-inspector-fn', audit.interactions.inspectorToggleOk, 'inspector fn ok');
    record('interact-comments-fn', audit.interactions.commentsFnOk, 'comments fn ok');

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
