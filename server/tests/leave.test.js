// Phase 8: leave rules, overlap protection, approval rules and list scoping.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

describe('leave', () => {
  let ctx;
  let hr;
  let boss;
  let mgr;
  let mgr2;
  let a;
  let b;
  let c;
  let d;

  before(async () => {
    ctx = await setup('leave');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr', department: 'HR' });
    boss = await ctx.makeUser({ email: 'boss@t.test', role: 'manager' });
    mgr = await ctx.makeUser({ email: 'm@t.test', role: 'manager', managerId: boss.emp._id });
    mgr2 = await ctx.makeUser({ email: 'm2@t.test', role: 'manager' });
    a = await ctx.makeUser({ email: 'a@t.test', managerId: mgr.emp._id });
    b = await ctx.makeUser({ email: 'b@t.test', managerId: mgr.emp._id, department: 'Finance' });
    c = await ctx.makeUser({ email: 'c@t.test' });
    const today = toDateString(new Date(), getTimeZone());
    d = (n) => addDays(today, n);
  });
  after(async () => { await ctx.teardown(); });

  const apply = (who, body) => ctx.call('POST', '/leaves', who.token, { leaveType: 'casual', reason: 'Family event', ...body });

  it('creates pending requests with a day count', async () => {
    const x = await apply(a, { startDate: d(10), endDate: d(12) });
    assert.equal(x.status, 201);
    assert.equal(x.body.data.status, 'pending');
    assert.equal(x.body.data.days, 3);
    assert.equal(x.body.data.startDate, `${d(10)}T00:00:00.000Z`);
  });

  it('enforces date rules', async () => {
    assert.equal((await apply(a, { startDate: d(-1), endDate: d(0) })).body.errors[0].message, 'Leave cannot start in the past');
    assert.equal((await apply(a, { startDate: d(0), endDate: d(0) })).status, 201);
    assert.equal((await apply(a, { leaveType: 'sick', startDate: d(-30), endDate: d(-29) })).status, 201);
    assert.equal((await apply(a, { leaveType: 'sick', startDate: d(-31), endDate: d(-31) })).body.errors[0].message, 'Sick leave can start at most 30 days in the past');
    assert.equal((await apply(a, { startDate: d(100), endDate: d(159) })).body.data.days, 60);
    assert.equal((await apply(a, { startDate: d(200), endDate: d(260) })).body.errors[0].message, 'A single request can cover at most 60 days');
    assert.equal((await apply(a, { startDate: d(5), endDate: d(4) })).body.errors[0].message, 'End date cannot be before start date');
    assert.equal((await apply(a, { startDate: d(70), endDate: d(70), status: 'approved' })).status, 400);
    assert.equal((await apply(hr, { startDate: d(70), endDate: d(70) })).status, 403);
  });

  it('blocks overlaps, including simultaneous requests', async () => {
    const overlap = await apply(a, { startDate: d(12), endDate: d(14) });
    assert.equal(overlap.status, 409);
    assert.equal(overlap.body.message, 'These dates overlap your pending casual leave');
    assert.equal((await apply(b, { startDate: d(10), endDate: d(12) })).status, 201, 'other people may overlap');
    const burst = await Promise.all([0, 1, 2, 3].map((i) => apply(c, { startDate: d(40), endDate: d(41 + i) })));
    assert.deepEqual(burst.map((x) => x.status).sort(), [201, 409, 409, 409]);
  });

  it('lets only the direct manager or HR decide, never the applicant', async () => {
    const own = (await apply(mgr, { startDate: d(70), endDate: d(71) })).body.data._id;
    const target = (await ctx.call('GET', `/leaves/my?from=${d(11)}&to=${d(11)}`, a.token)).body.data.items[0]._id;
    assert.equal((await ctx.call('PUT', `/leaves/${target}/approve`, a.token)).status, 403);
    assert.equal((await ctx.call('PUT', `/leaves/${target}/approve`, mgr2.token)).body.message, 'This leave request is not from your team');
    assert.equal((await ctx.call('PUT', `/leaves/${own}/approve`, mgr.token)).body.message, 'You cannot approve or reject your own leave');
    assert.equal((await ctx.call('PUT', `/leaves/${own}/approve`, boss.token)).status, 200, "manager's manager decides");
    assert.equal((await ctx.call('GET', `/leaves/${target}`, boss.token)).status, 403, 'skip-level cannot view');
  });

  it('decides a request exactly once, even under a race', async () => {
    const id = (await apply(a, { startDate: d(80), endDate: d(80) })).body.data._id;
    const race = await Promise.all([
      ctx.call('PUT', `/leaves/${id}/approve`, mgr.token),
      ctx.call('PUT', `/leaves/${id}/reject`, hr.token, { rejectionReason: 'Busy' }),
      ctx.call('PUT', `/leaves/${id}/approve`, hr.token),
    ]);
    const winner = race.find((x) => x.status === 200);
    assert.equal(race.filter((x) => x.status === 200).length, 1);
    for (const lost of race.filter((x) => x.status === 409)) {
      assert.equal(lost.body.message, `This leave request has already been ${winner.body.data.status}`);
    }
  });

  it('requires a rejection reason and frees the dates after rejection', async () => {
    const id = (await apply(a, { startDate: d(90), endDate: d(90) })).body.data._id;
    assert.equal((await ctx.call('PUT', `/leaves/${id}/reject`, mgr.token, { rejectionReason: '   ' })).status, 400);
    const x = await ctx.call('PUT', `/leaves/${id}/reject`, mgr.token, { rejectionReason: '  Team offsite  ' });
    assert.equal(x.body.data.rejectionReason, 'Team offsite');
    assert.equal((await apply(a, { startDate: d(90), endDate: d(90) })).status, 201);
  });

  it('scopes lists: own, direct team, everyone for HR', async () => {
    const mine = await ctx.call('GET', '/leaves/my', a.token);
    assert.ok(mine.body.data.items.every((l) => l.employeeId === String(a.emp._id)));
    const team = await ctx.call('GET', '/leaves/team', mgr.token);
    const owners = new Set(team.body.data.items.map((l) => l.employeeId.userId.email));
    assert.ok(owners.has('a@t.test') && owners.has('b@t.test') && !owners.has('m@t.test') && !owners.has('c@t.test'));
    assert.equal((await ctx.call('GET', `/leaves/team?employeeId=${c.emp._id}`, mgr.token)).status, 403);
    assert.ok((await ctx.call('GET', '/leaves?department=Finance', hr.token)).body.data.items.every((l) => l.employeeId.department === 'Finance'));
    assert.equal((await ctx.call('GET', '/leaves', mgr.token)).status, 403);
  });
});
