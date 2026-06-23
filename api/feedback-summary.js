const { readFeedbackFile, summarizeFeedback } = require('./feedback-store');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const url = new URL(req.url, 'http://localhost');
  const since = String(url.searchParams.get('since') || '').trim();

  try {
    const { entries } = await readFeedbackFile();
    const summary = summarizeFeedback(entries, since || null);
    return json(res, 200, summary);
  } catch (err) {
    console.error('Feedback summary failed:', err);
    return json(res, 503, {
      error: err.message || 'Could not load feedback summary.',
      openCount: 0,
      unreadOpenCount: 0,
    });
  }
};
