// Forgot password: email link, single-use hashed tokens, expiry, session revocation and limits.
const { after, before, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.FORGOT_PASSWORD_MAX_PER_HOUR = '4';
process.env.APP_URL = 'https://staffsync.example';

const { setup } = require('./helpers');
const { getOutbox, clearOutbox } = require('../utils/mailer');

const GENERIC = 'If an account exists for that email, a reset link has been sent.';

// The email is sent after the response, so wait for it to arrive.
const waitForEmail = async (count = 1, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (getOutbox().length < count) {
    if (Date.now() > deadline) throw new Error(`expected ${count} email(s), got ${getOutbox().length}`);
    await new Promise((resolve) => { setTimeout(resolve, 25); });
  }
  return getOutbox()[count - 1];
};
// Gives a background job the chance to run, then confirms nothing was sent.
const settle = () => new Promise((resolve) => { setTimeout(resolve, 400); });
const tokenFrom = (email) => email.text.match(/reset-password\?token=([a-f0-9]{64})/)[1];

describe('forgot and reset password', () => {
  let ctx;
  let user;

  before(async () => {
    ctx = await setup('password_reset');
    user = await ctx.makeUser({ name: 'Asha <b>Kumar</b>', email: 'asha@t.test' });
  });
  after(async () => { await ctx.teardown(); });
  beforeEach(() => clearOutbox());

  const forgot = (email) => ctx.call('POST', '/auth/forgot-password', null, { email });
  const reset = (token, newPassword) => ctx.call('POST', '/auth/reset-password', null, { token, newPassword });
  const login = (password) => ctx.call('POST', '/auth/login', null, { email: 'asha@t.test', password });

  it('replies the same way for unknown emails and sends nothing', async () => {
    const x = await forgot('nobody@t.test');
    assert.equal(x.status, 200);
    assert.equal(x.body.message, GENERIC);
    await settle();
    assert.equal(getOutbox().length, 0);
  });

  it('emails a single-use link and stores only a hash of the token', async () => {
    const x = await forgot('ASHA@t.test');
    assert.equal(x.body.message, GENERIC);
    const email = await waitForEmail();
    assert.equal(email.to, 'asha@t.test');
    assert.equal(email.subject, 'Reset your StaffSync password');
    assert.match(email.text, /^https:\/\/staffsync\.example\/reset-password\?token=[a-f0-9]{64}$/m);
    assert.match(email.text, /expires in 30 minutes/);
    assert.ok(email.html.includes('Asha &lt;b&gt;Kumar&lt;/b&gt;'), 'name is escaped in HTML');

    const token = tokenFrom(email);
    const stored = await ctx.models.User.findById(user.user._id).select('+passwordResetTokenHash +passwordResetExpires');
    assert.notEqual(stored.passwordResetTokenHash, token);
    assert.equal(stored.passwordResetTokenHash.length, 64);
    assert.ok(stored.passwordResetExpires > new Date());
  });

  it('resets the password once, signing out every existing session', async () => {
    await forgot('asha@t.test');
    const token = tokenFrom(await waitForEmail());
    const oldToken = user.token;
    await new Promise((resolve) => { setTimeout(resolve, 1100); }); // old token issued in an earlier second

    assert.equal((await reset(token, 'short')).status, 400, 'password rules apply');
    const x = await reset(token, 'Reset1234!');
    assert.equal(x.status, 200);
    assert.equal(x.body.message, 'Your password has been reset. Please log in.');

    assert.equal((await reset(token, 'Another123')).status, 400, 'the link works only once');
    assert.equal((await login('Passw0rd123')).status, 401);
    assert.equal((await login('Reset1234!')).status, 200);
    assert.equal((await ctx.call('GET', '/auth/me', oldToken)).body.message, 'Your password was changed. Please log in again.');
    const cleared = await ctx.models.User.findById(user.user._id).select('+passwordResetTokenHash');
    assert.equal(cleared.passwordResetTokenHash, undefined);
  });

  it('rejects unknown, malformed, superseded and expired tokens', async () => {
    assert.equal((await reset('f'.repeat(64), 'Reset1234!')).body.message, 'This reset link is invalid or has expired. Please request a new one.');
    assert.equal((await reset('not-a-token', 'Reset1234!')).body.errors[0].message, 'This reset link is not valid');

    await forgot('asha@t.test');
    const first = tokenFrom(await waitForEmail(1));
    await forgot('asha@t.test');
    const second = tokenFrom(await waitForEmail(2));
    assert.equal((await reset(first, 'Reset5678!')).status, 400, 'a newer request cancels the older link');

    await ctx.models.User.updateOne({ _id: user.user._id }, { passwordResetExpires: new Date(Date.now() - 1000) });
    assert.equal((await reset(second, 'Reset5678!')).status, 400, 'expired');
  });

  it('sends nothing to deactivated accounts', async () => {
    const gone = await ctx.makeUser({ email: 'gone@t.test', active: false });
    assert.equal((await forgot('gone@t.test')).body.message, GENERIC);
    await settle();
    assert.equal(getOutbox().length, 0);
    assert.ok(gone);
  });

  it('limits reset requests per address and email', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) statuses.push((await forgot('limit@t.test')).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
    assert.equal((await forgot('someone-else@t.test')).status, 200, 'other emails are unaffected');
  });

  it('refuses unknown fields and invalid emails', async () => {
    assert.equal((await ctx.call('POST', '/auth/forgot-password', null, { email: 'a@t.test', role: 'hr' })).status, 400);
    assert.equal((await forgot('not-an-email')).status, 400);
    assert.equal((await ctx.call('POST', '/auth/reset-password', null, { token: 'a'.repeat(64), newPassword: 'Reset1234!', email: 'x' })).status, 400);
  });

  it('says so in production when no email server is configured', async () => {
    process.env.NODE_ENV = 'production';
    // A fresh email: asha@ has used up this file's reset-request limit above.
    const x = await forgot('prod@t.test');
    process.env.NODE_ENV = 'test';
    assert.equal(x.status, 503);
    assert.equal(x.body.message, 'Password reset by email is not available. Contact HR.');
  });
});
