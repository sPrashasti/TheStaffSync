// Phase 14: the leave workflow end to end across all three roles, using only the API (as the
// frontend does). One record must look the same to the employee, their manager and HR, and
// every dashboard, report and notification along the way must agree with it.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

describe('leave workflow across employee, manager and HR', () => {
  let ctx;
  let hr;
  const people = {};
  let d;
  let approvedLeave;
  let rejectedLeave;

  const login = async (email, password) => {
    const x = await ctx.call('POST', '/auth/login', null, { email, password });
    assert.equal(x.status, 200, `login ${email}`);
    return x.body.data.token;
  };

  before(async () => {
    ctx = await setup('workflow');
    // The first HR account comes from the seed script in real use.
    hr = await ctx.makeUser({ name: 'Hana HR', email: 'hana@staffsync.test', role: 'hr', department: 'HR' });
    const today = toDateString(new Date(), getTimeZone());
    d = (n) => addDays(today, n);
  });
  after(async () => { await ctx.teardown(); });

  it('HR creates a manager, who can log in', async () => {
    const x = await ctx.call('POST', '/employees', hr.token, {
      name: 'Mia Manager', email: 'mia@staffsync.test', password: 'Manager123', role: 'manager', department: 'Engineering', designation: 'Engineering Manager',
    });
    assert.equal(x.status, 201);
    people.manager = { employeeId: x.body.data._id, token: await login('mia@staffsync.test', 'Manager123') };
  });

  it('HR adds an employee, then places them in the manager’s team', async () => {
    const added = await ctx.call('POST', '/employees', hr.token, {
      name: 'Asha Kumar', email: 'asha@staffsync.test', password: 'Employee123', department: 'Unassigned', designation: 'Unassigned',
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.data.userId.role, 'employee');
    people.employee = { employeeId: added.body.data._id, token: await login('asha@staffsync.test', 'Employee123') };

    const placed = await ctx.call('PUT', `/employees/${people.employee.employeeId}`, hr.token, {
      department: 'Engineering', designation: 'Software Engineer', managerId: people.manager.employeeId,
    });
    assert.equal(placed.status, 200);

    const me = await ctx.call('GET', '/employees/me', people.employee.token);
    assert.equal(me.body.data.managerId.userId.name, 'Mia Manager');
    const team = await ctx.call('GET', '/employees/team', people.manager.token);
    assert.deepEqual(team.body.data.map((e) => e.userId.email), ['asha@staffsync.test']);
  });

  it('the employee applies for leave and the manager is told', async () => {
    const x = await ctx.call('POST', '/leaves', people.employee.token, { leaveType: 'casual', startDate: d(14), endDate: d(16), reason: 'Family wedding' });
    assert.equal(x.status, 201);
    approvedLeave = x.body.data._id;

    const inbox = (await ctx.call('GET', '/notifications', people.manager.token)).body.data;
    const note = inbox.items.find((n) => n.relatedEntity?.entityId === approvedLeave);
    assert.equal(note.title, 'New leave request');
    assert.match(note.message, /^Asha Kumar requested casual leave/);
    assert.equal(inbox.unreadCount, 1);

    const queue = await ctx.call('GET', '/leaves/team?status=pending', people.manager.token);
    assert.deepEqual(queue.body.data.items.map((l) => l._id), [approvedLeave]);
    assert.equal((await ctx.call('GET', '/dashboard/manager', people.manager.token)).body.data.pendingLeave.count, 1);
    assert.equal((await ctx.call('GET', '/dashboard/hr', hr.token)).body.data.leave.pending, 1);
  });

  it('the employee cannot approve their own request', async () => {
    assert.equal((await ctx.call('PUT', `/leaves/${approvedLeave}/approve`, people.employee.token)).status, 403);
  });

  it('the manager approves it', async () => {
    const x = await ctx.call('PUT', `/leaves/${approvedLeave}/approve`, people.manager.token);
    assert.equal(x.status, 200);
    assert.equal(x.body.data.status, 'approved');
    assert.equal(x.body.data.approvedBy.name, 'Mia Manager');
    assert.equal((await ctx.call('GET', '/dashboard/manager', people.manager.token)).body.data.pendingLeave.count, 0);
  });

  it('the employee sees the approval everywhere', async () => {
    const inbox = (await ctx.call('GET', '/notifications', people.employee.token)).body.data;
    const note = inbox.items.find((n) => n.relatedEntity?.entityId === approvedLeave);
    assert.equal(note.title, 'Leave approved');
    assert.match(note.message, /approved by Mia Manager\.$/);

    const mine = (await ctx.call('GET', '/leaves/my', people.employee.token)).body.data.items;
    assert.equal(mine.find((l) => l._id === approvedLeave).status, 'approved');

    const dash = (await ctx.call('GET', '/dashboard/employee', people.employee.token)).body.data;
    assert.deepEqual(dash.leave.upcoming.map((l) => l._id), [approvedLeave]);
    assert.equal(dash.leave.pending, 0);
  });

  it('HR sees the same record, approver and totals', async () => {
    const all = (await ctx.call('GET', '/leaves?status=approved', hr.token)).body.data.items;
    const record = all.find((l) => l._id === approvedLeave);
    assert.equal(record.approvedBy.name, 'Mia Manager');
    assert.equal(record.employeeId.userId.name, 'Asha Kumar');
    assert.equal(record.days, 3);
    assert.equal((await ctx.call('GET', '/dashboard/hr', hr.token)).body.data.leave.pending, 0);

    const year = Number(d(14).slice(0, 4));
    const summary = (await ctx.call('GET', `/reports/leave-summary?year=${year}`, hr.token)).body.data;
    // Leave starting near the end of the year may spill into the next one.
    const daysThisYear = Math.min(3, Math.max(0, Math.round((Date.parse(`${year}-12-31`) - Date.parse(d(14))) / 864e5) + 1));
    assert.equal(summary.byStatus.approved.days, daysThisYear);
  });

  it('a rejection reaches the employee with its reason and frees the dates', async () => {
    rejectedLeave = (await ctx.call('POST', '/leaves', people.employee.token, { leaveType: 'earned', startDate: d(30), endDate: d(30), reason: 'Personal day' })).body.data._id;
    const x = await ctx.call('PUT', `/leaves/${rejectedLeave}/reject`, people.manager.token, { rejectionReason: 'Release week; please pick another day' });
    assert.equal(x.body.data.status, 'rejected');

    const note = (await ctx.call('GET', '/notifications', people.employee.token)).body.data.items.find((n) => n.relatedEntity?.entityId === rejectedLeave);
    assert.equal(note.title, 'Leave rejected');
    assert.match(note.message, /Release week; please pick another day$/);

    const again = await ctx.call('POST', '/leaves', people.employee.token, { leaveType: 'unpaid', startDate: d(30), endDate: d(30), reason: 'Trying again' });
    assert.equal(again.status, 201);
  });

  it('nobody outside the reporting line can see or decide the requests', async () => {
    const outsider = await ctx.makeUser({ email: 'out@staffsync.test' });
    const otherManager = await ctx.makeUser({ email: 'other@staffsync.test', role: 'manager' });
    assert.equal((await ctx.call('GET', `/leaves/${approvedLeave}`, outsider.token)).status, 403);
    assert.equal((await ctx.call('PUT', `/leaves/${rejectedLeave}/approve`, otherManager.token)).status, 403);
  });

  it('after HR deactivates the employee, their access ends but the history stays', async () => {
    assert.equal((await ctx.call('DELETE', `/employees/${people.employee.employeeId}`, hr.token)).status, 200);
    assert.equal((await ctx.call('GET', '/leaves/my', people.employee.token)).status, 401);
    assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'asha@staffsync.test', password: 'Employee123' })).status, 401);
    const record = await ctx.call('GET', `/leaves/${approvedLeave}`, hr.token);
    assert.equal(record.body.data.status, 'approved');
  });
});
