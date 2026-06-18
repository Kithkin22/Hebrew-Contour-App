const FEEDBACK_PATH = 'feedback/entries.jsonl';

function repoFromEnv() {
  const raw = process.env.GITHUB_REPO || 'Kithkin22/Hebrew-Contour-App';
  const parts = raw.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function getToken() {
  return process.env.GITHUB_TOKEN || '';
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

async function readFeedbackFile() {
  const token = getToken();
  const repoInfo = repoFromEnv();
  if (!token || !repoInfo) {
    throw new Error('Feedback storage is not configured on the server.');
  }

  const { owner, repo } = repoInfo;
  const getRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${FEEDBACK_PATH}`,
    token
  );

  if (getRes.status === 404) {
    return { sha: null, entries: [] };
  }
  if (!getRes.ok) {
    const err = await getRes.text();
    throw new Error(`Could not read feedback log: ${getRes.status} ${err}`);
  }

  const data = await getRes.json();
  const text = Buffer.from(data.content, 'base64').toString('utf8');
  const entries = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return { sha: data.sha, entries };
}

async function writeFeedbackFile(entries, commitMessage) {
  const token = getToken();
  const repoInfo = repoFromEnv();
  if (!token || !repoInfo) {
    throw new Error('Feedback storage is not configured on the server.');
  }

  const { owner, repo } = repoInfo;
  const { sha } = await readFeedbackFile();
  const content =
    entries.map((entry) => JSON.stringify(entry)).join('\n') + (entries.length ? '\n' : '');

  const putRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${FEEDBACK_PATH}`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        sha: sha || undefined,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Could not save feedback log: ${putRes.status} ${err}`);
  }

  return putRes.json();
}

async function appendFeedbackEntry(entry) {
  const { entries } = await readFeedbackFile();
  entries.push(entry);
  return writeFeedbackFile(entries, `User feedback (${entry.category || 'general'})`);
}

async function updateFeedbackStatus(id, status) {
  const { entries } = await readFeedbackFile();
  let found = false;
  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    found = true;
    return {
      ...entry,
      status,
      fixedAt: status === 'fixed' ? new Date().toISOString() : null,
    };
  });
  if (!found) throw new Error('Feedback entry not found.');
  return writeFeedbackFile(next, `Update feedback status (${id}: ${status})`);
}

module.exports = {
  FEEDBACK_PATH,
  appendFeedbackEntry,
  readFeedbackFile,
  updateFeedbackStatus,
};
