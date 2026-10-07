// Phases 5–6: role-based access, team scoping and HR employee management.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

describe('access control and employee management', () => {
  let ctx;
  let hr;
  let mia;
  let max;
  let eve;
  let ed;

  before(async () => {
    ctx = await setup('employees');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr', department: 'HR' });
  });
  after(async () => { await ctx.teardown(); });

  const create = (b) => ctx.call('POST', '/employees', hr.token, { password: 'Passw0rd123', department: 'Eng', designation: 'Dev', ...b });
  const tokenFor = (e) => ctx.signToken(e.userId._id);

  it('authorize() rejects unknown roles when routes load', async () => {
    const { authorize } = require('../middleware/authMiddleware');
    assert.throws(() => authorize('HR'), /needs valid roles/);
    assert.throws(() => authorize(), /needs valid roles/);
  });

  it('lets HR create people of any role, with managers and validation', async () => {
    let x = await create({ name: 'Mia', email: 'MIA@t.test', role: 'manager', joiningDate: '2024-01-15' });
    assert.equal(x.status, 201);
    assert.equal(x.body.data.userId.email, 'mia@t.test');
    mia = x.body.data;
    max = (await create({ name: 'Max', email: 'max@t.test', role: 'manager', managerId: mia._id })).body.data;
    eve = (await create({ name: 'Eve', email: 'eve@t.test', managerId: max._id })).body.data;
    ed = (await create({ name: 'Ed', email: 'ed@t.test' })).body.data;
    assert.equal(eve.userId.role, 'employee');

    assert.equal((await create({ name: 'D', email: 'eve@t.test' })).status, 409);
    x = await create({ name: 'B', email: 'b@t.test', managerId: ed._id });
    assert.equal(x.body.errors[0].message, 'The selected person is not a manager');
    x = await create({ name: 'B', email: 'b@t.test', isActive: false, employeeId: 'EMP9999' });
    assert.deepEqual(x.body.errors.map((e) => e.message), ['Unknown field', 'Unknown field']);
    x = await create({ name: 'B', email: 'b@t.test', dateOfBirth: '2999-01-01' });
    assert.equal(x.body.errors[0].message, 'Date of birth must be in the past');
    assert.equal((await ctx.call('POST', '/employees', tokenFor(mia), { name: 'X', email: 'x@t.test', password: 'Passw0rd123', department: 'a', designation: 'b' })).status, 403);
  });

  it('scopes reads: HR all, managers their direct team, others themselves', async () => {
    const list = await ctx.call('GET', '/employees?role=manager', hr.token);
    assert.ok(list.body.data.items.every((e) => e.userId.role === 'manager'));
    assert.equal((await ctx.call('GET', '/employees', tokenFor(mia))).status, 403);
    const team = await ctx.call('GET', '/employees/team', tokenFor(max));
    assert.deepEqual(team.body.data.map((e) => e.userId.email), ['eve@t.test']);
    assert.equal((await ctx.call('GET', '/employees/team', tokenFor(eve))).status, 403);
    assert.equal((await ctx.call('GET', '/employees/team', hr.token)).status, 403);
    assert.equal((await ctx.call('GET', `/employees/${eve._id}`, tokenFor(max))).status, 200);
    assert.equal((await ctx.call('GET', `/employees/${eve._id}`, tokenFor(mia))).status, 403, 'skip-level manager');
    assert.equal((await ctx.call('GET', `/employees/${eve._id}`, tokenFor(ed))).status, 403);
    assert.equal((await ctx.call('GET', '/employees?isActive=yes', hr.token)).status, 400);
  });

  it('lets people edit only their own phone and address', async () => {
    let x = await ctx.call('PUT', `/employees/${eve._id}`, tokenFor(eve), { phone: '+44 7700 900999', address: '2 Low St' });
    assert.equal(x.body.data.address, '2 Low St');
    x = await ctx.call('PUT', `/employees/${eve._id}`, tokenFor(eve), { phone: '+44 7700 900555', department: 'Exec', role: 'hr' });
    assert.equal(x.status, 403);
    assert.deepEqual(x.body.errors.map((e) => e.field).sort(), ['department', 'role']);
    assert.equal((await ctx.models.Employee.findById(eve._id)).phone, '+44 7700 900999', 'nothing saved');
    assert.equal((await ctx.call('PUT', `/employees/${ed._id}`, tokenFor(eve), { phone: '+44 7700 900000' })).status, 403);
  });

  it('protects reporting lines', async () => {
    let x = await ctx.call('PUT', `/employees/${mia._id}`, hr.token, { managerId: mia._id });
    assert.equal(x.body.errors[0].message, 'An employee cannot be their own manager');
    x = await ctx.call('PUT', `/employees/${mia._id}`, hr.token, { managerId: max._id });
    assert.equal(x.body.errors[0].message, 'This would create a reporting loop');
    x = await ctx.call('PUT', `/employees/${max._id}`, hr.token, { role: 'employee' });
    assert.equal(x.status, 409);
    assert.equal((await ctx.call('DELETE', `/employees/${max._id}`, hr.token)).status, 409);
  });

  it('deactivates softly, blocks the token at once and can reactivate', async () => {
    let x = await ctx.call('DELETE', `/employees/${eve._id}`, hr.token);
    assert.equal(x.body.data.userId.isActive, false);
    assert.equal((await ctx.call('GET', '/auth/me', tokenFor(eve))).status, 401);
    assert.equal((await ctx.call('DELETE', `/employees/${max._id}`, hr.token)).status, 200, 'team now all inactive');
    x = await ctx.call('PUT', `/employees/${eve._id}`, hr.token, { managerId: max._id });
    assert.equal(x.body.errors[0].message, 'The selected manager is deactivated');
    x = await ctx.call('PUT', `/employees/${max._id}`, hr.token, { isActive: true });
    assert.equal(x.body.data.userId.isActive, true);
  });

  it('keeps at least one active HR and stops HR changing their own status', async () => {
    const hrEmp = await ctx.models.Employee.findOne({ userId: hr.user._id });
    let x = await ctx.call('PUT', `/employees/${hrEmp._id}`, hr.token, { role: 'manager' });
    assert.equal(x.body.message, 'You cannot change your own role or deactivate your own account');
    const hana = (await create({ name: 'Hana', email: 'hana@t.test', role: 'hr' })).body.data;
    assert.equal((await ctx.call('DELETE', `/employees/${hrEmp._id}`, tokenFor(hana))).status, 200);
    x = await ctx.call('PUT', `/employees/${hana._id}`, tokenFor(hana), { isActive: false });
    assert.equal(x.status, 400);
  });

  it('accepts per-employee time zones from HR only', async () => {
    let x = await ctx.call('PUT', `/employees/${ed._id}`, hr.token, { timeZone: 'Europe/London' });
    assert.equal(x.status, 401, 'original HR was deactivated in the previous test');
    const hrNow = await ctx.makeUser({ email: 'hr2@t.test', role: 'hr' });
    x = await ctx.call('PUT', `/employees/${ed._id}`, hrNow.token, { timeZone: ' Europe/London ' });
    assert.equal(x.body.data.timeZone, 'Europe/London');
    x = await ctx.call('PUT', `/employees/${ed._id}`, hrNow.token, { timeZone: 'Mars/Base' });
    assert.equal(x.body.errors[0].field, 'timeZone');
    x = await ctx.call('PUT', `/employees/${ed._id}`, tokenFor(ed), { timeZone: 'UTC' });
    assert.equal(x.status, 403);
  });
});
