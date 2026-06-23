const { Resend } = require('resend');
const { readFeedbackSettings } = require('./feedback-store');

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

let resendClient = null;

function getResend() {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress() {
  return (
    process.env.FEEDBACK_EMAIL_FROM ||
    'Hebrew Contour App <onboarding@resend.dev>'
  );
}

function getApiKey() {
  return process.env.RESEND_API_KEY || '';
}

function getSiteUrl(entry) {
  const ctx = entry && entry.context && typeof entry.context === 'object' ? entry.context : {};
  const fromEnv = process.env.FEEDBACK_SITE_URL || '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (ctx.url) return String(ctx.url).replace(/\/[^/]*$/, '');
  return '';
}

function parseEmailList(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v || '').trim().toLowerCase())
      .filter((v) => EMAIL_RE.test(v));
  }
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((v) => v.trim().toLowerCase())
    .filter((v) => EMAIL_RE.test(v));
}

function extractTicketEmail(contact) {
  const match = String(contact || '').trim().match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
}

async function resolveAdminNotifyEmails() {
  let emails = [];
  try {
    const settings = await readFeedbackSettings();
    if (settings.notifyEmails && settings.notifyEmails.length) {
      emails = settings.notifyEmails;
    }
  } catch (err) {
    console.warn('Could not read feedback settings:', err.message);
  }
  if (!emails.length) {
    emails = parseEmailList(process.env.FEEDBACK_NOTIFY_EMAIL || '');
  }
  return [...new Set(emails)];
}

async function sendEmail({ to, subject, text }) {
  const recipients = parseEmailList(to);
  const resend = getResend();
  if (!resend || !recipients.length) {
    return { sent: false, reason: 'not_configured' };
  }

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: recipients,
    subject,
    text,
  });

  if (error) {
    console.error('Feedback email failed:', error);
    return { sent: false, reason: 'send_failed' };
  }

  return { sent: true, to: recipients, id: data && data.id };
}

async function sendAdminNewFeedback(entry) {
  const to = await resolveAdminNotifyEmails();
  if (!to.length) {
    console.warn(
      'Admin feedback email skipped: set notify emails in admin settings or FEEDBACK_NOTIFY_EMAIL.'
    );
    return { sent: false, reason: 'not_configured' };
  }

  const ctx = entry.context && typeof entry.context === 'object' ? entry.context : {};
  const site = getSiteUrl(entry);
  const adminUrl = site ? `${site}/admin.html` : '';
  const ticket = entry.id || 'unknown';

  const lines = [
    `New feedback ticket: ${ticket}`,
    `Category: ${entry.category || 'general'}`,
    `Received: ${entry.receivedAt || new Date().toISOString()}`,
    entry.ticketEmail ? `User email: ${entry.ticketEmail}` : null,
    entry.contact && entry.contact !== entry.ticketEmail ? `Contact: ${entry.contact}` : null,
    ctx.ref ? `Passage: ${ctx.ref}` : null,
    ctx.language ? `Language: ${ctx.language}` : null,
    ctx.url ? `Page: ${ctx.url}` : null,
    '',
    entry.message || '',
    '',
    'Open the admin inbox to review and mark fixed.',
    adminUrl ? `Admin: ${adminUrl}` : null,
  ].filter((line) => line !== null);

  return sendEmail({
    to,
    subject: `New Hebrew Contour feedback — ticket ${ticket}`,
    text: lines.join('\n'),
  });
}

async function sendUserTicketReceived(entry) {
  const to = entry.ticketEmail || extractTicketEmail(entry.contact);
  if (!to) return { sent: false, reason: 'no_user_email' };

  const ticket = entry.id || 'unknown';
  const site = getSiteUrl(entry);
  const lines = [
    'Thank you for your feedback on the Hebrew Contour App.',
    '',
    `Your message was received. Ticket ID: ${ticket}`,
    `Category: ${entry.category || 'general'}`,
    `Submitted: ${entry.receivedAt || new Date().toISOString()}`,
    '',
    'We will email you again when your ticket is marked fixed.',
    '',
    'Your message:',
    entry.message || '',
    site ? `\nApp: ${site}` : '',
  ].filter(Boolean);

  return sendEmail({
    to: [to],
    subject: `We received your feedback (ticket ${ticket})`,
    text: lines.join('\n'),
  });
}

async function sendUserTicketFixed(entry) {
  const to = entry.ticketEmail || extractTicketEmail(entry.contact);
  if (!to) return { sent: false, reason: 'no_user_email' };

  const ticket = entry.id || 'unknown';
  const site = getSiteUrl(entry);
  const lines = [
    'Your Hebrew Contour App feedback ticket has been marked fixed.',
    '',
    `Ticket ID: ${ticket}`,
    `Category: ${entry.category || 'general'}`,
    entry.fixedAt ? `Fixed: ${entry.fixedAt}` : '',
    '',
    'Original message:',
    entry.message || '',
    '',
    'If something is still wrong, please submit a new message from the app.',
    site ? `App: ${site}` : '',
  ].filter(Boolean);

  return sendEmail({
    to: [to],
    subject: `Your feedback was addressed (ticket ${ticket})`,
    text: lines.join('\n'),
  });
}

module.exports = {
  extractTicketEmail,
  parseEmailList,
  resolveAdminNotifyEmails,
  sendAdminNewFeedback,
  sendUserTicketReceived,
  sendUserTicketFixed,
  sendFeedbackNotification: sendAdminNewFeedback,
};
