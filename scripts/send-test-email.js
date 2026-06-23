/**
 * Send a one-off test email via Resend.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxxxxxxxx node scripts/send-test-email.js
 *
 * Replace re_xxxxxxxxx with your real API key from https://resend.com/api-keys
 */
const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey || apiKey === 're_xxxxxxxxx') {
  console.error(
    'Set RESEND_API_KEY to your real Resend API key (replace re_xxxxxxxxx).'
  );
  process.exit(1);
}

const resend = new Resend(apiKey);

resend.emails
  .send({
    from: 'onboarding@resend.dev',
    to: 'kindonjoe@gmail.com',
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
  })
  .then(({ data, error }) => {
    if (error) {
      console.error('Send failed:', error);
      process.exit(1);
    }
    console.log('Email sent:', data);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
