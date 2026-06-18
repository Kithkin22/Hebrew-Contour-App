const crypto = require('crypto');
const { readFeedbackFile, updateFeedbackStatus } = require('./feedback-store');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function getAdminPassword() {
  return process.env.FEEDBACK_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function isAuthorized(req, body) {
  const expected = getAdminPassword();
  if (!expected) return false;
  const header = req.headers['x-admin-password'] || req.headers['x-admin-key'] || '';
  const fromBody = body && body.password ? String(body.password) : '';
  const candidate = header || fromBody;
  return safeEqual(candidate, expected);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    res.statusCode = 204;
    res.end();
    return;
  }

  const body = parseBody(req);

  if (req.method === 'POST' && body && body.action === 'verify') {
    if (!getAdminPassword()) {
      return json(res, 503, { error: 'Admin access is not configured on the server.' });
    }
    if (!isAuthorized(req, body)) {
      return json(res, 401, { error: 'Incorrect admin password.' });
    }
    return json(res, 200, { ok: true });
  }

  if (!isAuthorized(req, body)) {
    return json(res, 401, { error: 'Unauthorized.' });
  }

  if (req.method === 'GET') {
    try {
      const { entries } = await readFeedbackFile();
      const sorted = entries.slice().sort((a, b) => {
        const ta = Date.parse(a.receivedAt || '') || 0;
        const tb = Date.parse(b.receivedAt || '') || 0;
        return tb - ta;
      });
      return json(res, 200, { entries: sorted });
    } catch (err) {
      console.error('Feedback admin list failed:', err);
      return json(res, 503, { error: err.message || 'Could not load feedback.' });
    }
  }

  if (req.method === 'PATCH' || (req.method === 'POST' && body && body.action === 'update')) {
    const id = String((body && body.id) || '').trim();
    const status = String((body && body.status) || '').trim();
    if (!id) return json(res, 400, { error: 'Missing feedback id.' });
    if (status !== 'open' && status !== 'fixed') {
      return json(res, 400, { error: 'Status must be open or fixed.' });
    }
    try {
      await updateFeedbackStatus(id, status);
      return json(res, 200, { ok: true, id, status });
    } catch (err) {
      console.error('Feedback admin update failed:', err);
      return json(res, 503, { error: err.message || 'Could not update feedback.' });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
};
