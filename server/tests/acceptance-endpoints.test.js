// Acceptance: every endpoint planned in docs/PHASE-0-REQUIREMENTS.md §5 exists and is mounted,
// is open to the roles the permissions matrix allows, and refuses a role it does not allow.
// A missing route answers "Route not found: …"; anything else (even "Leave request not found")
// proves the route is mounted and reached its controller.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

const ANY_ID = '64b7f0000000000000000000';

// [method, path, allowed role, a role that must get 403 (or null), body]
const PLANNED = [
  ['GET', '/health', null, null],
  ['POST', '/auth/register', null, null, { name: 'X', email: 'new@t.test', password: 'Passw0rd123' }],
  ['POST', '/auth/login', null, null, { email: 'employee@t.test', password: 'Passw0rd123' }],
  ['GET', '/auth/me', 'employee', null],
  ['GET', '/employees', 'hr', 'manager'],
  ['GET', `/employees/${ANY_ID}`, 'hr', null],
  ['POST', '/employees', 'hr', 'manager', {}],
  ['PUT', `/employees/${ANY_ID}`, 'hr', null, { phone: '+44 7700 900000' }],
  ['DELETE', `/employees/${ANY_ID}`, 'hr', 'employee'],
  ['GET', '/employees/me', 'employee', null],
  ['GET', '/employees/team', 'manager', 'employee'],
  ['POST', '/attendance/check-in', 'employee', null],
  ['POST', '/attendance/check-out', 'employee', null],
  ['GET', '/attendance/my', 'employee', null],
  ['GET', '/attendance/team', 'manager', 'employee'],
  ['GET', '/attendance', 'hr', 'manager'],
  ['POST', '/leaves', 'employee', 'hr', {}],
  ['GET', '/leaves/my', 'employee', null],
  ['GET', '/leaves/team', 'manager', 'employee'],
  ['GET', '/leaves', 'hr', 'manager'],
  ['GET', `/leaves/${ANY_ID}`, 'hr', null],
  ['PUT', `/leaves/${ANY_ID}/approve`, 'manager', 'employee'],
  ['PUT', `/leaves/${ANY_ID}/reject`, 'hr', 'employee', { rejectionReason: 'x' }],
  ['GET', '/announcements', 'employee', null],
  ['POST', '/announcements', 'hr', 'manager', { title: 't', content: 'c' }],
  ['PUT', `/announcements/${ANY_ID}`, 'hr', 'employee', { title: 't' }],
  ['DELETE', `/announcements/${ANY_ID}`, 'hr', 'manager'],
  ['GET', '/trainings', 'employee', null],
  ['POST', '/trainings', 'manager', 'employee', {}],
  ['PUT', `/trainings/${ANY_ID}`, 'hr', 'employee', { title: 't' }],
  ['DELETE', `/trainings/${ANY_ID}`, 'manager', 'employee'],
  ['POST', `/trainings/${ANY_ID}/enroll`, 'employee', 'hr'],
  ['GET', '/notifications', 'employee', null],
  ['PUT', `/notifications/${ANY_ID}/read`, 'employee', null],
  ['PUT', '/notifications/read-all', 'employee', null],
  ['GET', '/dashboard/employee', 'employee', 'manager'],
  ['GET', '/dashboard/manager', 'manager', 'employee'],
  ['GET', '/dashboard/hr', 'hr', 'manager'],
  ['GET', '/reports/attendance-summary', 'hr', 'manager'],
  ['GET', '/reports/leave-summary', 'hr', 'employee'],
  ['GET', '/reports/department-stats', 'hr', 'manager'],
];

describe('acceptance: every planned endpoint is implemented, mounted and role-checked', () => {
  let ctx;
  const tokens = {};

  before(async () => {
    ctx = await setup('acceptance');
    for (const role of ['employee', 'manager', 'hr']) {
      tokens[role] = (await ctx.makeUser({ email: `${role}@t.test`, role })).token;
    }
  });
  after(async () => { await ctx.teardown(); });

  it(`covers all ${PLANNED.length} endpoints from the requirements`, () => {
    assert.equal(PLANNED.length, 41);
  });

  for (const [method, path, allowed, denied, body] of PLANNED) {
    it(`${method} /api${path}${allowed ? ` (${allowed})` : ''}`, async () => {
      const x = await ctx.call(method, path, allowed && tokens[allowed], body);
      assert.ok(!/^Route not found/.test(x.body.message || ''), 'route is mounted');
      assert.ok(![401, 403].includes(x.status), `${allowed || 'public'} is allowed (got ${x.status} ${x.body.message})`);
      assert.equal(typeof x.body.success, 'boolean', 'uses the response envelope');
      if (denied) {
        const refused = await ctx.call(method, path, tokens[denied], body);
        assert.equal(refused.status, 403, `${denied} must be refused`);
      }
    });
  }
});
