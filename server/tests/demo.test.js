// Phase 20: the public demo organisation — one-click sign-in, what the demo refuses, and the
// nightly reset back to the baseline.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { clearOutbox, getOutbox } = require('../utils/mailer');

describe('public demo', () => {
  let ctx;
  let demo;
  let people;
  let other;

  const demoLogin = (role) => ctx.call('POST', '/demo/login', null, { role });
  const tokenFor = async (role) => (await demoLogin(role)).body.data.token;

  before(async () => {
    ctx = await setup('demo', { strict: true });
    // A separate real organisation, which the demo must never touch.
    const signup = await ctx.call('POST', '/organisations/signup', null, { companyName: 'Real Co', name: 'Real HR', email: 'hr@real.test', password: 'Passw0rd123' });
    other = { token: signup.body.data.token, id: signup.body.data.organisation._id };
  });
  after(async () => { await ctx.teardown(); });

  it('is unavailable until the platform sets it up', async () => {
    assert.deepEqual((await ctx.call('GET', '/demo')).body.data, { available: false });
    assert.equal((await demoLogin('hr')).status, 404);
  });

  it('can only be set up from the platform side, for accounts in that organisation', async () => {
    demo = await ctx.makeOrganisation('Demo Co', { settings: { timeZone: 'Europe/London' } });
    const hr = await ctx.makeUser({ organisation: demo, email: 'hr@staffsync.demo', role: 'hr' });
    const manager = await ctx.makeUser({ organisation: demo, email: 'manager@staffsync.demo', role: 'manager' });
    const employee = await ctx.makeUser({ organisation: demo, email: 'employee1@staffsync.demo', managerId: manager.emp._id });
    const extra = await ctx.makeUser({ organisation: demo, email: 'extra@staffsync.test', managerId: manager.emp._id });
    people = { hr, manager, employee, extra };
    const service = require('../services/demoService');
    await assert.rejects(service.setupDemo(demo, { hr: 'hr@real.test', manager: 'manager@staffsync.demo', employee: 'employee1@staffsync.demo' }), /not in Demo Co/);
    await assert.rejects(service.setupDemo(demo, { hr: 'manager@staffsync.demo', manager: 'manager@staffsync.demo', employee: 'employee1@staffsync.demo' }), /not a hr/);
    const counts = await service.setupDemo(demo, { hr: 'hr@staffsync.demo', manager: 'manager@staffsync.demo', employee: 'employee1@staffsync.demo' });
    assert.equal(counts.users, 4);
    demo = await ctx.models.Organisation.findById(demo._id);
    // Nothing in the organisation API can switch it on or off.
    const hrToken = await tokenFor('hr');
    assert.equal((await ctx.call('PUT', '/organisations/me', hrToken, { demo: { enabled: false } })).status, 400);
  });

  it('signs visitors in as the chosen role, and only as the configured accounts', async () => {
    assert.deepEqual((await ctx.call('GET', '/demo')).body.data, { available: true, organisationName: 'Demo Co', roles: ['hr', 'manager', 'employee'] });
    for (const role of ['hr', 'manager', 'employee']) {
      const x = await demoLogin(role);
      assert.equal(x.status, 200);
      assert.equal(x.body.data.user.role, role);
      assert.equal(x.body.data.organisation.isDemo, true);
      assert.ok(!JSON.stringify(x.body).includes('password'));
    }
    assert.equal((await demoLogin('admin')).status, 400);
    assert.equal((await ctx.call('POST', '/demo/login', null, { role: 'hr', email: 'hr@real.test' })).status, 400, 'cannot pick an account');
    // The demo stays inside its own organisation.
    const list = await ctx.call('GET', '/employees', await tokenFor('hr'));
    assert.equal(list.body.data.total, 4);
    assert.equal((await ctx.call('GET', '/auth/me', other.token)).body.data.organisation.isDemo, false);
  });

  it('refuses what would spoil the demo for the next visitor', async () => {
    const hr = await tokenFor('hr');
    const employee = await tokenFor('employee');
    assert.equal((await ctx.call('PUT', '/auth/password', employee, { currentPassword: 'Passw0rd123', newPassword: 'Changed123' })).status, 403);
    assert.equal((await ctx.call('PUT', '/organisations/me', hr, { name: 'Hijacked' })).status, 403);
    const lock = (who, changes) => ctx.call('PUT', `/employees/${who.emp._id}`, hr, changes);
    assert.equal((await lock(people.employee, { role: 'manager' })).status, 403);
    // The general rules still answer first: this manager has a team, so 409 as anywhere else.
    assert.equal((await lock(people.manager, { role: 'employee' })).status, 409);
    assert.equal((await lock(people.employee, { email: 'someone@staffsync.demo' })).status, 403);
    assert.equal((await ctx.call('DELETE', `/employees/${people.employee.emp._id}`, hr)).status, 403);
    // Unchanged values and other fields are fine, so the normal edit form still works.
    assert.equal((await lock(people.employee, { role: 'employee', isActive: true, designation: 'Analyst' })).status, 200);
    // New people must use the demo domains, so visitors cannot take real people's addresses.
    const add = (email) => ctx.call('POST', '/employees', hr, { name: 'Visitor', email, password: 'Passw0rd123', department: 'Ops', designation: 'Clerk' });
    const real = await add('someone@gmail.com');
    assert.equal(real.status, 400);
    assert.match(real.body.errors[0].message, /@staffsync\.demo/);
    assert.equal((await add('visitor@staffsync.demo')).status, 201);
    // Shared accounts get no reset emails.
    clearOutbox();
    await ctx.call('POST', '/auth/forgot-password', null, { email: 'employee1@staffsync.demo' });
    await new Promise((r) => { setTimeout(r, 300); });
    assert.equal(getOutbox().length, 0);
  });

  it('resets everything visitors did, and nothing outside the demo', async () => {
    const hr = await tokenFor('hr');
    const employee = await tokenFor('employee');
    await ctx.call('POST', '/announcements', hr, { title: 'Visitor post', content: 'Hello' });
    await ctx.call('PUT', `/employees/${people.extra.emp._id}`, hr, { designation: 'Changed by visitor', isActive: false });
    await ctx.call('POST', '/leaves', employee, { leaveType: 'casual', startDate: '2030-01-07', endDate: '2030-01-07', reason: 'Visitor' });
    await ctx.call('POST', '/attendance/check-in', employee);
    const realPost = await ctx.call('POST', '/announcements', other.token, { title: 'Real news', content: 'Keep me' });

    const { resetDemo } = require('../services/demoService');
    const summary = await resetDemo(demo);
    assert.equal(summary.users.removed, 1, 'the visitor-created person');
    assert.equal(summary.announcements.removed, 1);

    const list = await ctx.call('GET', '/employees', await tokenFor('hr'));
    assert.equal(list.body.data.total, 4);
    const extra = list.body.data.items.find((e) => e.userId.email === 'extra@staffsync.test');
    assert.equal(extra.designation, 'Engineer', 'edits are undone');
    assert.equal(extra.userId.isActive, true, 'deactivation is undone');
    assert.equal(list.body.data.items.find((e) => e.userId.email === 'employee1@staffsync.demo').designation, 'Engineer');
    const again = await tokenFor('employee');
    assert.equal((await ctx.call('GET', '/leaves/my', again)).body.data.total, 0);
    assert.equal((await ctx.call('GET', '/announcements', again)).body.data.total, 0);
    // The real organisation is untouched.
    assert.equal((await ctx.call('GET', `/announcements/${realPost.body.data._id}`, other.token)).status, 200);
    // Numbering continues from the baseline, not from the deleted visitor's number.
    const added = await ctx.call('POST', '/employees', await tokenFor('hr'), { name: 'Next', email: 'next@staffsync.demo', password: 'Passw0rd123', department: 'Ops', designation: 'Clerk' });
    assert.equal(added.body.data.employeeId, 'EMP0005');
  });

  it('is due once a night at 03:00 in the organisation time zone, and runs only once', async () => {
    const { isResetDue, lastResetTime, resetIfDue } = require('../services/demoService');
    // London is on BST (UTC+1) in July: 03:00 local is 02:00 UTC.
    assert.equal(lastResetTime(new Date('2030-07-10T02:30:00Z'), 'Europe/London').toISOString(), '2030-07-10T02:00:00.000Z');
    assert.equal(lastResetTime(new Date('2030-07-10T01:30:00Z'), 'Europe/London').toISOString(), '2030-07-09T02:00:00.000Z');
    assert.equal(lastResetTime(new Date('2030-01-10T12:00:00Z'), 'Asia/Kolkata').toISOString(), '2030-01-09T21:30:00.000Z');
    const org = { demo: { enabled: true, lastResetAt: new Date('2030-07-09T23:00:00Z') }, settings: { timeZone: 'Europe/London' } };
    assert.equal(isResetDue(org, new Date('2030-07-10T01:59:00Z')), false);
    assert.equal(isResetDue(org, new Date('2030-07-10T02:01:00Z')), true);

    // Two servers checking at the same moment: only one runs the reset.
    await ctx.models.Organisation.updateOne({ _id: demo._id }, { 'demo.lastResetAt': new Date('2000-01-01') });
    const runs = await Promise.all([resetIfDue(), resetIfDue()]);
    assert.equal(runs.filter(Boolean).length, 1);
    assert.equal(await resetIfDue(), null, 'not due again until the next night');
  });
});
