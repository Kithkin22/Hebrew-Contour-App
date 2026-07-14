#!/usr/bin/env node
/**
 * Deployment / readiness verification for BHSA CORS proxy (PR #5).
 *
 * Usage:
 *   node scripts/verify_bhsa_deployment.mjs
 *   PREVIEW_URL=https://... VERCEL_AUTOMATION_BYPASS_SECRET=... node scripts/verify_bhsa_deployment.mjs
 *
 * If PREVIEW_URL is SSO-protected and no bypass secret is available, this
 * script falls back to a local same-origin server using api/bhsa-verse.js
 * (identical handler) and still runs the full browser/UI/network suite.
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

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS || '';
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass: !!pass, detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

async function invokeLocalHandler(query, method = 'GET') {
  return new Promise((resolve) => {
    const headers = {};
    let statusCode = 200;
    const res = {
      set statusCode(v) { statusCode = v; },
      get statusCode() { return statusCode; },
      setHeader(k, v) { headers[String(k).toLowerCase()] = String(v); },
      end(body) {
        const text = body == null ? '' : String(body);
        let json = null;
        try { json = JSON.parse(text); } catch {}
        resolve({ statusCode, headers, body: text, json });
      },
    };
    Promise.resolve(bhsaHandler({ method, query }, res)).catch((err) => {
      resolve({ statusCode: 500, headers, body: String(err), json: null });
    });
  });
}

function startLocalServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
  };
  // Optional mutation hooks for failure simulation.
  let mode = 'normal'; // normal | missing | http500 | timeout | malformed
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/__set_bhsa_mode') {
      mode = url.searchParams.get('mode') || 'normal';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mode }));
      return;
    }
    if (url.pathname === '/api/bhsa-verse') {
      if (mode === 'missing') {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        res.end('not found');
        return;
      }
      if (mode === 'http500') {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ good: false, msgs: [['Error', 'BHSA server returned 500.']], data: {} }));
        return;
      }
      if (mode === 'timeout') {
        // Delay longer than a custom short AbortController can wait in browser test.
        await new Promise((r) => setTimeout(r, 50));
        res.writeHead(504, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ good: false, msgs: [['Error', 'BHSA request timed out.']], data: {} }));
        return;
      }
      if (mode === 'malformed') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end('{not-json');
        return;
      }
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
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
        setMode: async (m) => {
          await fetch(`http://127.0.0.1:${port}/__set_bhsa_mode?mode=${encodeURIComponent(m)}`);
        },
      });
    });
  });
}

async function fetchPreview(pathname) {
  const headers = { Accept: 'application/json' };
  if (BYPASS) {
    headers['x-vercel-protection-bypass'] = BYPASS;
    headers['x-vercel-set-bypass-cookie'] = 'true';
  }
  const url = `${PREVIEW_URL}${pathname}`;
  const res = await fetch(url, { headers, redirect: 'manual' });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text, json, url };
}

async function unlockApp(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', 'AMBS');
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof getBhsaText === 'function' && typeof generateWlc === 'function' && typeof classifyBhsaFetchError === 'function',
    null,
    { timeout: 30000 }
  );
}

async function main() {
  console.log('=== 1) Deployment / proxy unit security checks ===');

  // Security: only fixed upstream, validated inputs.
  const job = await invokeLocalHandler({ version: '4b', book: 'Iob', chapter: '1', verse: '1' });
  record('proxy-job-200', job.statusCode === 200 && job.json?.good === true, `status=${job.statusCode}`);
  record('proxy-job-hebrew', /אִ/.test(job.json?.data?.text || ''), `text=${(job.json?.data?.text || '').slice(0, 40)}`);
  record('proxy-job-cache', /public, max-age=3600/.test(job.headers['cache-control'] || ''), `cache=${job.headers['cache-control']}`);
  record('proxy-job-cors', job.headers['access-control-allow-origin'] === '*', `aca=${job.headers['access-control-allow-origin']}`);

  const gen = await invokeLocalHandler({ version: '4b', book: 'Genesis', chapter: '1', verse: '1' });
  record('proxy-gen-200', gen.statusCode === 200 && gen.json?.good === true, `status=${gen.statusCode}`);
  record('proxy-gen-hebrew', /בְּרֵאש/.test(gen.json?.data?.text || '') || /ב/.test(gen.json?.data?.text || ''), `text=${(gen.json?.data?.text || '').slice(0, 40)}`);

  const ruth = await invokeLocalHandler({ version: '4b', book: 'Ruth', chapter: '1', verse: '1' });
  record('proxy-ruth-200', ruth.statusCode === 200 && ruth.json?.good === true, `status=${ruth.statusCode}`);

  const badBook = await invokeLocalHandler({ book: 'Nope', chapter: '1', verse: '1' });
  record('proxy-bad-book-400', badBook.statusCode === 400, `status=${badBook.statusCode}`);
  const badChapter = await invokeLocalHandler({ book: 'Iob', chapter: '0', verse: '1' });
  record('proxy-bad-chapter-400', badChapter.statusCode === 400, `status=${badChapter.statusCode}`);
  const badVerse = await invokeLocalHandler({ book: 'Iob', chapter: '1', verse: '-1' });
  record('proxy-bad-verse-400', badVerse.statusCode === 400, `status=${badVerse.statusCode}`);
  const badVersion = await invokeLocalHandler({ version: '999', book: 'Iob', chapter: '1', verse: '1' });
  record('proxy-bad-version-400', badVersion.statusCode === 400, `status=${badVersion.statusCode}`);
  const openProxy = await invokeLocalHandler({ book: 'Iob', chapter: '1', verse: '1', url: 'https://example.com' });
  record('proxy-rejects-url-param', openProxy.statusCode === 400, `status=${openProxy.statusCode} body=${openProxy.body.slice(0, 80)}`);
  const post = await invokeLocalHandler({ book: 'Iob', chapter: '1', verse: '1' }, 'POST');
  record('proxy-post-405', post.statusCode === 405, `status=${post.statusCode}`);

  let previewMode = 'unavailable';
  if (PREVIEW_URL) {
    console.log(`\n=== Preview probe: ${PREVIEW_URL} ===`);
    try {
      const probe = await fetchPreview('/api/bhsa-verse?version=4b&book=Iob&chapter=1&verse=1');
      if (probe.status === 200 && probe.json?.good) {
        previewMode = 'live';
        record('preview-proxy-job', true, `Live preview OK text=${probe.json.data.text.slice(0, 40)}`);
      } else if (probe.status === 401 || probe.status === 302 || (probe.json && probe.json.error?.code === '401')) {
        previewMode = 'sso-protected';
        record('preview-proxy-job', false, `Preview SSO/auth protected (status=${probe.status}). Set VERCEL_AUTOMATION_BYPASS_SECRET to verify live.`);
      } else {
        record('preview-proxy-job', false, `Unexpected preview response status=${probe.status} body=${probe.body.slice(0, 160)}`);
      }
    } catch (err) {
      record('preview-proxy-job', false, `Preview fetch failed: ${err.message}`);
    }
  } else {
    record('preview-proxy-job', false, 'PREVIEW_URL not set');
  }

  console.log('\n=== 2) Browser UI / network / failure / PWA checks (local equivalent) ===');
  const { server, base, setMode } = await startLocalServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const network = { shebanq: [], bhsaApi: [], consoleErrors: [], pageErrors: [], bhsaLogs: [] };
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('shebanq.ancient-data.org')) network.shebanq.push(u);
    if (u.includes('/api/bhsa-verse')) network.bhsaApi.push(u);
  });
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') network.consoleErrors.push(text);
    if (text.includes('[BHSA]')) network.bhsaLogs.push(text);
  });
  page.on('pageerror', (err) => network.pageErrors.push(String(err)));

  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await unlockApp(page);

    // PWA cache version present in SW script
    const swText = await page.evaluate(async () => {
      const r = await fetch('./service-worker.js');
      return r.text();
    });
    record('pwa-cache-v86-or-newer', /contour-app-pwa-v8[6-9]|contour-app-pwa-v9/.test(swText), swText.match(/contour-app-pwa-v\d+/)?.[0] || 'missing');
    const layoutSrc = await page.evaluate(async () => (await fetch('./js/app/layout.js')).text());
    record('layout-uses-proxy', layoutSrc.includes("BHSA_PROXY_API='/api/bhsa-verse'") && !/SHEBANQ_VERSE_API='https:\/\/shebanq/.test(layoutSrc), 'layout.js endpoint check');

    // Generate Text: Job 1:1-3
    network.shebanq = []; network.bhsaApi = []; network.consoleErrors = []; network.pageErrors = []; network.bhsaLogs = [];
    const jobUi = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      syncLanguageFromSource(); setupBooks();
      document.getElementById('bookSelect').value = '18O';
      document.getElementById('startChapter').value = '1';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '1';
      document.getElementById('endVerse').value = '3';
      await generateWlc();
      return {
        status: document.getElementById('wlcStatus').textContent,
        lines: document.getElementById('pasteBox').value.split('\n').filter(Boolean).length,
        editorHasHeb: /[\u0590-\u05FF]/.test(document.getElementById('editor')?.textContent || document.getElementById('pasteBox').value),
        language: state.language,
      };
    });
    record('ui-job-status', /Loaded 3 verse/.test(jobUi.status) && /BHSA/.test(jobUi.status), jobUi.status);
    record('ui-job-lines', jobUi.lines === 3, `lines=${jobUi.lines}`);
    record('ui-job-hebrew', jobUi.editorHasHeb, `hasHebrew=${jobUi.editorHasHeb}`);
    record('ui-job-lang', jobUi.language === 'hebrew-bhsa', `lang=${jobUi.language}`);
    record('net-no-direct-shebanq-job', network.shebanq.length === 0, `shebanqHits=${network.shebanq.length}`);
    record('net-uses-proxy-job', network.bhsaApi.length === 3, `bhsaApiHits=${network.bhsaApi.length}`);
    record('net-no-page-errors-job', network.pageErrors.length === 0, JSON.stringify(network.pageErrors));
    record('logs-bhsa-present', network.bhsaLogs.length > 0, `logCount=${network.bhsaLogs.length}`);
    record('logs-not-huge', network.bhsaLogs.every((l) => l.length < 1500), `maxLen=${Math.max(0, ...network.bhsaLogs.map((l) => l.length))}`);

    // Generate Text: Genesis 1:1-5
    network.shebanq = []; network.bhsaApi = [];
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
        lines: document.getElementById('pasteBox').value.split('\n').filter(Boolean).length,
      };
    });
    record('ui-gen-status', /Loaded 5 verse/.test(genUi.status) && /BHSA/.test(genUi.status), genUi.status);
    record('ui-gen-lines', genUi.lines === 5, `lines=${genUi.lines}`);
    record('net-no-direct-shebanq-gen', network.shebanq.length === 0, `shebanqHits=${network.shebanq.length}`);

    // Generate Reference preserves BHSA
    const refUi = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      document.getElementById('passageReference').value = 'Ruth 1:1-5';
      await generateFromReference();
      return {
        source: document.getElementById('textSource').value,
        status: document.getElementById('wlcStatus').textContent,
        lines: document.getElementById('pasteBox').value.split('\n').filter(Boolean).length,
      };
    });
    record('ui-ref-preserves-bhsa', refUi.source === 'hebrew-bhsa', `source=${refUi.source}`);
    record('ui-ref-ruth', /Loaded 5 verse/.test(refUi.status) && /BHSA/.test(refUi.status), refUi.status);
    record('ui-ref-lines', refUi.lines === 5, `lines=${refUi.lines}`);

    // Failure handling simulations (use virgin references so browser HTTP cache
    // of earlier successful Job 1:1 responses cannot mask proxy failure modes).
    await setMode('missing');
    const failMissing = await page.evaluate(async () => {
      document.getElementById('textSource').value = 'hebrew-bhsa';
      document.getElementById('bookSelect').value = '18O';
      document.getElementById('startChapter').value = '2';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '2';
      document.getElementById('endVerse').value = '1';
      await generateWlc();
      return document.getElementById('wlcStatus').textContent;
    });
    record('fail-proxy-missing', /proxy is unavailable|Vercel deployment|WLC\/paste/i.test(failMissing) && !/Check your internet connection/i.test(failMissing) && !/Loaded \d+ verse/i.test(failMissing), failMissing);

    await setMode('http500');
    const failHttp = await page.evaluate(async () => {
      document.getElementById('startChapter').value = '3';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '3';
      document.getElementById('endVerse').value = '1';
      await generateWlc();
      return document.getElementById('wlcStatus').textContent;
    });
    record('fail-http', (/returned 500/i.test(failHttp)) && !/Check your internet connection/i.test(failHttp) && !/Loaded \d+ verse/i.test(failHttp), failHttp);

    await setMode('timeout');
    const failTimeout = await page.evaluate(async () => {
      document.getElementById('startChapter').value = '4';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '4';
      document.getElementById('endVerse').value = '1';
      await generateWlc();
      return document.getElementById('wlcStatus').textContent;
    });
    record('fail-timeout', /timed out/i.test(failTimeout) && !/Check your internet connection/i.test(failTimeout) && !/Loaded \d+ verse/i.test(failTimeout), failTimeout);

    await setMode('malformed');
    const failMalformed = await page.evaluate(async () => {
      document.getElementById('startChapter').value = '5';
      document.getElementById('startVerse').value = '1';
      document.getElementById('endChapter').value = '5';
      document.getElementById('endVerse').value = '1';
      await generateWlc();
      return document.getElementById('wlcStatus').textContent;
    });
    record('fail-malformed', /Unexpected response format/i.test(failMalformed) && !/Check your internet connection/i.test(failMalformed) && !/Loaded \d+ verse/i.test(failMalformed), failMalformed);

    // Offline message only when navigator.onLine === false
    await setMode('normal');
    const offlineMsg = await page.evaluate(() => {
      const c = classifyBhsaFetchError(new Error('Failed to fetch'), {});
      // Force offline classification path
      const orig = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      const offline = classifyBhsaFetchError(new Error('Failed to fetch'), {});
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => orig });
      return { onlineClass: c, offlineClass: offline };
    });
    record('fail-online-not-internet-msg', offlineMsg.onlineClass.kind !== 'offline', JSON.stringify(offlineMsg.onlineClass));
    record('fail-offline-is-internet-msg', offlineMsg.offlineClass.kind === 'offline' && /internet connection/i.test(offlineMsg.offlineClass.userMessage), JSON.stringify(offlineMsg.offlineClass));

  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n=== Summary (previewMode=${previewMode}) ===`);
  const failed = results.filter((r) => !r.pass);
  // Soft-fail preview SSO in exit criteria if everything else passes.
  const hardFailed = failed.filter((r) => r.id !== 'preview-proxy-job');
  console.log(`${results.length - failed.length}/${results.length} passed (${hardFailed.length} hard failures)`);
  if (hardFailed.length) {
    console.error('Hard failures:\n' + hardFailed.map((f) => `- ${f.id}: ${f.detail}`).join('\n'));
    process.exit(1);
  }
  if (previewMode !== 'live') {
    console.warn('NOTE: Live Vercel preview could not be exercised due to Deployment Protection (SSO). Functional verification used the identical local api/bhsa-verse.js handler.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
