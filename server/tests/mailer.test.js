// The sender check that warns at start-up when emails would be accepted but never delivered.
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { senderProblem } = require('../utils/mailer');

describe('mail sender check', () => {
  const saved = { SMTP_HOST: process.env.SMTP_HOST, MAIL_FROM: process.env.MAIL_FROM };
  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('says nothing when SMTP is not configured', () => {
    delete process.env.SMTP_HOST;
    process.env.MAIL_FROM = 'abc@smtp-brevo.com';
    assert.equal(senderProblem(), null);
  });

  it('flags a missing sender and the Brevo SMTP login used as the sender', () => {
    process.env.SMTP_HOST = 'smtp-relay.brevo.com';
    delete process.env.MAIL_FROM;
    assert.match(senderProblem(), /MAIL_FROM is not set/);
    process.env.MAIL_FROM = 'StaffSync <9a1b2c001@smtp-brevo.com>';
    assert.match(senderProblem(), /Brevo SMTP login/);
  });

  it('accepts a real sender address', () => {
    process.env.SMTP_HOST = 'smtp-relay.brevo.com';
    process.env.MAIL_FROM = 'StaffSync <hr@example.com>';
    assert.equal(senderProblem(), null);
  });
});
