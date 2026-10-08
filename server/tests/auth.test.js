// Organisation sign-up, login, tokens and the protect middleware.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { setup } = require('./helpers');

describe('authentication', () => {
  let ctx;
  let token;
  let userId;

  before(async () => { ctx = await setup('auth'); });
  after(async () => { await ctx.teardown(); });

  const signup = (b) => ctx.call('POST', '/organisations/signup', null, b);
  const login = (b) => ctx.call('POST', '/auth/login', null, b);
  // Accounts created by sign-up are in their own new organisation, so checks look platform-wide.
  const platform = (fn) => ctx.asPlatform(fn);

  it('has no employee self-registration', async () => {
    const x = await ctx.call('POST', '/auth/register', null, { name: 'A', email: 'self@e.com', password: 'Passw0rd123' });
    assert.equal(x.status, 404);
  });

  it('signs up an organisation with its first HR user, hashed password and profile', async () => {
    const x = await signup({ companyName: '  Asha Ltd ', name: '  Asha  ', email: ' Asha@Example.COM ', password: 'Passw0rd123' });
    assert.equal(x.status, 201);
    assert.equal(x.body.data.user.role, 'hr', 'the person signing up runs the new organisation');
    assert.equal(x.body.data.organisation.name, 'Asha Ltd');
    assert.equal(x.body.data.organisation.slug, 'asha-ltd');
    assert.ok(!JSON.stringify(x.body).includes('password'));
    const stored = await platform(() => ctx.models.User.findOne({ email: 'asha@example.com' }).select('+password'));
    assert.equal(stored.name, 'Asha');
    assert.equal(String(stored.organisationId), x.body.data.organisation._id);
    assert.match(stored.password, /^\$2[aby]\$12\$/);
    const emp = await platform(() => ctx.models.Employee.findOne({ userId: stored._id }));
    assert.equal(emp.department, 'Human Resources');
    assert.equal(emp.employeeId, 'EMP0001', 'every organisation numbers from EMP0001');
    userId = stored._id;
    const decoded = jwt.decode(x.body.data.token, { complete: true });
    assert.equal(decoded.header.alg, 'HS256');
    assert.deepEqual(Object.keys(decoded.payload).sort(), ['exp', 'iat', 'id', 'scope']);
    assert.equal(decoded.payload.scope, 'org');
  });

  it('refuses privilege and organisation fields on sign-up', async () => {
    for (const extra of [{ role: 'employee' }, { organisationId: String(ctx.organisation._id) }, { status: 'active' }, { slug: 'x' }]) {
      const x = await signup({ companyName: 'Sneaky', name: 'S', email: 'sneaky@e.com', password: 'Passw0rd123', ...extra });
      assert.equal(x.status, 400, JSON.stringify(extra));
      assert.equal(x.body.errors[0].message, 'Unknown field');
    }
  });

  it('enforces the password policy, including the 72-byte bcrypt limit', async () => {
    const org = { companyName: 'Long Co', name: 'L' };
    let x = await signup({ ...org, email: 'long@e.com', password: `a1${'x'.repeat(71)}` });
    assert.equal(x.body.errors[0].message, 'Password must be at most 72 bytes');
    x = await signup({ ...org, email: 'long@e.com', password: `a1${'x'.repeat(70)}` });
    assert.equal(x.status, 201);
    x = await signup({ ...org, email: 'n@e.com', password: 'abcdefghij' });
    assert.equal(x.body.errors[0].message, 'Password must contain a number');
  });

  it('keeps emails unique across organisations, including simultaneous sign-ups, without orphan records', async () => {
    const taken = await signup({ companyName: 'Other Co', name: 'X', email: 'asha@example.com', password: 'Passw0rd123' });
    assert.equal(taken.status, 409, 'an email used in one organisation cannot sign up another');
    const race = await Promise.all([1, 2, 3].map(() => signup({ companyName: 'Race Co', name: 'R', email: 'race@e.com', password: 'Passw0rd123' })));
    assert.deepEqual(race.map((r) => r.status).sort(), [201, 409, 409]);
    await platform(async () => {
      assert.equal(await ctx.models.User.countDocuments(), await ctx.models.Employee.countDocuments());
      // The test organisation plus Asha Ltd, Long Co and one Race Co.
      assert.equal(await ctx.models.Organisation.countDocuments(), 4, 'refused sign-ups leave no organisation behind');
    });
  });

  it('rolls back the organisation and user if the employee profile cannot be created', async () => {
    const real = ctx.models.Employee.create;
    ctx.models.Employee.create = async () => { throw new Error('simulated failure'); };
    const error = console.error;
    console.error = () => {};
    const x = await signup({ companyName: 'Rollback Co', name: 'Rb', email: 'rb@e.com', password: 'Passw0rd123' });
    console.error = error;
    ctx.models.Employee.create = real;
    assert.equal(x.status, 500);
    assert.equal(await platform(() => ctx.models.User.exists({ email: 'rb@e.com' })), null);
    assert.equal(await ctx.models.Organisation.exists({ name: 'Rollback Co' }), null);
  });

  it('logs in case-insensitively with one message for wrong password and unknown email', async () => {
    const ok = await login({ email: 'ASHA@example.com', password: 'Passw0rd123' });
    assert.equal(ok.status, 200);
    token = ok.body.data.token;
    const wrong = await login({ email: 'asha@example.com', password: 'Wrong999x' });
    const unknown = await login({ email: 'nobody@e.com', password: 'Passw0rd123' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
    assert.equal((await login({ email: { $gt: '' }, password: { $gt: '' } })).status, 400);
  });

  it('protects /auth/me and rejects bad, expired, forged and alg:none tokens', async () => {
    assert.equal((await ctx.call('GET', '/auth/me', token)).status, 200);
    assert.equal((await ctx.call('GET', '/auth/me')).status, 401);
    const id = String(userId);
    const expired = jwt.sign({ id, scope: 'org' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
    assert.equal((await ctx.call('GET', '/auth/me', expired)).body.message, 'Your session has expired. Please log in again.');
    const forged = jwt.sign({ id, scope: 'org' }, 'another-secret-that-is-long-enough-1234567', { algorithm: 'HS256' });
    assert.equal((await ctx.call('GET', '/auth/me', forged)).status, 401);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    assert.equal((await ctx.call('GET', '/auth/me', `${b64({ alg: 'none' })}.${b64({ id })}.`)).status, 401);
    const badId = jwt.sign({ id: 'garbage', scope: 'org' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    assert.equal((await ctx.call('GET', '/auth/me', badId)).status, 401);
    // Valid signature, but not an organisation token: pre-Phase-19 tokens and platform tokens.
    const noScope = jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    assert.equal((await ctx.call('GET', '/auth/me', noScope)).status, 401);
    assert.equal((await ctx.call('GET', '/auth/me', ctx.signToken(id, 'platform'))).status, 401);
    const me = await ctx.call('GET', '/auth/me', token);
    assert.equal(me.body.data.organisation.name, 'Asha Ltd');
  });

  it('applies deactivation and role changes immediately to existing tokens', async () => {
    await platform(() => ctx.models.User.updateOne({ _id: userId }, { role: 'manager' }));
    assert.equal((await ctx.call('GET', '/auth/me', token)).body.data.user.role, 'manager');
    await platform(() => ctx.models.User.updateOne({ _id: userId }, { isActive: false }));
    assert.equal((await ctx.call('GET', '/auth/me', token)).body.message, 'This account has been deactivated.');
    assert.equal((await login({ email: 'asha@example.com', password: 'Passw0rd123' })).body.message, 'This account has been deactivated. Contact HR.');
  });

  it('refuses to start with a missing or weak JWT_SECRET', () => {
    const { assertJwtConfig } = require('../utils/token');
    const saved = process.env.JWT_SECRET;
    for (const bad of ['', 'your_long_random_secret', 'short']) {
      process.env.JWT_SECRET = bad;
      assert.throws(assertJwtConfig);
    }
    process.env.JWT_SECRET = saved;
    assert.doesNotThrow(assertJwtConfig);
  });
});
