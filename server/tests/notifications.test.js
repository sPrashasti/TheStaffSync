// Phase 11: who is notified for each event, and the notification endpoints.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

describe('notifications', () => {
  let ctx;
  let hr1;
  let hr2;
  let mgr;
  let a;
  let b;
  let d;

  before(async () => {
    ctx = await setup('notifications');
    hr1 = await ctx.makeUser({ name: 'Hana HR', email: 'hana@t.test', role: 'hr' });
    hr2 = await ctx.makeUser({ name: 'Hari HR', email: 'hari@t.test', role: 'hr' });
    await ctx.makeUser({ name: 'Old HR', email: 'old@t.test', role: 'hr', active: false });
    mgr = await ctx.makeUser({ name: 'Mia Manager', email: 'mia@t.test', role: 'manager' });
    a = await ctx.makeUser({ name: 'Asha', email: 'asha@t.test', managerId: mgr.emp._id });
    b = await ctx.makeUser({ name: 'Bilal', email: 'bilal@t.test' });
    const today = toDateString(new Date(), getTimeZone());
    d = (n) => addDays(today, n);
  });
  after(async () => { await ctx.teardown(); });

  const inbox = (who) => ctx.models.Notification.find({ recipient: who.user._id }).sort({ createdAt: -1 });
  const apply = (who, start, end = start) => ctx.call('POST', '/leaves', who.token, { leaveType: 'casual', startDate: start, endDate: end, reason: 'x' });

  it('sends leave requests to the manager, or to every active HR user', async () => {
    const leave = (await apply(a, d(10), d(12))).body.data;
    const [n] = await inbox(mgr);
    assert.equal(n.title, 'New leave request');
    assert.match(n.message, /^Asha requested casual leave for .+ – .+\.$/);
    assert.equal(String(n.relatedEntity.entityId), leave._id);
    assert.equal((await inbox(hr1)).length, 0);

    await apply(b, d(0));
    assert.equal((await inbox(hr1)).length, 1);
    assert.equal((await inbox(hr2)).length, 1);
    assert.equal(await ctx.models.Notification.countDocuments(), 3, 'inactive HR is skipped');
  });

  it('tells the applicant about decisions, with the reason for rejections', async () => {
    const id = (await apply(a, d(20))).body.data._id;
    await ctx.call('PUT', `/leaves/${id}/reject`, hr1.token, { rejectionReason: 'Audit week' });
    const [n] = await inbox(a);
    assert.equal(n.title, 'Leave rejected');
    assert.ok(n.message.endsWith('rejected by Hana HR: Audit week'));
    const before = await ctx.models.Notification.countDocuments();
    await ctx.call('PUT', `/leaves/${id}/approve`, hr1.token);
    assert.equal(await ctx.models.Notification.countDocuments(), before, 'a refused (409) decision sends nothing');
  });

  it('notifies an announcement audience and cleans up when it is deleted', async () => {
    const id = (await ctx.call('POST', '/announcements', hr1.token, { title: 'Payslips', content: 'x', targetAudience: 'employees' })).body.data._id;
    assert.equal(await ctx.models.Notification.countDocuments({ 'relatedEntity.entityId': id }), 2);
    const all = (await ctx.call('POST', '/announcements', hr1.token, { title: 'Closed', content: 'x' })).body.data._id;
    assert.equal(await ctx.models.Notification.countDocuments({ 'relatedEntity.entityId': all }), 4, 'everyone active except the author');
    await ctx.call('DELETE', `/announcements/${id}`, hr1.token);
    assert.equal(await ctx.models.Notification.countDocuments({ 'relatedEntity.entityId': id }), 0);
  });

  it('tells participants about training changes and cancellations', async () => {
    const t = (await ctx.call('POST', '/trainings', mgr.token, { title: 'Docker', trainer: 'Ops', startDate: d(20), endDate: d(20), capacity: 5 })).body.data._id;
    await ctx.call('POST', `/trainings/${t}/enroll`, a.token);
    await ctx.call('POST', `/trainings/${t}/enroll`, b.token);
    await ctx.call('PUT', `/trainings/${t}`, mgr.token, { capacity: 6 });
    assert.equal(await ctx.models.Notification.countDocuments({ 'relatedEntity.entityId': t }), 0, 'capacity-only change is silent');
    await ctx.call('PUT', `/trainings/${t}`, mgr.token, { startDate: d(21), endDate: d(22) });
    assert.equal(await ctx.models.Notification.countDocuments({ 'relatedEntity.entityId': t }), 2);
    await ctx.call('DELETE', `/trainings/${t}`, mgr.token);
    const [n] = await inbox(a);
    assert.equal(n.title, 'Training cancelled');
    assert.equal(n.relatedEntity?.entityId, undefined);
  });

  it('lists, marks read and marks all read for the owner only', async () => {
    let x = await ctx.call('GET', '/notifications', a.token);
    const unread = x.body.data.unreadCount;
    const first = x.body.data.items[0]._id;
    assert.equal((await ctx.call('PUT', `/notifications/${first}/read`, b.token)).status, 404);
    assert.equal((await ctx.call('PUT', `/notifications/${first}/read`, a.token)).body.data.isRead, true);
    x = await ctx.call('PUT', '/notifications/read-all', a.token);
    assert.equal(x.body.data.updated, unread - 1);
    assert.equal((await ctx.call('GET', '/notifications', a.token)).body.data.unreadCount, 0);
    assert.ok(await ctx.models.Notification.countDocuments({ recipient: b.user._id, isRead: false }) > 0);
  });

  it('never fails the action when notifications cannot be written', async () => {
    const real = ctx.models.Notification.insertMany;
    const error = console.error;
    const logged = [];
    ctx.models.Notification.insertMany = async () => { throw new Error('simulated outage'); };
    console.error = (m) => logged.push(m);
    const x = await apply(b, d(50));
    ctx.models.Notification.insertMany = real;
    console.error = error;
    assert.equal(x.status, 201);
    assert.ok(logged.some((m) => /simulated outage/.test(m)));
  });
});
