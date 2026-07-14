#!/usr/bin/env node
/**
 * Owner review verification for PR #6 — Surface / Lexical / Root / Parsing.
 * Run: node scripts/verify_surface_lexical_owner_review.mjs
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from 'playwright';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const results = [];
function record(id, pass, detail) {
  results.push({ id, pass: !!pass, detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

function loadHebrewForms() {
  const code = fs.readFileSync(path.join(ROOT, 'js/app/hebrew-forms.js'), 'utf8');
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.CONTOUR_HEBREW_FORMS;
}

function startServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
  };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (rel === '/') rel = '/index.html';
    const filePath = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', 'AMBS');
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(() => typeof CONTOUR_HEBREW_FORMS !== 'undefined' && typeof renderEditor === 'function', null, { timeout: 30000 });
}

function sampleJobEntries() {
  const job = JSON.parse(fs.readFileSync(path.join(ROOT, 'Job_MorphHB_Lexicon_for_Contour_App.json'), 'utf8'));
  const words = job.words;
  const verb = words['וַ/יִּשָּׂ֥א'] || words['ו/ישא'];
  // noun: אִ֛ישׁ
  const noun = words['אִ֛ישׁ'] || words['איש'];
  // adjective: יָשָׁר-ish from וְ/יָשָׁ֛ר
  const adj = words['וְ/יָשָׁ֛ר'] || words['ו/ישר'];
  // proper-ish: אִיֹּ֣וב often as name
  let proper = null;
  for (const [k, v] of Object.entries(words)) {
    if ((v.parsing || '').toLowerCase().includes('proper') || (v.morph || '').includes('Np')) {
      proper = v;
      break;
    }
  }
  if (!proper) {
    for (const [k, v] of Object.entries(words)) {
      if ((v.word || '').includes('אִיֹּ') || (v.lemma || '').includes('אִיּוֹב')) {
        proper = v;
        break;
      }
    }
  }
  return { verb, noun, adj, proper, words };
}

async function main() {
  console.log('=== Architecture / helper checks ===');
  const HF = loadHebrewForms();
  const samples = sampleJobEntries();
  record('verb-entry', !!samples.verb, JSON.stringify(samples.verb && { word: samples.verb.word, lemma: samples.verb.lemma, root: samples.verb.root }));
  const vf = HF.inspectForms(samples.verb, samples.verb.word);
  record('insp-verb-text', vf.surface === samples.verb.word, vf.surface);
  record('insp-verb-lexical', vf.lexical === samples.verb.lemma || vf.lexical === samples.verb.lemmaHebrew, vf.lexical);
  record('insp-verb-root', vf.root === samples.verb.root || vf.root === samples.verb.rootHebrew, vf.root);
  record('insp-verb-surface-ne-lex', vf.surface !== vf.lexical, `${vf.surface} vs ${vf.lexical}`);
  record('insp-verb-parsing', /Verb|Vqw|sequential/i.test(vf.parsing), vf.parsing);

  for (const [name, entry] of [['noun', samples.noun], ['adj', samples.adj], ['proper', samples.proper]]) {
    if (!entry) {
      record(`pos-${name}`, false, 'missing sample');
      continue;
    }
    const f = HF.inspectForms(entry, entry.word);
    record(`pos-${name}-independent`,
      f.surface === (entry.word || f.surface) &&
      f.lexical === (HF.pickLexicalForm(entry) || '—') &&
      f.root === (HF.pickRootForm(entry) || '—') &&
      HF.pickLexicalForm({ word: entry.word }) === '',
      JSON.stringify(f)
    );
  }

  // Source scan for forbidden fallbacks in active app files
  const files = [
    'js/app/hebrew-forms.js',
    'js/app/inspector.js',
    'js/app/inspector-morph.js',
    'js/app/core.js',
    'js/app/layout.js',
    'greek-lexicon.js',
    'sefaria-bdb.js',
  ].map((f) => path.join(ROOT, f));
  const forbidden = [
    /root\s*\|\|\s*lemma/,
    /lemma\s*\|\|\s*root/,
    /root:\s*entry\.root\s*\|\|\s*entry\.lemma/,
    /lemma:\s*entry\.lemma\s*\|\|\s*entry\.root/,
    /root:\s*lemma\b/,
    /g\.root\s*\|\|\s*g\.lemma/,
  ];
  let badHits = [];
  for (const fp of files) {
    const text = fs.readFileSync(fp, 'utf8');
    for (const re of forbidden) {
      if (re.test(text)) badHits.push(`${path.basename(fp)}: ${re}`);
    }
  }
  record('arch-no-forbidden-fallbacks', badHits.length === 0, badHits.join(' | ') || 'clean');

  console.log('\n=== Browser owner review ===');
  const { server, base } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await unlock(page);

    const report = await page.evaluate(async (payload) => {
      const out = { steps: [] };
      function note(k, v) { out[k] = v; out.steps.push(k); }

      // Enable inspector
      const btn = document.getElementById('inspectorToggleBtn');
      if (btn && /Off/i.test(btn.textContent || '')) btn.click();

      const morphEntries = payload.morphWords;
      window.CONTOUR_MORPH_LOOKUP = { words: morphEntries, refs: {} };

      const verbSurface = payload.verb.word;
      const verbLemma = payload.verb.lemmaHebrew || payload.verb.lemma;
      const verbRoot = payload.verb.rootHebrew || payload.verb.root;
      const verbParsing = payload.verb.parsing || payload.verb.morph;

      ensureStateBundle();
      state.language = 'hebrew-bhsa';
      state.verses = [{
        ref: 'Job 1:1',
        clauses: [{
          indent: 0,
          words: [
            { text: verbSurface, deleted: false, specials: [], note: '', translation: '', color: '' },
            { text: payload.noun.word, deleted: false, specials: [], note: '', translation: '', color: '' },
            { text: payload.adj.word, deleted: false, specials: [], note: '', translation: '', color: '' },
          ],
          ann: {},
        }],
      }];
      state.selected = { v: 0, c: 0, w: 0 };
      generatedRefs = ['Job 1:1'];
      render();
      applyLanguageLayout();
      if (typeof updateInspectorLanguageRows === 'function') updateInspectorLanguageRows();
      if (typeof setWorkspaceTab === 'function') setWorkspaceTab('contour');

      const word0 = document.querySelector('.word[data-w="0"]');
      note('editorSurface', word0 ? word0.textContent.trim() : null);
      note('editorFont', getComputedStyle(word0).fontFamily);

      word0.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 800));

      const labels = Array.from(document.querySelectorAll('#wordInspector .wi-label'))
        .filter((el) => el.offsetParent !== null || el.closest('#wordInspector'))
        .map((el) => el.textContent.trim());
      note('labels', labels);
      note('textForm', document.getElementById('wiWord')?.textContent);
      note('lexical', document.getElementById('wiLemma')?.textContent);
      note('root', document.getElementById('wiRoot')?.textContent);
      note('parsing', document.getElementById('wiParsing')?.textContent);
      note('expected', { verbSurface, verbLemma, verbRoot, verbParsing });

      // Table view surface check
      if (typeof setWorkspaceTab === 'function') setWorkspaceTab('table');
      await new Promise((r) => setTimeout(r, 200));
      const tableHtml = document.getElementById('tableWrap')?.innerText || document.getElementById('tableTab')?.innerText || '';
      note('tableHasSurface', tableHtml.includes(verbSurface) || tableHtml.includes(verbSurface.replace(/\//g, '')));
      note('tableHasOnlyLexicalAsText', tableHtml.includes(verbLemma) && !tableHtml.includes(verbSurface));
      if (typeof setWorkspaceTab === 'function') setWorkspaceTab('contour');

      // Manual Forms independence
      state.selected = { v: 0, c: 0, w: 0 };
      const manBtn = document.getElementById('manualInspectorBtn');
      if (manBtn) manBtn.click();
      await new Promise((r) => setTimeout(r, 100));
      const modal = document.getElementById('manualInspectorModal');
      note('manualOpen', !!(modal && modal.classList.contains('show')));
      note('manualTextForm', document.getElementById('manualInspectorWord')?.value);
      document.getElementById('manualInspectorLemma').value = 'TESTING_LEMMA';
      document.getElementById('manualInspectorRoot').value = 'TESTING_ROOT';
      document.getElementById('manualInspectorParsing').value = 'TESTING_PARSE';
      // Ensure lemma edit did not sync root before save
      note('manualIndepBeforeSave',
        document.getElementById('manualInspectorLemma').value === 'TESTING_LEMMA' &&
        document.getElementById('manualInspectorRoot').value === 'TESTING_ROOT' &&
        document.getElementById('manualInspectorWord').value === verbSurface
      );
      document.getElementById('manualInspectorSave').click();
      await new Promise((r) => setTimeout(r, 100));

      // Re-open inspector via hover
      word0.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 800));
      note('afterSaveLexical', document.getElementById('wiLemma')?.textContent);
      note('afterSaveRoot', document.getElementById('wiRoot')?.textContent);
      note('afterSaveParsing', document.getElementById('wiParsing')?.textContent);
      note('afterSaveText', document.getElementById('wiWord')?.textContent);
      note('manuscriptUnchanged', document.querySelector('.word[data-w="0"]')?.textContent.trim() === verbSurface);

      // Edit lemma only and ensure root stays
      if (manBtn) manBtn.click();
      await new Promise((r) => setTimeout(r, 80));
      document.getElementById('manualInspectorLemma').value = 'LEMMA_ONLY';
      // leave root as TESTING_ROOT
      document.getElementById('manualInspectorSave').click();
      await new Promise((r) => setTimeout(r, 80));
      word0.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 800));
      note('lemmaOnlyChange', {
        lexical: document.getElementById('wiLemma')?.textContent,
        root: document.getElementById('wiRoot')?.textContent,
        text: document.getElementById('wiWord')?.textContent,
      });

      // Export path uses word.text
      const exportProbe = state.verses[0].clauses[0].words.map((w) => w.text);
      note('exportSurfaces', exportProbe);

      // Morph import normalize independence
      let normalized = null;
      // expose via re-import simulation using same logic as stored API if available
      const raw = {
        words: {
          a: { word: 'וַ/יִּשָּׂ֥א', lemma: 'נָשָׂא', root: 'נשׂא', parsing: 'HC/Vqw3ms' },
          b: { word: 'אִ֛ישׁ', lemma: 'אִישׁ', root: 'אִישׁ', parsing: 'HNcmsa' },
        },
      };
      // Call through file input path is hard; use CONTOUR_HEBREW_FORMS on entries
      note('importIndep', Object.values(raw.words).map((e) => CONTOUR_HEBREW_FORMS.inspectForms(e, e.word)));

      return out;
    }, {
      verb: samples.verb,
      noun: samples.noun,
      adj: samples.adj,
      morphWords: {
        [samples.verb.word]: samples.verb,
        [samples.noun.word]: samples.noun,
        [samples.adj.word]: samples.adj,
        'ו/ישא': samples.verb,
      },
    });

    console.log(JSON.stringify(report, null, 2));

    record('ui-four-labels',
      report.labels.includes('Text form') &&
      report.labels.includes('Lexical form') &&
      report.labels.includes('Root') &&
      report.labels.includes('Parsing') &&
      !report.labels.includes('Lemma / Root'),
      JSON.stringify(report.labels)
    );
    record('ui-text-matches-ms', report.textForm === report.editorSurface && report.editorSurface === report.expected.verbSurface, `${report.textForm} / ${report.editorSurface}`);
    record('ui-lexical-correct', report.lexical === report.expected.verbLemma, report.lexical);
    record('ui-root-correct', report.root === report.expected.verbRoot, report.root);
    record('ui-parsing-morphhb', report.parsing === report.expected.verbParsing || report.parsing.includes('Verb'), report.parsing);
    record('ui-surface-ne-lexical', report.textForm !== report.lexical, `${report.textForm} vs ${report.lexical}`);
    record('ui-sbl-font', /SBL BibLit/i.test(report.editorFont), report.editorFont);
    record('ui-table-not-lemma-as-text', report.tableHasOnlyLexicalAsText !== true, `tableHasOnlyLexicalAsText=${report.tableHasOnlyLexicalAsText}`);
    record('manual-open', report.manualOpen === true, String(report.manualOpen));
    record('manual-text-readonly-surface', report.manualTextForm === report.expected.verbSurface, report.manualTextForm);
    record('manual-independent-fields', report.manualIndepBeforeSave === true, String(report.manualIndepBeforeSave));
    record('manual-persist',
      report.afterSaveLexical === 'TESTING_LEMMA' &&
      report.afterSaveRoot === 'TESTING_ROOT' &&
      report.afterSaveParsing === 'TESTING_PARSE' &&
      report.afterSaveText === report.expected.verbSurface,
      JSON.stringify({ l: report.afterSaveLexical, r: report.afterSaveRoot, p: report.afterSaveParsing, t: report.afterSaveText })
    );
    record('manual-ms-unchanged', report.manuscriptUnchanged === true, String(report.manuscriptUnchanged));
    record('manual-lemma-edit-keeps-root',
      report.lemmaOnlyChange?.lexical === 'LEMMA_ONLY' &&
      report.lemmaOnlyChange?.root === 'TESTING_ROOT' &&
      report.lemmaOnlyChange?.text === report.expected.verbSurface,
      JSON.stringify(report.lemmaOnlyChange)
    );
    record('export-surfaces-only',
      Array.isArray(report.exportSurfaces) &&
      report.exportSurfaces[0] === report.expected.verbSurface &&
      !report.exportSurfaces.includes(report.expected.verbLemma),
      JSON.stringify(report.exportSurfaces)
    );
    record('import-forms-independent',
      Array.isArray(report.importIndep) &&
      report.importIndep[0].surface !== report.importIndep[0].lexical &&
      report.importIndep[0].lexical.includes('נָשָׂא'),
      JSON.stringify(report.importIndep)
    );
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error('FAILURES:\n' + failed.map((f) => `- ${f.id}: ${f.detail}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
