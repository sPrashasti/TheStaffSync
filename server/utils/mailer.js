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

// Sends one email. Resolves when handed to the SMTP server (or captured locally).
const sendMail = async ({ to, subject, text, html }) => {
  const message = { from: sender(), to, subject, text, html };
  await getTransport().sendMail(message);

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === 'test') {
      outbox.push(message);
    } else {
      console.log(`\n--- Email (SMTP not configured, so printed here instead) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--- End of email ---\n`);
    }
  }
};

// Test helpers.
const getOutbox = () => outbox;
const clearOutbox = () => { outbox.length = 0; };

module.exports = { sendMail, isMailConfigured, getOutbox, clearOutbox };
