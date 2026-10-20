// Sends email over SMTP (any provider: Microsoft 365, Gmail, SendGrid…), configured in .env.
//
// Without SMTP settings:
//   - development: the message is printed in the server terminal, so links can be used locally
//   - test:        the message is kept in memory (getOutbox) for the test suite to read
//   - production:  isMailConfigured() is false and callers must refuse to pretend they sent it
const nodemailer = require('nodemailer');

const outbox = [];
let transport;

const isMailConfigured = () => Boolean(process.env.SMTP_HOST);

const getTransport = () => {
  if (transport) return transport;
  if (isMailConfigured()) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 uses TLS from the start; 587 upgrades with STARTTLS.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    // Builds the message without sending it anywhere.
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
};

const sender = () => process.env.MAIL_FROM || 'StaffSync <no-reply@staffsync.local>';

// Why emails would not be delivered even though SMTP accepts them, or null. Providers such as
// Brevo only deliver from a sender address verified in the provider's dashboard; their SMTP
// login (…@smtp-brevo.com) is not one, and messages from it are accepted and then dropped.
const senderProblem = () => {
  if (!isMailConfigured()) return null;
  const from = process.env.MAIL_FROM;
  if (!from) return 'MAIL_FROM is not set, so emails are sent from an address no provider will deliver for.';
  if (/@smtp-brevo\.com\b/i.test(from)) {
    return 'MAIL_FROM is your Brevo SMTP login, not a verified sender. Verify a sender address in Brevo (Senders, Domains & Dedicated IPs → Senders) and set MAIL_FROM to it.';
  }
  return null;
};

// Sends one email. Resolves when handed to the SMTP server (or captured locally).
const sendMail = async ({ to, subject, text, html }) => {
  const message = { from: sender(), to, subject, text, html };
  await getTransport().sendMail(message);

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === 'test') {
      outbox.push(message);
    } else {
      console.log(`\n--- Email (SMTP not configured, printed locally) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--- End of email ---\n`);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`\n--- Email Sent via SMTP ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--- End of email ---\n`);
  }
};

// Test helpers.
const getOutbox = () => outbox;
const clearOutbox = () => { outbox.length = 0; };

module.exports = { sendMail, isMailConfigured, senderProblem, getOutbox, clearOutbox };
