// Phase 10: announcement audiences, training ownership, capacity and enrolment rules.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

describe('announcements and training', () => {
  let ctx;
  let hr;
  let m1;
  let m2;
  let emps;
  let d;
  let training;

  before(async () => {
    ctx = await setup('announcements_training');
    hr = await ctx.makeUser({ email: 'hr@t.test', role: 'hr' });
    m1 = await ctx.makeUser({ email: 'm1@t.test', role: 'manager' });
    m2 = await ctx.makeUser({ email: 'm2@t.test', role: 'manager' });
    emps = await Promise.all(Array.from({ length: 10 }, (_, i) => ctx.makeUser({ email: `e${i}@t.test` })));
    const today = toDateString(new Date(), getTimeZone());
    d = (n) => addDays(today, n);
  });
  after(async () => { await ctx.teardown(); });

  const titles = (res) => res.body.data.items.map((i) => i.title).sort().join();

  it('shows each role only the announcements meant for it', async () => {
    const post = (b) => ctx.call('POST', '/announcements', hr.token, { content: 'x', ...b });
    await post({ title: 'Everyone' });
    const forEmployees = (await post({ title: 'Payslips', targetAudience: 'employees' })).body.data._id;
    const forManagers = (await post({ title: 'Appraisals', targetAudience: 'managers' })).body.data._id;
    assert.equal(titles(await ctx.call('GET', '/announcements', emps[0].token)), 'Everyone,Payslips');
    assert.equal(titles(await ctx.call('GET', '/announcements', m1.token)), 'Appraisals,Everyone');
    assert.equal((await ctx.call('GET', '/announcements', hr.token)).body.data.total, 3);
    assert.equal((await ctx.call('GET', `/announcements/${forManagers}`, emps[0].token)).status, 404);
    assert.equal((await ctx.call('GET', '/announcements?targetAudience=managers', emps[0].token)).body.data.total, 0);
    assert.equal((await ctx.call('POST', '/announcements', m1.token, { title: 't', content: 'c' })).status, 403);
    assert.equal((await ctx.call('DELETE', `/announcements/${forEmployees}`, hr.token)).status, 200);
  });

  it('lets HR and managers create trainings with valid dates and capacity', async () => {
    const create = (who, b) => ctx.call('POST', '/trainings', who.token, { title: 'Node.js', trainer: 'Asha', startDate: d(10), endDate: d(11), capacity: 2, ...b });
    const x = await create(m1, {});
    assert.equal(x.status, 201);
    assert.equal(x.body.data.status, 'upcoming');
    assert.equal(x.body.data.enrolmentOpen, true);
    training = x.body.data._id;
    assert.equal((await create(hr, { startDate: d(-1) })).body.errors[0].message, 'Start date cannot be in the past');
    assert.equal((await create(hr, { capacity: 2.5 })).status, 400);
    assert.equal((await create(hr, { participants: [] })).status, 400);
    assert.equal((await create(emps[0], {})).status, 403);
    const view = await ctx.call('GET', `/trainings/${training}`, emps[0].token);
    assert.ok(!('participants' in view.body.data), 'only managers of the training see who enrolled');
  });

  it('never overfills a training when ten people race for two seats', async () => {
    const race = await Promise.all(emps.map((p) => ctx.call('POST', `/trainings/${training}/enroll`, p.token)));
    assert.equal(race.filter((x) => x.status === 200).length, 2);
    assert.ok(race.filter((x) => x.status === 409).every((x) => x.body.message === 'This training is full'));
    assert.equal((await ctx.models.Training.findById(training)).participants.length, 2);
  });

  it('protects capacity and ownership', async () => {
    assert.equal((await ctx.call('PUT', `/trainings/${training}`, m1.token, { capacity: 1 })).body.message, 'Capacity cannot be less than the 2 people already enrolled');
    assert.equal((await ctx.call('PUT', `/trainings/${training}`, m2.token, { title: 'x' })).body.message, 'You can only change trainings you created');
    assert.equal((await ctx.call('PUT', `/trainings/${training}`, m1.token, { endDate: d(9) })).status, 400, 'merged dates are checked');
    assert.equal((await ctx.call('PUT', `/trainings/${training}`, m1.token, { capacity: 3 })).body.data.seatsLeft, 1);
    assert.equal((await ctx.call('POST', `/trainings/${training}/enroll`, hr.token)).status, 403);
  });

  it('closes enrolment once a training starts and keeps its history', async () => {
    const make = (start, end, extra = {}) => ctx.models.Training.create({ title: 't', trainer: 'x', startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), capacity: 5, createdBy: hr.user._id, ...extra });
    const started = await make(d(-1), d(1));
    const today = await make(d(0), d(0));
    const done = await make(d(-10), d(-9));
    assert.equal((await ctx.call('POST', `/trainings/${started._id}/enroll`, emps[9].token)).body.message, 'Enrolment has closed because this training has started');
    assert.equal((await ctx.call('POST', `/trainings/${today._id}/enroll`, emps[9].token)).status, 200, 'the start day is still open');
    assert.equal((await ctx.call('DELETE', `/trainings/${started._id}`, hr.token)).status, 409);
    assert.equal((await ctx.call('PUT', `/trainings/${done._id}`, hr.token, { title: 'x' })).status, 409);
    assert.equal((await ctx.call('GET', '/trainings?status=ongoing', emps[0].token)).body.data.total, 2);
  });

  it('reports seats filled per training', async () => {
    const { body } = await ctx.call('GET', '/reports/training-summary', hr.token);
    const row = body.data.trainings.find((t) => t._id === training);
    assert.equal(row.fillRate, Math.round((row.enrolled / row.capacity) * 1000) / 10);
  });
});
