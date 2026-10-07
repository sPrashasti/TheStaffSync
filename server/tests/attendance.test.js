// Phase 7 and time zones: check-in/out rules, history filters, team scoping and per-employee dates.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const dates = require('../utils/dates');

describe('date helpers', () => {
  it('works out today in a time zone', () => {
    assert.equal(dates.toDateString(new Date('2026-07-01T19:00:00Z'), 'Asia/Kolkata'), '2026-07-02');
    assert.equal(dates.toDateString(new Date('2026-07-01T18:00:00Z'), 'Asia/Kolkata'), '2026-07-01');
    assert.equal(dates.toDateString(new Date('2026-07-01T23:30:00Z'), 'Europe/London'), '2026-07-02');
    assert.equal(dates.toDateString(new Date('2026-01-15T23:30:00Z'), 'Europe/London'), '2026-01-15');
  });

  it('validates dates, zones and working days', () => {
    assert.ok(dates.isDateString('2028-02-29'));
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-5', '2026-01-05T00:00']) assert.ok(!dates.isDateString(bad), bad);
    assert.ok(dates.isValidTimeZone('Europe/London'));
    assert.ok(!dates.isValidTimeZone('Mars/Base'));
    assert.equal(dates.addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(dates.addDays('2026-12-31', 1), '2027-01-01');
    assert.throws(() => dates.parseWorkingDays('Mon,Funday'));
    assert.equal(dates.parseWorkingDays('Mon,Tue,Wed,Thu,Fri,Sat').size, 6);
  });

  it('defaults to IST when TIMEZONE is unset', () => {
    const saved = process.env.TIMEZONE;
    delete process.env.TIMEZONE;
    assert.equal(dates.getTimeZone(), 'Asia/Kolkata');
    process.env.TIMEZONE = saved;
  });
});

describe('attendance', () => {
  let ctx;
  let hr;
  let mgr;
  let a;
  let b;
  let c;
  let today;

  before(async () => {
    ctx = await setup('attendance');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr', department: 'HR' });
    mgr = await ctx.makeUser({ email: 'm@t.test', role: 'manager' });
    a = await ctx.makeUser({ email: 'a@t.test', managerId: mgr.emp._id });
    b = await ctx.makeUser({ email: 'b@t.test', managerId: mgr.emp._id, department: 'Finance' });
    c = await ctx.makeUser({ email: 'c@t.test' });
    today = dates.toDateString(new Date(), dates.getTimeZone());
  });
  after(async () => { await ctx.teardown(); });

  it('checks in once, even when requests arrive together', async () => {
    assert.equal((await ctx.call('POST', '/attendance/check-out', a.token)).status, 404);
    const sneaky = await ctx.call('POST', '/attendance/check-in', a.token, { checkIn: '2020-01-01T09:00:00Z' });
    assert.equal(sneaky.status, 400);
    const burst = await Promise.all(Array.from({ length: 5 }, () => ctx.call('POST', '/attendance/check-in', a.token)));
    assert.deepEqual(burst.map((x) => x.status).sort(), [201, 409, 409, 409, 409]);
    const record = burst.find((x) => x.status === 201).body.data;
    assert.equal(record.date, today);
    assert.equal(record.timeZone, dates.getTimeZone());
  });

  it('checks out once and grades the day by hours', async () => {
    const outs = await Promise.all([1, 2, 3].map(() => ctx.call('POST', '/attendance/check-out', a.token)));
    assert.deepEqual(outs.map((x) => x.status).sort(), [200, 409, 409]);
    assert.equal(outs.find((x) => x.status === 200).body.data.status, 'half-day');

    await ctx.call('POST', '/attendance/check-in', b.token);
    await ctx.models.Attendance.updateOne({ employeeId: b.emp._id, date: today }, { checkIn: new Date(Date.now() - 8.5 * 36e5) });
    const long = await ctx.call('POST', '/attendance/check-out', b.token);
    assert.equal(long.body.data.status, 'present');
    assert.ok(Math.abs(long.body.data.workingHours - 8.5) < 0.02);

    await ctx.call('POST', '/attendance/check-in', c.token);
    await ctx.models.Attendance.updateOne({ employeeId: c.emp._id, date: today }, { checkIn: new Date(Date.now() - 4 * 36e5 - 5000) });
    assert.equal((await ctx.call('POST', '/attendance/check-out', c.token)).body.data.status, 'present', 'exactly 4 hours');
  });

  it('filters history and keeps managers to their team', async () => {
    const hist = (emp, date, status) => ctx.models.Attendance.create({ employeeId: emp._id, date, timeZone: 'UTC', checkIn: new Date(`${date}T09:00:00Z`), checkOut: new Date(`${date}T17:00:00Z`), workingHours: 8, status });
    await hist(a.emp, '2026-09-01', 'present');
    await hist(a.emp, '2026-09-02', 'half-day');
    await hist(c.emp, '2026-09-01', 'present');

    assert.equal((await ctx.call('GET', '/attendance/my?from=2026-09-01&to=2026-09-30', a.token)).body.data.total, 2);
    assert.equal((await ctx.call('GET', '/attendance/my?from=2026-09-30&to=2026-09-01', a.token)).status, 400);
    assert.equal((await ctx.call('GET', `/attendance/my?employeeId=${c.emp._id}`, a.token)).status, 400);
    const team = await ctx.call('GET', '/attendance/team', mgr.token);
    const emails = new Set(team.body.data.items.map((r) => r.employeeId.userId.email));
    assert.ok(emails.has('a@t.test') && emails.has('b@t.test') && !emails.has('c@t.test'));
    assert.equal((await ctx.call('GET', `/attendance/team?employeeId=${c.emp._id}`, mgr.token)).status, 403);
    assert.equal((await ctx.call('GET', '/attendance?department=Finance', hr.token)).body.data.total, 1);
    assert.equal((await ctx.call('GET', '/attendance?status=half-day', hr.token)).body.data.total, 2);
    assert.equal((await ctx.call('GET', '/attendance', mgr.token)).status, 403);
  });

  it("dates each employee's day in their own time zone", async () => {
    const east = await ctx.makeUser({ email: 'east@t.test', timeZone: 'Pacific/Kiritimati' });
    const west = await ctx.makeUser({ email: 'west@t.test', timeZone: 'Pacific/Pago_Pago' });
    const now = new Date();
    const eastToday = dates.toDateString(now, 'Pacific/Kiritimati');
    const westToday = dates.toDateString(now, 'Pacific/Pago_Pago');
    assert.notEqual(eastToday, westToday, 'these zones are always on different dates');

    assert.equal((await ctx.call('GET', '/attendance/today', east.token)).body.data.date, eastToday);
    const e = await ctx.call('POST', '/attendance/check-in', east.token);
    const w = await ctx.call('POST', '/attendance/check-in', west.token);
    assert.equal(e.body.data.date, eastToday);
    assert.equal(w.body.data.date, westToday);
    assert.equal(w.body.data.timeZone, 'Pacific/Pago_Pago');
    assert.equal((await ctx.call('POST', '/attendance/check-out', west.token)).body.data.date, westToday);

    const leave = (token, date) => ctx.call('POST', '/leaves', token, { leaveType: 'casual', startDate: date, endDate: date, reason: 'x' });
    assert.equal((await leave(west.token, westToday)).status, 201);
    assert.equal((await leave(east.token, westToday)).status, 400, "west's today is east's past");
  });
});
