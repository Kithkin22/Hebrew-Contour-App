const crypto = require('crypto');
const {
  readFeedbackFile,
  readFeedbackSettings,
  writeFeedbackSettings,
  patchFeedbackEntry,
  updateFeedbackStatus,
} = require('./feedback-store');
const {
  parseEmailList,
  sendUserTicketFixed,
} = require('./feedback-email');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' && !Buffer.isBuffer(body) ? body : null;
}

/** Match client normalization; strip pasted env whitespace/BOM/zero-width chars. */
function normalizeSecret(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function readEnvPassword() {
  // Same precedence as `FEEDBACK_ADMIN_PASSWORD || ADMIN_PASSWORD` (empty string skips).
  const feedback = process.env.FEEDBACK_ADMIN_PASSWORD;
  const admin = process.env.ADMIN_PASSWORD;
  if (feedback) return { name: 'FEEDBACK_ADMIN_PASSWORD', raw: String(feedback) };
  if (admin) return { name: 'ADMIN_PASSWORD', raw: String(admin) };
  return { name: null, raw: '' };
}

function getAdminPassword() {
  return normalizeSecret(readEnvPassword().raw);
}

function headerValue(req, name) {
  const value = req.headers[name];
  if (Array.isArray(value)) return value.length ? String(value[0] || '') : '';
  return value == null ? '' : String(value);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function readCandidates(req, body) {
  const header = normalizeSecret(
    headerValue(req, 'x-admin-password') || headerValue(req, 'x-admin-key')
  );
  const fromBody = normalizeSecret(body && body.password != null ? body.password : '');
  return { header, fromBody };
}

function isAuthorized(req, body) {
  const expected = getAdminPassword();
  if (!expected) return false;
  const { header, fromBody } = readCandidates(req, body);
  // Accept either channel so a mangled header cannot block a valid body password.
  if (header && safeEqual(header, expected)) return true;
  if (fromBody && safeEqual(fromBody, expected)) return true;
  return false;
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
      const [{ entries }, settings] = await Promise.all([
        readFeedbackFile(),
        readFeedbackSettings(),
      ]);
      const sorted = entries.slice().sort((a, b) => {
        const ta = Date.parse(a.receivedAt || '') || 0;
        const tb = Date.parse(b.receivedAt || '') || 0;
        return tb - ta;
      });
      return json(res, 200, {
        entries: sorted,
        settings: {
          notifyEmails: settings.notifyEmails || [],
          envFallback: settings.envFallback || [],
          updatedAt: settings.updatedAt || null,
        },
      });
    } catch (err) {
      console.error('Feedback admin list failed:', err);
      return json(res, 503, { error: err.message || 'Could not load feedback.' });
    }
  }

  if (req.method === 'POST' && body && body.action === 'saveSettings') {
    const emails = parseEmailList(body.notifyEmails);
    if (!emails.length) {
      return json(res, 400, {
        error: 'Enter at least one valid admin notification email.',
      });
    }
    try {
      const saved = await writeFeedbackSettings({ notifyEmails: emails });
      return json(res, 200, {
        ok: true,
        settings: {
          notifyEmails: saved.notifyEmails,
          updatedAt: saved.updatedAt,
        },
      });
    } catch (err) {
      console.error('Feedback settings save failed:', err);
      return json(res, 503, { error: err.message || 'Could not save settings.' });
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
      const { entry, previousStatus } = await updateFeedbackStatus(id, status);

      if (
        status === 'fixed' &&
        previousStatus !== 'fixed' &&
        (entry.ticketEmail || entry.contact) &&
        !entry.userNotifiedFixedAt
      ) {
        sendUserTicketFixed(entry)
          .then(async (result) => {
            if (result.sent) {
              await patchFeedbackEntry(id, {
                userNotifiedFixedAt: new Date().toISOString(),
              });
            }
          })
          .catch((err) => {
            console.error('User ticket fixed email error:', err);
          });
      }

      return json(res, 200, { ok: true, id, status, entry });
    } catch (err) {
      console.error('Feedback admin update failed:', err);
      return json(res, 503, { error: err.message || 'Could not update feedback.' });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
};
