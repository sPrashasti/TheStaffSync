// Phase 15: security hardening — headers, rate limits, injection attempts, mass assignment,
// password changes and production configuration.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Low limits for this file only (each test file runs in its own process).
process.env.LOGIN_MAX_FAILURES = '3';
process.env.SIGNUP_MAX_PER_HOUR = '3';

const { setup } = require('./helpers');

describe('security hardening', () => {
  let ctx;
  let hr;
  let employee;

  before(async () => {
    ctx = await setup('security');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr' });
    employee = await ctx.makeUser({ email: 'emp@t.test' });
  });
  after(async () => { await ctx.teardown(); });

  const raw = (urlPath, init = {}) => fetch(ctx.base + urlPath, init);

  it('sends hardening headers and forbids caching', async () => {
    const res = await raw('/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('strict-transport-security'), /max-age=\d+/);
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.ok(res.headers.get('ratelimit-policy'), 'rate-limit policy advertised');
  });

  it('allows the configured frontend origin and refuses others', async () => {
    const allowed = (process.env.CLIENT_URL || '').split(',')[0].trim();
    const ok = await raw('/health', { headers: { Origin: allowed } });
    assert.equal(ok.headers.get('access-control-allow-origin'), allowed);
    const evil = await raw('/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(evil.status, 403);
  });

  it('refuses repeated query parameters', async () => {
    const x = await ctx.call('GET', '/leaves?status=pending&status=approved', hr.token);
    assert.equal(x.status, 400);
    assert.equal(x.body.message, 'Each query parameter may only appear once');
    assert.deepEqual(x.body.errors, [{ field: 'status', message: 'Repeated parameter' }]);
  });

  it('rejects MongoDB operator injection in bodies and query strings', async () => {
    assert.equal((await ctx.call('POST', '/auth/login', null, { email: { $gt: '' }, password: { $gt: '' } })).status, 400);
    assert.equal((await ctx.call('GET', '/employees?role[$ne]=hr', hr.token)).status, 400);
    assert.equal((await ctx.call('GET', '/employees?department[$regex]=.*', hr.token)).status, 400);
    const emp = await ctx.models.Employee.findOne({ userId: employee.user._id });
    assert.equal((await ctx.call('PUT', `/employees/${emp._id}`, hr.token, { managerId: { $ne: null } })).status, 400);
    assert.equal((await ctx.call('POST', '/leaves', employee.token, { leaveType: { $gt: '' }, startDate: '2030-01-01', endDate: '2030-01-01', reason: 'x' })).status, 400);
  });

  it('refuses privilege fields on organisation sign-up', async () => {
    const x = await ctx.call('POST', '/organisations/signup', null, {
      companyName: 'Sneaky Co', name: 'Sneaky', email: 'sneaky@t.test', password: 'Passw0rd123', role: 'employee', isActive: false, passwordChangedAt: '2000-01-01',
    });
    assert.equal(x.status, 400);
    assert.deepEqual(x.body.errors.map((e) => e.field).sort(), ['isActive', 'passwordChangedAt', 'role']);
    assert.equal(await ctx.asPlatform(() => ctx.models.User.exists({ email: 'sneaky@t.test' })), null);
  });

  it('limits sign-ups per address', async () => {
    // One sign-up attempt already happened above; the limit for this file is 3 per hour.
    const results = [];
    for (const n of [1, 2, 3]) {
      results.push((await ctx.call('POST', '/organisations/signup', null, { companyName: `Co ${n}`, name: 'R', email: `r${n}@t.test`, password: 'Passw0rd123' })).status);
    }
    assert.deepEqual(results, [201, 201, 429]);
  });

  it('locks an account after repeated failed logins, without affecting others', async () => {
    const attempt = (email, password) => ctx.call('POST', '/auth/login', null, { email, password });
    for (let i = 0; i < 3; i += 1) assert.equal((await attempt('emp@t.test', 'WrongPass1')).status, 401);
    const blocked = await attempt('emp@t.test', 'WrongPass1');
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.message, /^Too many failed login attempts\. Try again in 15 minutes\.$/);
    assert.equal((await attempt('emp@t.test', 'Passw0rd123')).status, 429, 'even the right password waits out the lock');
    assert.equal((await attempt('HR@t.test', 'Passw0rd123')).status, 200, 'other accounts are unaffected');
  });

  it('does not count successful logins towards the lock', async () => {
    const other = await ctx.makeUser({ email: 'ok@t.test' });
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'ok@t.test', password: 'Passw0rd123' })).status, 200);
    }
    assert.ok(other);
  });

  it('changes a password, revoking every older token', async () => {
    const user = await ctx.makeUser({ email: 'change@t.test' });
    const oldToken = user.token;
    const change = (token, b) => ctx.call('PUT', '/auth/password', token, b);

    let x = await change(oldToken, { currentPassword: 'Wrong999x', newPassword: 'NewPassw0rd1' });
    assert.equal(x.status, 400, 'a wrong current password is a form error, not a sign-out');
    assert.deepEqual(x.body.errors, [{ field: 'currentPassword', message: 'Current password is incorrect' }]);
    assert.equal((await change(oldToken, { currentPassword: 'Passw0rd123', newPassword: 'short' })).status, 400);

    // Make sure the old token's issue time is in an earlier second than the change.
    await new Promise((resolve) => { setTimeout(resolve, 1100); });
    x = await change(oldToken, { currentPassword: 'Passw0rd123', newPassword: 'NewPassw0rd1' });
    assert.equal(x.status, 200);
    const newToken = x.body.data.token;

    assert.equal((await ctx.call('GET', '/auth/me', newToken)).status, 200, 'this session continues');
    const old = await ctx.call('GET', '/auth/me', oldToken);
    assert.equal(old.status, 401);
    assert.equal(old.body.message, 'Your password was changed. Please log in again.');
    assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'change@t.test', password: 'Passw0rd123' })).status, 401);
    assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'change@t.test', password: 'NewPassw0rd1' })).status, 200);
    assert.ok(!JSON.stringify((await ctx.call('GET', '/auth/me', newToken)).body).includes('passwordChangedAt'));
  });

  it('validates password changes and limits failed attempts per account', async () => {
    const user = await ctx.makeUser({ email: 'guess@t.test' });
    const change = (b) => ctx.call('PUT', '/auth/password', user.token, b);
    assert.equal((await change({ currentPassword: 'Passw0rd123', newPassword: 'Passw0rd123' })).body.errors[0].message, 'New password must be different from the current one');
    assert.equal((await change({ currentPassword: 'Passw0rd123', newPassword: 'NewPassw0rd1', role: 'hr' })).body.errors[0].message, 'Unknown field');
    assert.equal((await change({ currentPassword: 'Guess1234x', newPassword: 'NewPassw0rd1' })).status, 400);
    // Three failures for this file's limit of 3: the next attempt is refused.
    assert.equal((await change({ currentPassword: 'Passw0rd123', newPassword: 'NewPassw0rd1' })).status, 429);
  });

  it('refuses to start in production without a CORS allow-list', () => {
    const { assertProductionConfig } = require('../config/security');
    process.env.NODE_ENV = 'production';
    assert.throws(() => assertProductionConfig([]), /CLIENT_URL must list/);
    assert.doesNotThrow(() => assertProductionConfig(['https://app.example']));
    process.env.NODE_ENV = 'test';
    assert.doesNotThrow(() => assertProductionConfig([]));
  });

  it('never returns password hashes from any user-facing endpoint', async () => {
    const responses = await Promise.all([
      ctx.call('GET', '/auth/me', hr.token),
      ctx.call('GET', '/employees', hr.token),
      ctx.call('GET', '/employees/me', hr.token),
      ctx.call('POST', '/auth/login', null, { email: 'hr@t.test', password: 'Passw0rd123' }),
    ]);
    for (const r of responses) assert.ok(!/\$2[aby]\$/.test(JSON.stringify(r.body)), 'no bcrypt hash in response');
  });
});
