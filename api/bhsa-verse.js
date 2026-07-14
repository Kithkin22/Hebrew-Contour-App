/**
 * Same-origin proxy for SHEBANQ BHSA verse.json.
 *
 * Browser pages cannot call shebanq.ancient-data.org directly because that
 * API does not send Access-Control-Allow-Origin. This Vercel serverless
 * function fetches server-side and returns JSON to the app origin.
 */

const SHEBANQ_VERSE_API = 'https://shebanq.ancient-data.org/hebrew/verse.json';
const DEFAULT_VERSION = '4b';
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

function json(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  }
  res.end(JSON.stringify(body));
}

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 200) {
    return { error: `Invalid ${label}` };
  }
  return { value: n };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return json(res, 405, { good: false, msgs: [['Error', 'Method not allowed']], data: {} });
  }

  const q = req.query || {};
  const version = String(q.version || DEFAULT_VERSION).trim() || DEFAULT_VERSION;
  const book = String(q.book || '').trim();
  const chapterParsed = parsePositiveInt(q.chapter, 'chapter');
  const verseParsed = parsePositiveInt(q.verse, 'verse');

  if (!book || !ALLOWED_BOOKS.has(book)) {
    return json(res, 400, { good: false, msgs: [['Error', `Unsupported BHSA book: ${book || '(empty)'}`]], data: {} });
  }
  if (chapterParsed.error) {
    return json(res, 400, { good: false, msgs: [['Error', chapterParsed.error]], data: {} });
  }
  if (verseParsed.error) {
    return json(res, 400, { good: false, msgs: [['Error', verseParsed.error]], data: {} });
  }

  const url = new URL(SHEBANQ_VERSE_API);
  url.searchParams.set('version', version);
  url.searchParams.set('book', book);
  url.searchParams.set('chapter', String(chapterParsed.value));
  url.searchParams.set('verse', String(verseParsed.value));

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return json(res, timedOut ? 504 : 502, {
      good: false,
      msgs: [['Error', timedOut ? 'BHSA request timed out.' : 'Unable to contact BHSA server.']],
      data: {},
      proxyError: String(err && err.message ? err.message : err),
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
      bodyPreview: raw.slice(0, 240),
    });
  }

  if (!upstream.ok) {
    return json(res, upstream.status, {
      good: false,
      msgs: [['Error', `BHSA server returned ${upstream.status}.`]],
      data: data && typeof data === 'object' ? data : {},
      upstreamStatus: upstream.status,
    });
  }

  return json(res, 200, data);
};
