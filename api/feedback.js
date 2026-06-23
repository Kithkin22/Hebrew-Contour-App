const { appendFeedbackEntry, patchFeedbackEntry } = require('./feedback-store');
const {
  extractTicketEmail,
  sendAdminNewFeedback,
  sendUserTicketReceived,
} = require('./feedback-email');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
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
  const ticketEmail = extractTicketEmail(contact);

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
    ticketEmail,
    status: 'open',
    fixedAt: null,
    userNotifiedReceivedAt: null,
    userNotifiedFixedAt: null,
    context: body.context && typeof body.context === 'object' ? body.context : {},
    receivedAt: new Date().toISOString(),
  };

  try {
    await appendFeedbackEntry(entry);

    sendAdminNewFeedback(entry).catch((err) => {
      console.error('Admin feedback notification error:', err);
    });

    if (ticketEmail) {
      sendUserTicketReceived(entry)
        .then(async (result) => {
          if (result.sent) {
            await patchFeedbackEntry(entry.id, {
              userNotifiedReceivedAt: new Date().toISOString(),
            });
          }
        })
        .catch((err) => {
          console.error('User ticket received email error:', err);
        });
    }

    return json(res, 200, {
      ok: true,
      id: entry.id,
      ticketEmail: ticketEmail || null,
    });
  } catch (err) {
    console.error('Feedback save failed:', err);
    return json(res, 503, {
      error: err.message || 'Could not save feedback right now.',
    });
  }
};
