// Phase 19: organisations are isolated from each other, and platform admins are a separate kind
// of account. Runs in strict mode: there is no default organisation, so any code path that
// forgets its organisation context fails here instead of quietly reading the wrong data.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { getOutbox, clearOutbox } = require('../utils/mailer');
const { TenantContextError } = require('../models/plugins/tenantScoped');

const PASSWORD = 'Passw0rd123';

describe('tenant isolation', () => {
  let ctx;
  // Two organisations with deliberately identical people, departments and employee codes.
  const orgs = { a: {}, b: {} };

  const login = async (email, password = PASSWORD) => (await ctx.call('POST', '/auth/login', null, { email, password })).body.data?.token;

  before(async () => {
    ctx = await setup('tenancy', { strict: true });
    for (const [k, companyName] of [['a', 'Alpha Ltd'], ['b', 'Beta Ltd']]) {
      const org = orgs[k];
      const signup = await ctx.call('POST', '/organisations/signup', null, { companyName, name: `HR ${k}`, email: `hr@${k}.test`, password: PASSWORD });
      assert.equal(signup.status, 201);
      org.id = signup.body.data.organisation._id;
      org.hr = signup.body.data.token;
      const add = async (email, role, extra = {}) => (await ctx.call('POST', '/employees', org.hr, {
        name: 'Sam Same', email, password: PASSWORD, role, department: 'Engineering', designation: 'Engineer', ...extra,
      })).body.data;
      org.managerEmp = await add(`manager@${k}.test`, 'manager');
      org.emp = await add(`emp@${k}.test`, 'employee', { managerId: org.managerEmp._id });
      org.manager = await login(`manager@${k}.test`);
      org.employee = await login(`emp@${k}.test`);
    }
  });
  after(async () => { await ctx.teardown(); });

  describe('the tenantScoped plugin', () => {
    it('refuses organisation-owned queries without an organisation context', async () => {
      await assert.rejects(ctx.models.Employee.find().exec(), TenantContextError);
      await assert.rejects(ctx.models.User.countDocuments().exec(), TenantContextError);
      await assert.rejects(ctx.models.Leave.aggregate([{ $match: {} }]).exec(), TenantContextError);
      await assert.rejects(ctx.models.Notification.updateMany({}, { isRead: true }).exec(), TenantContextError);
    });

    it('limits every query to the current organisation, and the platform sees all', async () => {
      const a = await ctx.models.Organisation.findById(orgs.a.id);
      assert.equal(await ctx.inOrganisation(a, () => ctx.models.Employee.countDocuments()), 3);
      assert.equal(await ctx.asPlatform(() => ctx.models.Employee.countDocuments()), 6);
      const codes = await ctx.inOrganisation(a, () => ctx.models.Employee.find().distinct('employeeId'));
      assert.deepEqual(codes.sort(), ['EMP0001', 'EMP0002', 'EMP0003'], 'each organisation numbers from EMP0001');
      // Joins are limited too: Alpha's employees joined to users only ever see Alpha's users.
      const joined = await ctx.inOrganisation(a, () => ctx.models.Employee.aggregate([
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
        { $facet: { all: [{ $lookup: { from: 'users', pipeline: [], as: 'everyone' } }] } },
      ]));
      assert.ok(joined[0].all.every((e) => e.everyone.length === 3), 'a join inside $facet sees only Alpha');
    });

    it('never writes into, or moves a record to, another organisation', async () => {
      const a = await ctx.models.Organisation.findById(orgs.a.id);
      await assert.rejects(
        ctx.inOrganisation(a, () => ctx.models.Announcement.create({ title: 't', content: 'c', createdBy: orgs.a.emp.userId._id, organisationId: orgs.b.id })),
        /another organisation/
      );
      await assert.rejects(ctx.inOrganisation(a, () => ctx.models.User.find({ organisationId: orgs.b.id })), /another organisation/);
      const emp = await ctx.inOrganisation(a, () => ctx.models.Employee.findById(orgs.a.emp._id));
      emp.organisationId = orgs.b.id;
      assert.equal(String(emp.organisationId), orgs.a.id, 'organisationId is immutable');
      await assert.rejects(ctx.inOrganisation(a, () => ctx.models.Employee.aggregate([{ $unionWith: 'employees' }])), /not supported/);
    });
  });

  describe('through the API', () => {
    it('lists only the caller’s organisation', async () => {
      const list = await ctx.call('GET', '/employees', orgs.a.hr);
      assert.equal(list.body.data.total, 3);
      assert.ok(list.body.data.items.every((e) => e.userId.email.endsWith('@a.test')));
      const team = await ctx.call('GET', '/employees/team', orgs.a.manager);
      assert.deepEqual(team.body.data.map((e) => e.userId.email), ['emp@a.test']);
      const dash = await ctx.call('GET', '/dashboard/hr', orgs.a.hr);
      assert.ok(!JSON.stringify(dash.body).includes('@b.test'));
      const report = await ctx.call('GET', '/reports/department-stats', orgs.a.hr);
      assert.ok(!JSON.stringify(report.body).includes('@b.test'));
      assert.ok(!JSON.stringify(report.body).includes(orgs.b.emp._id));
    });

    it('answers 404 for another organisation’s records, whatever the role', async () => {
      const bEmp = orgs.b.emp._id;
      assert.equal((await ctx.call('GET', `/employees/${bEmp}`, orgs.a.hr)).status, 404);
      assert.equal((await ctx.call('PUT', `/employees/${bEmp}`, orgs.a.hr, { designation: 'Hacked' })).status, 404);
      assert.equal((await ctx.call('DELETE', `/employees/${bEmp}`, orgs.a.hr)).status, 404);
      const leave = await ctx.call('POST', '/leaves', orgs.b.employee, { leaveType: 'casual', startDate: '2030-03-04', endDate: '2030-03-04', reason: 'Trip' });
      assert.equal(leave.status, 201);
      const id = leave.body.data._id;
      assert.equal((await ctx.call('GET', `/leaves/${id}`, orgs.a.hr)).status, 404);
      assert.equal((await ctx.call('PUT', `/leaves/${id}/approve`, orgs.a.hr)).status, 404);
      assert.equal((await ctx.call('PUT', `/leaves/${id}/approve`, orgs.a.manager)).status, 404);
      // Beta's own manager still decides it.
      assert.equal((await ctx.call('PUT', `/leaves/${id}/approve`, orgs.b.manager)).status, 200);
    });

    it('cannot link people across organisations', async () => {
      const x = await ctx.call('PUT', `/employees/${orgs.a.emp._id}`, orgs.a.hr, { managerId: orgs.b.managerEmp._id });
      assert.equal(x.status, 400);
      assert.equal(x.body.errors[0].message, 'Manager not found');
      const training = await ctx.call('POST', '/trainings', orgs.a.hr, { title: 'Safety', trainer: 'T', startDate: '2030-05-01', endDate: '2030-05-01', capacity: 5 });
      const assign = await ctx.call('POST', `/trainings/${training.body.data._id}/participants`, orgs.a.hr, { employeeId: orgs.b.emp._id });
      assert.equal(assign.status, 404);
      assert.equal((await ctx.call('POST', `/trainings/${training.body.data._id}/enroll`, orgs.b.employee)).status, 404);
    });

    it('sends "everyone" and "all HR" notifications only within the organisation', async () => {
      const post = await ctx.call('POST', '/announcements', orgs.a.hr, { title: 'Alpha news', content: 'Hello', targetAudience: 'all' });
      assert.equal(post.status, 201);
      const bList = await ctx.call('GET', '/announcements', orgs.b.employee);
      assert.ok(!bList.body.data.items.some((n) => n.title === 'Alpha news'));
      const bInbox = await ctx.call('GET', '/notifications', orgs.b.employee);
      assert.ok(!JSON.stringify(bInbox.body).includes('Alpha news'));
      // Alpha's HR, with no manager, gets Alpha requests only.
      const leave = await ctx.call('POST', '/leaves', orgs.a.manager, { leaveType: 'sick', startDate: '2030-04-01', endDate: '2030-04-01', reason: 'Flu' });
      assert.equal(leave.status, 201);
      const aHr = await ctx.call('GET', '/notifications', orgs.a.hr);
      const bHr = await ctx.call('GET', '/notifications', orgs.b.hr);
      assert.ok(aHr.body.data.items.some((n) => n.title === 'New leave request'));
      assert.ok(!bHr.body.data.items.some((n) => n.title === 'New leave request'));
    });

    it('keeps settings per organisation, changed only by its own HR', async () => {
      assert.equal((await ctx.call('PUT', '/organisations/me', orgs.a.manager, { name: 'X' })).status, 403);
      const bad = await ctx.call('PUT', '/organisations/me', orgs.a.hr, { status: 'suspended', slug: 'x' });
      assert.equal(bad.status, 400, 'status and slug are platform-only');
      const ok = await ctx.call('PUT', '/organisations/me', orgs.a.hr, { settings: { timeZone: 'Europe/London', workingDays: ['Mon', 'Tue'] } });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.settings.timeZone, 'Europe/London');
      const b = await ctx.call('GET', '/organisations/me', orgs.b.employee);
      assert.equal(b.body.data.name, 'Beta Ltd');
      assert.equal(b.body.data.settings.timeZone, process.env.TIMEZONE || 'Asia/Kolkata');
    });

    it('signs in and resets passwords for users of any organisation', async () => {
      assert.ok(await login('emp@b.test'));
      clearOutbox();
      assert.equal((await ctx.call('POST', '/auth/forgot-password', null, { email: 'emp@b.test' })).status, 200);
      const deadline = Date.now() + 5000;
      while (getOutbox().length === 0 && Date.now() < deadline) await new Promise((r) => { setTimeout(r, 25); });
      const token = getOutbox()[0].text.match(/reset-password\?token=([a-f0-9]{64})/)[1];
      assert.equal((await ctx.call('POST', '/auth/reset-password', null, { token, newPassword: 'NewPassw0rd1' })).status, 200);
      orgs.b.employee = await login('emp@b.test', 'NewPassw0rd1');
      assert.ok(orgs.b.employee);
    });

    it('locks every user of a suspended organisation out, and only them', async () => {
      await ctx.models.Organisation.updateOne({ _id: orgs.b.id }, { status: 'suspended' });
      const me = await ctx.call('GET', '/auth/me', orgs.b.hr);
      assert.equal(me.status, 403);
      assert.match(me.body.message, /suspended/);
      assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'hr@b.test', password: PASSWORD })).status, 403);
      assert.equal((await ctx.call('GET', '/auth/me', orgs.a.hr)).status, 200);
      await ctx.models.Organisation.updateOne({ _id: orgs.b.id }, { status: 'active' });
    });
  });

  describe('platform admins', () => {
    let platform;

    before(async () => {
      await ctx.models.PlatformAdmin.create({ name: 'Operator', email: 'ops@staffsync.test', password: PASSWORD });
    });

    it('sign in only at the platform endpoint, and organisation users cannot', async () => {
      assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'ops@staffsync.test', password: PASSWORD })).status, 401);
      assert.equal((await ctx.call('POST', '/platform/auth/login', null, { email: 'hr@a.test', password: PASSWORD })).status, 401);
      const x = await ctx.call('POST', '/platform/auth/login', null, { email: 'ops@staffsync.test', password: PASSWORD });
      assert.equal(x.status, 200);
      assert.ok(!JSON.stringify(x.body).includes('password'));
      platform = x.body.data.token;
    });

    it('platform and organisation tokens only work on their own API', async () => {
      assert.equal((await ctx.call('GET', '/employees', platform)).status, 401);
      assert.equal((await ctx.call('GET', '/auth/me', platform)).status, 401);
      assert.equal((await ctx.call('GET', '/platform/organisations', orgs.a.hr)).status, 401, 'organisation HR is not a platform admin');
      assert.equal((await ctx.call('GET', '/platform/organisations')).status, 401);
    });

    it('see organisations and headcounts, not people', async () => {
      const x = await ctx.call('GET', '/platform/organisations', platform);
      assert.equal(x.status, 200);
      const alpha = x.body.data.items.find((o) => o.name === 'Alpha Ltd');
      assert.equal(alpha.users, 3);
      assert.ok(!JSON.stringify(x.body).includes('@a.test'));
    });

    it('cannot be created through any API', async () => {
      for (const path of ['/platform/admins', '/platform/auth/register', '/platform/auth/signup']) {
        const x = await ctx.call('POST', path, platform, { name: 'x', email: 'x@x.test', password: PASSWORD });
        assert.equal(x.status, 404, path);
      }
      assert.equal(await ctx.models.PlatformAdmin.countDocuments(), 1);
    });
  });
});
