/**
 * Same-origin proxy for SHEBANQ BHSA verse.json.
 *
 * Browser pages cannot call shebanq.ancient-data.org directly because that
 * API does not send Access-Control-Allow-Origin. This Vercel serverless
 * function fetches server-side and returns JSON to the app origin.
 *
 * Security model:
 * - SHEBANQ URL is fixed internally (not taken from the client).
 * - Only book / chapter / verse / version query params are accepted.
 * - Book and version are allowlisted; chapter/verse must be positive ints.
 * - This cannot be used as an open proxy.
 */

const SHEBANQ_VERSE_API = 'https://shebanq.ancient-data.org/hebrew/verse.json';
const DEFAULT_VERSION = '4b';
const ALLOWED_VERSIONS = new Set(['4', '4b', '2017', '2021']);
const ALLOWED_BOOKS = new Set([
  'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium',
  'Josua', 'Judices', 'Ruth', 'Samuel_I', 'Samuel_II',
  'Reges_I', 'Reges_II', 'Chronica_I', 'Chronica_II', 'Esra',
  'Nehemia', 'Esther', 'Iob', 'Psalmi', 'Proverbia',
  'Ecclesiastes', 'Canticum', 'Jesaia', 'Jeremia', 'Threni',
  'Ezechiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadia',
  'Jona', 'Micha', 'Nahum', 'Habakuk', 'Zephania', 'Haggai',
  'Sacharia', 'Maleachi',
]);
const UPSTREAM_TIMEOUT_MS = 15000;

function json(res, status, body, { cacheable = false } = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', cacheable ? 'public, max-age=3600' : 'no-store');
  res.end(JSON.stringify(body));
}

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 200) {
    return { error: `Invalid ${label}` };
  }
  return { value: n };
}

async function handleGet(req, res) {
  const q = req.query || {};
  const versionRaw = String(q.version || DEFAULT_VERSION).trim() || DEFAULT_VERSION;
  const book = String(q.book || '').trim();
  const chapterParsed = parsePositiveInt(q.chapter, 'chapter');
  const verseParsed = parsePositiveInt(q.verse, 'verse');

  // Reject unknown query keys that look like open-proxy attempts.
  const allowedKeys = new Set(['version', 'book', 'chapter', 'verse']);
  for (const key of Object.keys(q)) {
    if (!allowedKeys.has(key)) {
      return json(res, 400, {
        good: false,
        msgs: [['Error', `Unsupported query parameter: ${key}`]],
        data: {},
      });
    }
  }

  if (!ALLOWED_VERSIONS.has(versionRaw)) {
    return json(res, 400, {
      good: false,
      msgs: [['Error', `Unsupported BHSA version: ${versionRaw}`]],
      data: {},
    });
  }
  if (!book || !ALLOWED_BOOKS.has(book)) {
    return json(res, 400, {
      good: false,
      msgs: [['Error', `Unsupported BHSA book: ${book || '(empty)'}`]],
      data: {},
    });
  }
  if (chapterParsed.error) {
    return json(res, 400, { good: false, msgs: [['Error', chapterParsed.error]], data: {} });
  }
  if (verseParsed.error) {
    return json(res, 400, { good: false, msgs: [['Error', verseParsed.error]], data: {} });
  }

  const url = new URL(SHEBANQ_VERSE_API);
  url.searchParams.set('version', versionRaw);
  url.searchParams.set('book', book);
  url.searchParams.set('chapter', String(chapterParsed.value));
  url.searchParams.set('verse', String(verseParsed.value));

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return json(res, timedOut ? 504 : 502, {
      good: false,
      msgs: [['Error', timedOut ? 'BHSA request timed out.' : 'Unable to contact BHSA server.']],
      data: {},
    });
  }

  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return json(res, 502, {
      good: false,
      msgs: [['Error', 'Unexpected response format from BHSA server.']],
      data: {},
      upstreamStatus: upstream.status,
    });
  }

  if (!upstream.ok) {
    return json(res, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, {
      good: false,
      msgs: [['Error', `BHSA server returned ${upstream.status}.`]],
      data: {},
      upstreamStatus: upstream.status,
    });
  }

  return json(res, 200, data, { cacheable: true });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      return json(res, 405, { good: false, msgs: [['Error', 'Method not allowed']], data: {} });
    }

    return await handleGet(req, res);
  } catch (err) {
    console.error('[bhsa-verse] unexpected error', err && err.stack ? err.stack : err);
    return json(res, 500, {
      good: false,
      msgs: [['Error', 'Internal proxy error.']],
      data: {},
    });
  }
};
