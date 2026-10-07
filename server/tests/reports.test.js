// Phase 9: dashboards and HR reports, checked against numbers worked out independently.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

// Mon–Fri days between two dates, counted without the app's own helpers.
const weekdays = (from, to) => {
  let n = 0;
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n += 1;
  }
  return n;
};

describe('dashboards and reports', () => {
  let ctx;
  let hr;
  let mgr;
  let a;
  let b;

  before(async () => {
    ctx = await setup('reports');
    process.env.WORKING_DAYS = 'Mon,Tue,Wed,Thu,Fri';
    const joined = new Date('2026-01-01T00:00:00Z');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr', department: 'HR', joiningDate: joined });
    mgr = await ctx.makeUser({ email: 'mgr@t.test', role: 'manager', joiningDate: joined });
    a = await ctx.makeUser({ email: 'a@t.test', managerId: mgr.emp._id, joiningDate: joined });
    b = await ctx.makeUser({ email: 'b@t.test', managerId: mgr.emp._id, department: 'Finance', joiningDate: new Date('2026-09-15T00:00:00Z') });
    await ctx.makeUser({ email: 'c@t.test', joiningDate: joined });
    await ctx.makeUser({ email: 'gone@t.test', managerId: mgr.emp._id, active: false, joiningDate: joined });

    const att = (emp, date, status, hours) => ctx.models.Attendance.create({ employeeId: emp._id, date, timeZone: 'Asia/Kolkata', checkIn: new Date(`${date}T04:00:00Z`), checkOut: new Date(`${date}T12:00:00Z`), workingHours: hours, status });
    const leave = (emp, start, end, status, leaveType = 'casual') => ctx.models.Leave.create({ employeeId: emp._id, leaveType, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), reason: 'x', status });
    // September 2026 is fully in the past; Sep 5 is a Saturday.
    await att(a.emp, '2026-09-01', 'present', 8);
    await att(a.emp, '2026-09-02', 'half-day', 3);
    await att(a.emp, '2026-09-05', 'present', 4);
    await leave(a.emp, '2026-09-07', '2026-09-09', 'approved');
    await leave(a.emp, '2026-09-01', '2026-09-01', 'approved', 'sick');
    await leave(a.emp, '2026-09-10', '2026-09-10', 'pending');
    await leave(b.emp, '2026-09-28', '2026-09-28', 'rejected', 'earned');
    await leave(b.emp, '2026-12-30', '2027-01-02', 'approved', 'unpaid');
  });
  after(async () => { await ctx.teardown(); });

  const report = (p) => ctx.call('GET', `/reports/${p}`, hr.token);

  it('counts attendance, leave days and absences per person', async () => {
    const { body } = await report('attendance-summary?from=2026-09-01&to=2026-09-30');
    const row = (name) => body.data.byEmployee.items.find((i) => i.employee.name === name);
    const ra = row('a');
    assert.deepEqual([ra.present, ra.halfDay, ra.totalHours, ra.onLeave], [2, 1, 15, 3]);
    assert.equal(ra.absent, weekdays('2026-09-01', '2026-09-30') - 2 - 3, 'pending leave not excused; Saturday ignored');
    assert.equal(row('b').absent, weekdays('2026-09-15', '2026-09-30'), 'absences start at the joining date');
    assert.equal(row('gone'), undefined, 'inactive people are excluded');
    const eng = body.data.byDepartment.find((dep) => dep.department === 'Eng');
    assert.equal(eng.avgHoursPerDay, 5);
  });

  it('never counts today as an absence and honours a six-day week', async () => {
    const today = toDateString(new Date(), getTimeZone());
    await ctx.makeUser({ email: 'new@t.test', department: 'New', joiningDate: new Date(`${today}T00:00:00Z`) });
    let x = await report(`attendance-summary?from=${addDays(today, -3)}&to=${today}&department=New`);
    assert.equal(x.body.data.byEmployee.items[0].absent, 0);
    process.env.WORKING_DAYS = 'Mon,Tue,Wed,Thu,Fri,Sat';
    x = await report('attendance-summary?from=2026-09-15&to=2026-09-30&department=Finance');
    process.env.WORKING_DAYS = 'Mon,Tue,Wed,Thu,Fri';
    assert.equal(x.body.data.byEmployee.items[0].absent, weekdays('2026-09-15', '2026-09-30') + 2, 'plus two Saturdays');
    assert.equal((await report('attendance-summary?from=2024-01-01&to=2026-01-01')).status, 400, 'over 366 days');
  });

  it('summarises leave by status, type and month, splitting days across the year end', async () => {
    const { body } = await report('leave-summary?year=2026');
    assert.equal(body.data.byStatus.approved.requests, 3);
    assert.equal(body.data.byStatus.approved.days, 6, '3 + 1 + 2 days inside 2026');
    assert.equal(body.data.byMonth[8].approvedDays, 4);
    assert.equal(body.data.byMonth[11].approvedDays, 2);
    const next = await report('leave-summary?year=2027');
    assert.equal(next.body.data.byMonth[0].approvedDays, 2);
  });

  it('counts heads per department', async () => {
    const { body } = await report('department-stats');
    const eng = body.data.departments.find((dep) => dep.department === 'Eng');
    assert.deepEqual([eng.total, eng.active, eng.inactive, eng.managers], [4, 3, 1, 1], 'mgr, a, c and the deactivated gone');
  });

  it("shows today's team and company picture on the dashboards", async () => {
    const today = toDateString(new Date(), getTimeZone());
    await ctx.call('POST', '/attendance/check-in', a.token);
    await ctx.models.Leave.create({ employeeId: b.emp._id, leaveType: 'casual', startDate: new Date(`${today}T00:00:00Z`), endDate: new Date(`${today}T00:00:00Z`), reason: 'x', status: 'approved' });

    const md = (await ctx.call('GET', '/dashboard/manager', mgr.token)).body.data;
    const statusOf = (name) => md.team.members.find((m) => m.employee.name === name).status;
    assert.equal(md.team.size, 2);
    assert.equal(statusOf('a'), 'checked-in');
    assert.equal(statusOf('b'), 'on-leave');
    assert.equal(md.pendingLeave.count, 1);

    const ed = (await ctx.call('GET', '/dashboard/employee', a.token)).body.data;
    assert.equal(ed.today.status, 'checked-in');
    assert.equal(ed.thisMonth.present, 1);

    const hd = (await ctx.call('GET', '/dashboard/hr', hr.token)).body.data;
    assert.equal(hd.headcount.inactive, 1);
    assert.equal(hd.today.checkedIn, 1);
    assert.equal(hd.today.onLeave, 1);
  });

  it('keeps each dashboard and report to its role', async () => {
    const forbidden = async (p, who) => (await ctx.call('GET', p, who.token)).status === 403;
    assert.ok(await forbidden('/dashboard/employee', mgr));
    assert.ok(await forbidden('/dashboard/manager', a));
    assert.ok(await forbidden('/dashboard/hr', mgr));
    assert.ok(await forbidden('/reports/leave-summary', mgr));
    assert.ok(await forbidden('/reports/department-stats', a));
  });
});
