#!/usr/bin/env node
/**
 * Surface form vs Lexical form alignment tests.
 *
 * Example where surface ≠ lemma:
 *   Surface / Text form: וַ/יִּשָּׂ֥א  (MorphHB Job)
 *   Lexical form:      נָשָׂא
 *   Root:              נָשָׂא
 *
 * Run: node scripts/test_hebrew_forms.mjs
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
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
  const sandbox = { window: {}, console };
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
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
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

async function main() {
  const HF = loadHebrewForms();
  const surface = 'וַ/יִּשָּׂ֥א';
  const lemma = 'נָשָׂא';
  const entry = {
    word: surface,
    lemma,
    root: lemma,
    lemmaHebrew: lemma,
    rootHebrew: lemma,
    parsing: 'Conjunction; Verb Qal sequential imperfect 3rd person masculine singular',
    morph: 'HC/Vqw3ms',
  };

  const forms = HF.inspectForms(entry, surface);
  record('unit-surface', forms.surface === surface, forms.surface);
  record('unit-lexical', forms.lexical === lemma, forms.lexical);
  record('unit-root', forms.root === lemma, forms.root);
  record('unit-parsing-distinct', forms.parsing.includes('Verb') || forms.parsing.includes('HC'), forms.parsing);
  record('unit-no-surface-as-lemma', HF.pickLexicalForm({ word: surface }) === '', `got=${HF.pickLexicalForm({ word: surface })}`);
  record('unit-no-surface-as-root', HF.pickRootForm({ word: surface }) === '', `got=${HF.pickRootForm({ word: surface })}`);

  // Job MorphHB live file sanity
  const job = JSON.parse(fs.readFileSync(path.join(ROOT, 'Job_MorphHB_Lexicon_for_Contour_App.json'), 'utf8'));
  const jobEntry = job.words[surface] || job.words['ו/ישא'];
  record('job-entry-present', !!jobEntry, JSON.stringify(jobEntry && { word: jobEntry.word, lemma: jobEntry.lemma }));
  if (jobEntry) {
    const jf = HF.inspectForms(jobEntry, jobEntry.word);
    record('job-surface', jf.surface.includes('יִּשָּׂ') || jf.surface.includes('יש'), jf.surface);
    record('job-lexical-nasa', jf.lexical.replace(/[\u05B0-\u05BD]/g, '').includes('נשא') || jf.lexical.includes('נָשָׂא'), jf.lexical);
    record('job-surface-ne-lexical', jf.surface !== jf.lexical, `${jf.surface} vs ${jf.lexical}`);
  }

  const { server, base } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await unlock(page);

    const ui = await page.evaluate(async (payload) => {
      // Ensure Inspector On
      if (window.CONTOUR_INSPECTOR_ENABLED === false && typeof setInspectorEnabled === 'function') {
        // setInspectorEnabled may be scoped; toggle button instead
      }
      const btn = document.getElementById('inspectorToggleBtn');
      if (btn && /Off/i.test(btn.textContent || '')) btn.click();

      window.CONTOUR_MORPH_LOOKUP = {
        words: {
          [payload.surface]: payload.entry,
          [payload.surfaceKey]: payload.entry,
        },
        refs: {},
      };

      // Load a tiny manuscript with the surface form as biblical text
      ensureStateBundle();
      state.language = 'hebrew-bhsa';
      state.verses = [{
        ref: 'Job 1:1',
        clauses: [{
          indent: 0,
          words: [{ text: payload.surface, deleted: false, specials: [], note: '', translation: '', color: '' }],
          ann: {},
        }],
      }];
      state.selected = { v: 0, c: 0, w: 0 };
      generatedRefs = ['Job 1:1'];
      render();
      applyLanguageLayout();
      if (typeof updateInspectorLanguageRows === 'function') updateInspectorLanguageRows();

      const wordEl = document.querySelector('.word');
      const manuscriptText = wordEl ? wordEl.textContent.trim() : '';
      const layoutFont = getLanguageLayout().fontFamily;

      // Simulate inspector hover fill path
      if (typeof showInspector === 'function') showInspector(wordEl);
      else {
        // showInspector is scoped; dispatch mouseover
      }
      wordEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));

      const labels = Array.from(document.querySelectorAll('#wordInspector .wi-label')).map((el) => el.textContent.trim());
      return {
        manuscriptText,
        layoutFont,
        labels,
        textForm: document.getElementById('wiWord')?.textContent,
        lexical: document.getElementById('wiLemma')?.textContent,
        root: document.getElementById('wiRoot')?.textContent,
        parsing: document.getElementById('wiParsing')?.textContent,
        lemmaRowDisplay: document.getElementById('wiLemmaRow')?.style?.display,
        inspectorVisible: document.getElementById('wordInspector')?.style?.display,
      };
    }, {
      surface,
      surfaceKey: 'ו/ישא',
      entry,
    });

    record('ui-manuscript-surface', ui.manuscriptText.includes('יִּשָּׂ') || ui.manuscriptText === surface, ui.manuscriptText);
    record('ui-font-sbl', /SBL BibLit/i.test(ui.layoutFont), ui.layoutFont);
    record('ui-label-text-form', ui.labels.includes('Text form'), JSON.stringify(ui.labels));
    record('ui-label-lexical', ui.labels.includes('Lexical form'), JSON.stringify(ui.labels));
    record('ui-label-root', ui.labels.includes('Root') && !ui.labels.includes('Lemma / Root'), JSON.stringify(ui.labels));
    record('ui-label-parsing', ui.labels.includes('Parsing'), JSON.stringify(ui.labels));
    record('ui-text-form-value', ui.textForm === surface || (ui.textForm && ui.textForm.includes('יִּשָּׂ')), ui.textForm);
    record('ui-lexical-nasa', ui.lexical === lemma || (ui.lexical && ui.lexical.includes('נָשָׂא')), ui.lexical);
    record('ui-root-nasa', ui.root === lemma || (ui.root && ui.root.includes('נָשָׂא')), ui.root);
    record('ui-surface-ne-lexical', ui.textForm !== ui.lexical, `${ui.textForm} vs ${ui.lexical}`);
    record('ui-parsing-present', !!(ui.parsing && ui.parsing !== '—'), ui.parsing);
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error(failed.map((f) => `- ${f.id}: ${f.detail}`).join('\n'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
