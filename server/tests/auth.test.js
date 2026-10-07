// Phase 4: registration, login, tokens and the protect middleware.
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

  const register = (b) => ctx.call('POST', '/auth/register', null, b);
  const login = (b) => ctx.call('POST', '/auth/login', null, b);

  it('registers an employee with a hashed password and an Unassigned profile', async () => {
    const x = await register({ name: '  Asha  ', email: ' Asha@Example.COM ', password: 'Passw0rd123', role: 'hr' });
    assert.equal(x.status, 201);
    assert.equal(x.body.data.user.role, 'employee', 'role in body is ignored');
    assert.ok(!JSON.stringify(x.body).includes('password'));
    const stored = await ctx.models.User.findOne({ email: 'asha@example.com' }).select('+password');
    assert.equal(stored.name, 'Asha');
    assert.match(stored.password, /^\$2[aby]\$12\$/);
    const emp = await ctx.models.Employee.findOne({ userId: stored._id });
    assert.equal(emp.department, 'Unassigned');
    userId = stored._id;
    const decoded = jwt.decode(x.body.data.token, { complete: true });
    assert.equal(decoded.header.alg, 'HS256');
    assert.deepEqual(Object.keys(decoded.payload).sort(), ['exp', 'iat', 'id']);
  });

  it('enforces the password policy, including the 72-byte bcrypt limit', async () => {
    let x = await register({ name: 'L', email: 'long@e.com', password: `a1${'x'.repeat(71)}` });
    assert.equal(x.body.errors[0].message, 'Password must be at most 72 bytes');
    x = await register({ name: 'L', email: 'long@e.com', password: `a1${'x'.repeat(70)}` });
    assert.equal(x.status, 201);
    x = await register({ name: 'N', email: 'n@e.com', password: 'abcdefghij' });
    assert.equal(x.body.errors[0].message, 'Password must contain a number');
  });

  it('rejects duplicates, including simultaneous ones, without orphan records', async () => {
    assert.equal((await register({ name: 'X', email: 'asha@example.com', password: 'Passw0rd123' })).status, 409);
    const race = await Promise.all([1, 2, 3].map(() => register({ name: 'R', email: 'race@e.com', password: 'Passw0rd123' })));
    assert.deepEqual(race.map((r) => r.status).sort(), [201, 409, 409]);
    assert.equal(await ctx.models.User.countDocuments(), await ctx.models.Employee.countDocuments());
  });

  it('rolls back the user if the employee profile cannot be created', async () => {
    const real = ctx.models.Employee.create;
    ctx.models.Employee.create = async () => { throw new Error('simulated failure'); };
    const error = console.error;
    console.error = () => {};
    const x = await register({ name: 'Rb', email: 'rb@e.com', password: 'Passw0rd123' });
    console.error = error;
    ctx.models.Employee.create = real;
    assert.equal(x.status, 500);
    assert.equal(await ctx.models.User.exists({ email: 'rb@e.com' }), null);
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
    const expired = jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
    assert.equal((await ctx.call('GET', '/auth/me', expired)).body.message, 'Your session has expired. Please log in again.');
    const forged = jwt.sign({ id }, 'another-secret-that-is-long-enough-1234567', { algorithm: 'HS256' });
    assert.equal((await ctx.call('GET', '/auth/me', forged)).status, 401);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    assert.equal((await ctx.call('GET', '/auth/me', `${b64({ alg: 'none' })}.${b64({ id })}.`)).status, 401);
    const badId = jwt.sign({ id: 'garbage' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    assert.equal((await ctx.call('GET', '/auth/me', badId)).status, 401);
  });

  it('applies deactivation and role changes immediately to existing tokens', async () => {
    await ctx.models.User.updateOne({ _id: userId }, { role: 'manager' });
    assert.equal((await ctx.call('GET', '/auth/me', token)).body.data.user.role, 'manager');
    await ctx.models.User.updateOne({ _id: userId }, { isActive: false });
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
