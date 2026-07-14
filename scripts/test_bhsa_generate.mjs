#!/usr/bin/env node
/**
 * BHSA generation regression tests.
 *
 * - Confirms SHEBANQ responses for Job 1:1–3 and Genesis 1:1–5 (server-side).
 * - Proves direct browser fetch fails with CORS (root cause).
 * - Proves same-origin /api/bhsa-verse proxy enables browser retrieval.
 * - Checks passage parsing for Job, Genesis, Psalm 23, and Ruth.
 *
 * Run: node scripts/test_bhsa_generate.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const bhsaHandler = require(path.join(ROOT, 'api/bhsa-verse.js'));

const results = [];
function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

function assert(id, cond, detail) {
  record(id, !!cond, detail);
  if (!cond) throw new Error(`Assertion failed: ${id}: ${detail}`);
}

async function invokeProxy(query) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      end(body) {
        resolve({
          statusCode: res.statusCode,
          headers,
          body: body == null ? '' : String(body),
          json: (() => { try { return JSON.parse(body); } catch { return null; } })(),
        });
      },
    };
    Promise.resolve(bhsaHandler({ method: 'GET', query }, res)).catch((err) => {
      resolve({ statusCode: 500, headers, body: String(err), json: null });
    });
  });
}

async function fetchRangeViaProxy(book, chapter, fromVerse, toVerse) {
  const out = [];
  for (let v = fromVerse; v <= toVerse; v++) {
    const r = await invokeProxy({ version: '4b', book, chapter: String(chapter), verse: String(v) });
    if (r.statusCode !== 200 || !r.json || !r.json.good || !r.json.data || !r.json.data.text) {
      throw new Error(`Proxy failed for ${book} ${chapter}:${v}: status=${r.statusCode} body=${r.body.slice(0, 160)}`);
    }
    out.push({ chapter, verse: v, text: String(r.json.data.text).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

function startAppServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/bhsa-verse') {
      const query = Object.fromEntries(url.searchParams.entries());
      const headers = {};
      let statusCode = 200;
      await bhsaHandler(
        { method: req.method, query },
        {
          set statusCode(v) { statusCode = v; },
          get statusCode() { return statusCode; },
          setHeader(k, v) { headers[k] = v; },
          end(body) {
            for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
            res.statusCode = statusCode;
            res.end(body == null ? '' : String(body));
          },
        }
      );
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const filePath = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function unlockApp(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', 'AMBS');
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(() => typeof getBhsaText === 'function' && typeof generateWlc === 'function', null, { timeout: 30000 });
}

async function main() {
  // 1) Proxy retrieval: Job 1:1-3
  const job = await fetchRangeViaProxy('Iob', 1, 1, 3);
  assert('job-proxy-count', job.length === 3, `expected 3 Job verses, got ${job.length}`);
  assert('job-1-1-hebrew', /אִי[וֹו]ב|אִיֹּ֣וב|איוב/.test(job[0].text) || job[0].text.includes('אִ'), `Job 1:1 text present (${job[0].text.slice(0, 40)})`);
  assert('job-1-3-nonempty', job[2].text.length > 20, `Job 1:3 length ${job[2].text.length}`);

  // 2) Proxy retrieval: Genesis 1:1-5
  const gen = await fetchRangeViaProxy('Genesis', 1, 1, 5);
  assert('gen-proxy-count', gen.length === 5, `expected 5 Genesis verses, got ${gen.length}`);
  assert('gen-1-1-bereshit', gen[0].text.includes('בְּרֵאשִׁית') || gen[0].text.includes('בְרֵאשִׁית') || gen[0].text.startsWith('ב'), `Genesis 1:1 starts with Hebrew (${gen[0].text.slice(0, 30)})`);

  // 3) Direct SHEBANQ CORS failure in browser (root cause)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const corsPage = await page.evaluate(async () => {
    const url = 'https://shebanq.ancient-data.org/hebrew/verse.json?version=4b&book=Iob&chapter=1&verse=1';
    try {
      await fetch(url, { headers: { Accept: 'application/json' } });
      return { ok: true };
    } catch (e) {
      return { ok: false, name: e.name, message: e.message, online: navigator.onLine };
    }
  });
  assert('cors-blocks-direct', corsPage.ok === false && /Failed to fetch/i.test(corsPage.message || ''), `direct SHEBANQ must fail in browser; got ${JSON.stringify(corsPage)}`);
  assert('cors-user-online', corsPage.online === true, 'navigator.onLine should still be true during CORS failure');

  // 4) Full app path via same-origin proxy
  const { server, base } = await startAppServer();
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await unlockApp(page);

    const parseChecks = await page.evaluate(() => {
      const samples = [
        ['Job 1:1-3', '18O', 1, 1, 1, 3],
        ['Genesis 1:1-5', '01O', 1, 1, 1, 5],
        ['Psalm 23', '19O', 23, 1, 23, 999],
        ['Ruth 1:1-5', '08O', 1, 1, 1, 5],
      ];
      return samples.map(([input, bookId, sc, sv, ec, ev]) => {
        const parsed = parseBibleReference(input);
        return {
          input,
          ok: !!parsed && parsed.bookId === bookId && parsed.sc === sc && parsed.sv === sv && parsed.ec === ec && parsed.ev === ev,
          parsed,
        };
      });
    });
    for (const row of parseChecks) {
      assert(`parse-${row.input}`, row.ok, `parsed=${JSON.stringify(row.parsed)}`);
    }

    const jobUi = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      syncLanguageFromSource();
      setupBooks();
      document.getElementById('bookSelect').value = '18O';
      document.getElementById('startChapter').value = '1';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '1';
      document.getElementById('endVerse').value = '3';
      await generateWlc();
      return {
        status: document.getElementById('wlcStatus').textContent,
        paste: document.getElementById('pasteBox').value,
        language: state.language,
      };
    });
    assert('ui-job-status', /Loaded 3 verse/.test(jobUi.status) && /BHSA/.test(jobUi.status), `status=${jobUi.status}`);
    assert('ui-job-lines', jobUi.paste.split('\n').filter(Boolean).length === 3, `paste lines=${jobUi.paste.split('\n').filter(Boolean).length}`);
    assert('ui-job-lang', jobUi.language === 'hebrew-bhsa', `language=${jobUi.language}`);

    const genUi = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      document.getElementById('bookSelect').value = '01O';
      document.getElementById('startChapter').value = '1';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '1';
      document.getElementById('endVerse').value = '5';
      await generateWlc();
      return {
        status: document.getElementById('wlcStatus').textContent,
        paste: document.getElementById('pasteBox').value,
      };
    });
    assert('ui-gen-status', /Loaded 5 verse/.test(genUi.status) && /BHSA/.test(genUi.status), `status=${genUi.status}`);
    assert('ui-gen-lines', genUi.paste.split('\n').filter(Boolean).length === 5, `lines=${genUi.paste.split('\n').filter(Boolean).length}`);

    const refPreserve = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      document.getElementById('passageReference').value = 'Ruth 1:1-5';
      await generateFromReference();
      return {
        source: document.getElementById('textSource').value,
        status: document.getElementById('wlcStatus').textContent,
      };
    });
    assert('ref-preserves-bhsa', refPreserve.source === 'hebrew-bhsa', `source reset to ${refPreserve.source}`);
    assert('ref-ruth-loaded', /Loaded 5 verse/.test(refPreserve.status), `status=${refPreserve.status}`);
  } finally {
    server.close();
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
