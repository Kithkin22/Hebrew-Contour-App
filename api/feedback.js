const FEEDBACK_PATH = 'feedback/entries.jsonl';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function repoFromEnv() {
  const raw = process.env.GITHUB_REPO || 'Kithkin22/Hebrew-Contour-App';
  const parts = raw.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

async function githubFetch(path, token, options = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  return fetch(`https://api.github.com${path}`, { ...options, headers });
}

async function appendFeedbackEntry(entry) {
  const token = process.env.GITHUB_TOKEN;
  const repoInfo = repoFromEnv();
  if (!token || !repoInfo) {
    throw new Error('Feedback storage is not configured on the server.');
  }

  const { owner, repo } = repoInfo;
  const line = `${JSON.stringify(entry)}\n`;
  let sha = null;
  let existing = '';

  const getRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${FEEDBACK_PATH}`,
    token
  );

  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
    existing = Buffer.from(data.content, 'base64').toString('utf8');
  } else if (getRes.status !== 404) {
    const err = await getRes.text();
    throw new Error(`Could not read feedback log: ${getRes.status} ${err}`);
  }

  const putRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${FEEDBACK_PATH}`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `User feedback (${entry.category || 'general'})`,
        content: Buffer.from(existing + line).toString('base64'),
        sha: sha || undefined,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Could not save feedback: ${putRes.status} ${err}`);
  }

  return putRes.json();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object') {
    return json(res, 400, { error: 'Missing request body' });
  }

  const category = String(body.category || 'general').trim().slice(0, 40);
  const message = String(body.message || '').trim();
  const contact = String(body.contact || '').trim().slice(0, 200);

  if (!message || message.length < 5) {
    return json(res, 400, { error: 'Please enter at least a few words of feedback.' });
  }
  if (message.length > 4000) {
    return json(res, 400, { error: 'Feedback is too long (max 4000 characters).' });
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    message,
    contact: contact || null,
    context: body.context && typeof body.context === 'object' ? body.context : {},
    receivedAt: new Date().toISOString(),
  };

  try {
    await appendFeedbackEntry(entry);
    return json(res, 200, { ok: true, id: entry.id });
  } catch (err) {
    console.error('Feedback save failed:', err);
    return json(res, 503, {
      error: err.message || 'Could not save feedback right now.',
    });
  }
};
