const FEEDBACK_PATH = 'feedback/entries.jsonl';
const SETTINGS_PATH = 'feedback/settings.json';

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

async function readGithubTextFile(filePath) {
  const token = getToken();
  const repoInfo = repoFromEnv();
  if (!token || !repoInfo) {
    throw new Error('Feedback storage is not configured on the server.');
  }

  const { owner, repo } = repoInfo;
  const getRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    token
  );

  if (getRes.status === 404) {
    return { sha: null, text: '' };
  }
  if (!getRes.ok) {
    const err = await getRes.text();
    throw new Error(`Could not read ${filePath}: ${getRes.status} ${err}`);
  }

  const data = await getRes.json();
  return {
    sha: data.sha,
    text: Buffer.from(data.content, 'base64').toString('utf8'),
  };
}

async function writeGithubTextFile(filePath, text, commitMessage) {
  const token = getToken();
  const repoInfo = repoFromEnv();
  if (!token || !repoInfo) {
    throw new Error('Feedback storage is not configured on the server.');
  }

  const { owner, repo } = repoInfo;
  const { sha } = await readGithubTextFile(filePath);
  const putRes = await githubFetch(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(text).toString('base64'),
        sha: sha || undefined,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Could not save ${filePath}: ${putRes.status} ${err}`);
  }

  return putRes.json();
}

async function readFeedbackFile() {
  const { sha, text } = await readGithubTextFile(FEEDBACK_PATH);
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

  return { sha, entries };
}

async function writeFeedbackFile(entries, commitMessage) {
  const content =
    entries.map((entry) => JSON.stringify(entry)).join('\n') +
    (entries.length ? '\n' : '');
  return writeGithubTextFile(FEEDBACK_PATH, content, commitMessage);
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function normalizeEmailList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(
    list
      .map((v) => String(v || '').trim().toLowerCase())
      .filter((v) => EMAIL_RE.test(v))
  )];
}

async function readFeedbackSettings() {
  try {
    const { text } = await readGithubTextFile(SETTINGS_PATH);
    if (!text.trim()) {
      return { notifyEmails: [], updatedAt: null, envFallback: normalizeEmailList(
        String(process.env.FEEDBACK_NOTIFY_EMAIL || '').split(/[,;\n]+/)
      ) };
    }
    const data = JSON.parse(text);
    return {
      notifyEmails: normalizeEmailList(data.notifyEmails),
      updatedAt: data.updatedAt || null,
      envFallback: normalizeEmailList(
        String(process.env.FEEDBACK_NOTIFY_EMAIL || '').split(/[,;\n]+/)
      ),
    };
  } catch (err) {
    if (String(err.message || '').includes('404')) {
      return { notifyEmails: [], updatedAt: null, envFallback: [] };
    }
    throw err;
  }
}

async function writeFeedbackSettings(settings) {
  const notifyEmails = normalizeEmailList(settings.notifyEmails);
  const payload = {
    notifyEmails,
    updatedAt: new Date().toISOString(),
  };
  await writeGithubTextFile(
    SETTINGS_PATH,
    JSON.stringify(payload, null, 2) + '\n',
    'Update feedback notification settings'
  );
  return payload;
}

async function appendFeedbackEntry(entry) {
  const { entries } = await readFeedbackFile();
  entries.push(entry);
  await writeFeedbackFile(entries, `User feedback (${entry.category || 'general'})`);
  return entry;
}

async function patchFeedbackEntry(id, patch) {
  const { entries } = await readFeedbackFile();
  let updated = null;
  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    updated = { ...entry, ...patch };
    return updated;
  });
  if (!updated) throw new Error('Feedback entry not found.');
  await writeFeedbackFile(next, `Update feedback entry (${id})`);
  return updated;
}

async function updateFeedbackStatus(id, status) {
  const { entries } = await readFeedbackFile();
  let updated = null;
  let previousStatus = null;
  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    previousStatus = entry.status === 'fixed' ? 'fixed' : 'open';
    updated = {
      ...entry,
      status,
      fixedAt: status === 'fixed' ? new Date().toISOString() : null,
    };
    return updated;
  });
  if (!updated) throw new Error('Feedback entry not found.');
  await writeFeedbackFile(next, `Update feedback status (${id}: ${status})`);
  return { entry: updated, previousStatus };
}

function summarizeFeedback(entries, sinceIso) {
  const sinceMs = sinceIso ? Date.parse(sinceIso) || 0 : 0;
  let openCount = 0;
  let unreadOpenCount = 0;
  let latestReceivedAt = null;
  let latestOpenReceivedAt = null;

  for (const entry of entries) {
    const receivedAt = entry.receivedAt || null;
    const t = receivedAt ? Date.parse(receivedAt) || 0 : 0;

    if (receivedAt && (!latestReceivedAt || t > Date.parse(latestReceivedAt))) {
      latestReceivedAt = receivedAt;
    }

    if (entry.status === 'fixed') continue;

    openCount++;
    if (receivedAt && (!latestOpenReceivedAt || t > Date.parse(latestOpenReceivedAt))) {
      latestOpenReceivedAt = receivedAt;
    }
    if (t > sinceMs) unreadOpenCount++;
  }

  return {
    openCount,
    unreadOpenCount,
    totalCount: entries.length,
    latestReceivedAt,
    latestOpenReceivedAt,
  };
}

module.exports = {
  FEEDBACK_PATH,
  SETTINGS_PATH,
  appendFeedbackEntry,
  readFeedbackFile,
  readFeedbackSettings,
  writeFeedbackSettings,
  patchFeedbackEntry,
  updateFeedbackStatus,
  summarizeFeedback,
};
