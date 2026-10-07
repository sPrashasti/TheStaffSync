// Phase 3: response envelope, central error handling, validation and pagination helpers.
// Uses a small app built from the real middleware, with routes that trigger each error type.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { body } = require('express-validator');
const { setup } = require('./helpers');

describe('foundation: errors, responses, validation', () => {
  let ctx;
  let call;

  before(async () => {
    ctx = await setup('foundation');
    const { notFound, errorHandler } = require('../middleware/errorMiddleware');
    const { validate, validateObjectId } = require('../middleware/validate');
    const AppError = require('../utils/AppError');
    const { sendSuccess, sendCreated } = require('../utils/apiResponse');
    const { User, Employee, Attendance } = ctx.models;

    const app = express();
    app.use(express.json({ limit: '10kb' }));
    app.get('/ok', (q, s) => sendSuccess(s, { message: 'fine', data: { a: 1 } }));
    app.post('/created', (q, s) => sendCreated(s, { message: 'made', data: { id: 1 } }));
    app.get('/app-error', () => { throw new AppError('Leave request not found', 404); });
    app.get('/async-error', async () => { await Promise.resolve(); throw new AppError('Async failure surfaced', 403); });
    app.get('/crash', async () => { const o = null; return o.x; });
    app.get('/users/:id', validateObjectId(), async (q, s) => {
      const x = await User.findById(q.params.id);
      if (!x) throw new AppError('User not found', 404);
      sendSuccess(s, { data: x });
    });
    app.get('/raw/:id', async (q, s) => sendSuccess(s, { data: await User.findById(q.params.id) }));
    app.post('/users', async (q, s) => sendCreated(s, { data: await User.create(q.body) }));
    app.post('/validated', body('email').isEmail().withMessage('Email is not valid'), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'), validate, (q, s) => sendSuccess(s));
    app.get('/strict', async () => User.find({ notAField: 1 }));
    app.get('/attendance-dup', async () => {
      const [x] = await User.find().limit(1);
      const e = await Employee.create({ userId: x._id, department: 'a', designation: 'b' });
      await Attendance.create({ employeeId: e._id, date: '2026-10-07', timeZone: 'UTC', checkIn: new Date() });
      await Attendance.create({ employeeId: e._id, date: '2026-10-07', timeZone: 'UTC', checkIn: new Date() });
    });
    app.use(notFound);
    app.use(errorHandler);

    const server = app.listen(0);
    const base = `http://localhost:${server.address().port}`;
    ctx.extraServer = server;
    call = async (method, p, b, raw) => {
      const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: raw ?? (b && JSON.stringify(b)) });
      return { status: res.status, body: await res.json() };
    };
  });

  after(async () => {
    await new Promise((r) => ctx.extraServer.close(r));
    await ctx.teardown();
  });

  it('wraps success in { success, message, data }', async () => {
    const x = await call('GET', '/ok');
    assert.equal(x.status, 200);
    assert.deepEqual(x.body, { success: true, message: 'fine', data: { a: 1 } });
    assert.equal((await call('POST', '/created')).status, 201);
  });

  it('turns AppError and async throws into their status (Express 5)', async () => {
    let x = await call('GET', '/app-error');
    assert.equal(x.status, 404);
    assert.equal(x.body.message, 'Leave request not found');
    assert.equal(x.body.stack, undefined);
    x = await call('GET', '/async-error');
    assert.equal(x.status, 403);
  });

  it('reports unexpected bugs as 500 with a stack outside production only', async () => {
    let x = await call('GET', '/crash');
    assert.equal(x.status, 500);
    assert.equal(typeof x.body.stack, 'string');
    process.env.NODE_ENV = 'production';
    x = await call('GET', '/crash');
    process.env.NODE_ENV = 'test';
    assert.equal(x.body.message, 'Internal Server Error');
    assert.ok(!('stack' in x.body));
  });

  it('maps body-parser errors: unknown route 404, bad JSON 400, oversized 413', async () => {
    assert.equal((await call('GET', '/nope')).body.message, 'Route not found: GET /nope');
    assert.equal((await call('POST', '/users', null, '{bad json')).body.message, 'Request body contains invalid JSON');
    const big = await call('POST', '/users', { name: 'a'.repeat(20000) });
    assert.equal(big.status, 413);
  });

  it('maps Mongoose validation to 400 with fields and hides submitted values', async () => {
    let x = await call('POST', '/users', { name: 'A', email: 'nope', role: 'admin' });
    assert.equal(x.status, 400);
    for (const f of ['email', 'password', 'role']) assert.ok(x.body.errors.some((e) => e.field === f), f);
    x = await call('POST', '/users', { name: 'A', email: 'a@b.com', password: 'secretpw', isActive: 'maybe' });
    assert.equal(x.body.errors[0].message, 'Invalid value for isActive');
    assert.ok(!JSON.stringify(x.body).includes('maybe'));
  });

  it('maps duplicate keys to 409 naming the fields', async () => {
    assert.equal((await call('POST', '/users', { name: 'A', email: 'a@b.com', password: 'h' })).status, 201);
    const dup = await call('POST', '/users', { name: 'B', email: 'A@B.com', password: 'h' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.message, 'A record with this email already exists');
    const compound = await call('GET', '/attendance-dup');
    assert.equal(compound.body.message, 'A record with this employeeId and date already exists');
  });

  it('handles ids: malformed 400 before the database, unknown 404', async () => {
    assert.equal((await call('GET', '/users/not-an-id')).status, 400);
    assert.equal((await call('GET', '/users/64b7f0000000000000000000')).body.message, 'User not found');
    assert.equal((await call('GET', '/raw/xyz')).body.message, 'Resource not found');
  });

  it('runs express-validator rules and rejects unknown query fields', async () => {
    let x = await call('POST', '/validated', { email: 'bad', password: 'short' });
    assert.equal(x.status, 400);
    assert.equal(x.body.errors.length, 2);
    assert.ok(!JSON.stringify(x.body).includes('short"'));
    assert.equal((await call('POST', '/validated', { email: 'a@b.com', password: 'longenough' })).status, 200);
    x = await call('GET', '/strict');
    assert.equal(x.body.message, 'Request contains an unknown field');
  });

  it('parses pagination safely', () => {
    const { getPagination, buildPage } = require('../utils/pagination');
    assert.deepEqual(getPagination({ page: '3', limit: '20' }), { page: 3, limit: 20, skip: 40 });
    assert.deepEqual(getPagination({ page: '-2', limit: 'abc' }), { page: 1, limit: 10, skip: 0 });
    assert.equal(getPagination({ limit: '5000' }).limit, 100);
    assert.equal(buildPage([1, 2], 21, { page: 1, limit: 10 }).totalPages, 3);
  });
});
