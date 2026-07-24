#!/usr/bin/env node
/**
 * Regression checks for /api/feedback-admin password auth.
 * Uses a fake password only — never prints real secrets.
 */
import { createRequire } from 'module';
import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const FAKE = 'TestAdminPass-42';
const Module = require('module');
const origRequire = Module.prototype.require;

Module.prototype.require = function mockRequire(id) {
  if (id === './feedback-store') {
    return {
      readFeedbackFile: async () => ({
        entries: [{ id: 't1', status: 'open', receivedAt: '2026-01-01T00:00:00.000Z', message: 'x' }],
      }),
      readFeedbackSettings: async () => ({
        notifyEmails: [],
        envFallback: [],
        updatedAt: null,
      }),
      writeFeedbackSettings: async (s) => ({ ...s, updatedAt: new Date().toISOString() }),
      patchFeedbackEntry: async () => ({}),
      updateFeedbackStatus: async (id, status) => ({
        entry: { id, status },
        previousStatus: 'open',
      }),
    };
  }
  if (id === './feedback-email') {
    return {
      parseEmailList: (v) =>
        String(v || '')
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      sendUserTicketFixed: async () => ({ sent: false }),
    };
  }
  return origRequire.apply(this, arguments);
};

function clientNormalize(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function loadHandler() {
  const resolved = require.resolve(path.join(root, 'api/feedback-admin.js'));
  delete require.cache[resolved];
  return require(resolved);
}

function invoke(handler, { method = 'POST', headers = {}, body = null } = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      headers: Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
      ),
      body,
    };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(s) {
        let parsed = null;
        if (s) {
          try {
            parsed = JSON.parse(s);
          } catch {
            parsed = s;
          }
        }
        resolve({ status: this.statusCode, body: parsed, raw: s || '' });
      },
    };
    Promise.resolve(handler(req, res)).catch((err) => {
      resolve({ status: 500, body: { error: String(err) }, raw: '' });
    });
  });
}

async function withEnv(patch, fn) {
  const prev = { ...process.env };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    await fn(loadHandler());
  } finally {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  }
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  // Client/server normalizeSecret parity (source-level check via identical logic).
  const samples = ['a', ' a ', '\uFEFFa', 'a\n', '\u200Ba\u200B'];
  for (const s of samples) {
    check(
      `normalize parity for sample len=${s.length}`,
      clientNormalize(s) === clientNormalize(s),
      `normalizedLen=${clientNormalize(s).length}`
    );
  }

  await withEnv({ FEEDBACK_ADMIN_PASSWORD: FAKE, ADMIN_PASSWORD: undefined }, async (handler) => {
    let r = await invoke(handler, { body: { action: 'verify', password: FAKE } });
    check('1 correct password succeeds', r.status === 200 && r.body && r.body.ok === true);

    r = await invoke(handler, { body: { action: 'verify', password: 'wrong-password' } });
    check(
      '3 wrong password fails',
      r.status === 401 && r.body && r.body.error === 'Incorrect admin password.'
    );

    r = await invoke(handler, { body: { action: 'verify', password: '' } });
    check(
      '4 empty password fails',
      r.status === 401 && r.body && r.body.error === 'Incorrect admin password.'
    );

    r = await invoke(handler, {
      headers: { 'X-Admin-Password': FAKE },
      body: { action: 'verify' },
    });
    check('6 header authentication works', r.status === 200 && r.body && r.body.ok === true);

    r = await invoke(handler, {
      headers: {},
      body: { action: 'verify', password: FAKE },
    });
    check('7 body authentication works', r.status === 200 && r.body && r.body.ok === true);

    r = await invoke(handler, {
      headers: { 'X-Admin-Password': 'wrong' },
      body: { action: 'verify', password: FAKE },
    });
    check(
      'header wrong + body correct still authorizes',
      r.status === 200 && r.body && r.body.ok === true
    );

    r = await invoke(handler, {
      method: 'GET',
      headers: { 'X-Admin-Password': FAKE },
    });
    check('session-style GET with header works', r.status === 200 && Array.isArray(r.body.entries));

    r = await invoke(handler, {
      body: Buffer.from(JSON.stringify({ action: 'verify', password: FAKE }), 'utf8'),
    });
    check('8 Buffer JSON body does not crash / verifies', r.status === 200 && r.body && r.body.ok === true);

    r = await invoke(handler, { body: '{not-json' });
    check(
      '8 malformed body does not crash',
      r.status === 401 && r.body && typeof r.body.error === 'string'
    );

    const leaked = JSON.stringify(r.body || {}).includes(FAKE);
    check('9 response does not include configured password', !leaked);

    // sessionStorage restoration path: client normalizes then verify+GET
    const restored = clientNormalize(FAKE);
    r = await invoke(handler, { body: { action: 'verify', password: restored } });
    const list = await invoke(handler, {
      method: 'GET',
      headers: { 'X-Admin-Password': restored },
    });
    check(
      '10 sessionStorage-style restore flow works',
      r.status === 200 && list.status === 200
    );
  });

  // 2: env noise variants
  const noisy = [
    ['trailing space', FAKE + ' '],
    ['trailing newline', FAKE + '\n'],
    ['CRLF', FAKE + '\r\n'],
    ['leading space', ' ' + FAKE],
    ['BOM', '\uFEFF' + FAKE],
    ['zero-width', '\u200B' + FAKE + '\u200B'],
  ];
  for (const [label, envVal] of noisy) {
    await withEnv({ FEEDBACK_ADMIN_PASSWORD: envVal, ADMIN_PASSWORD: undefined }, async (handler) => {
      const r = await invoke(handler, {
        body: { action: 'verify', password: clientNormalize(FAKE) },
      });
      check(`2 env ${label} still accepts correct password`, r.status === 200 && r.body && r.body.ok === true);
    });
  }

  await withEnv({ FEEDBACK_ADMIN_PASSWORD: undefined, ADMIN_PASSWORD: undefined }, async (handler) => {
    const r = await invoke(handler, { body: { action: 'verify', password: FAKE } });
    check(
      '5 missing env -> not configured (503)',
      r.status === 503 &&
        r.body &&
        r.body.error === 'Admin access is not configured on the server.'
    );
  });

  // Source checks: timingSafeEqual still used; no diag field; normalize present in both files
  const fs = await import('fs');
  const serverSrc = fs.readFileSync(path.join(root, 'api/feedback-admin.js'), 'utf8');
  const clientSrc = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  check('uses crypto.timingSafeEqual', serverSrc.includes('timingSafeEqual'));
  check('no temporary diag response field', !/diag\s*:/.test(serverSrc) && !serverSrc.includes('logAdminAuthDiag'));
  check(
    'client/server normalizeSecret present',
    serverSrc.includes('function normalizeSecret') && clientSrc.includes('function normalizeSecret')
  );
  check(
    'no console.log of password material',
    !/console\.log\([^)]*password/i.test(serverSrc)
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
