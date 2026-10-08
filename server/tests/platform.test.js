// Phase 21: the platform admin console API — organisations, suspension, audit log and the
// separation from organisation accounts.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

const PASSWORD = 'Passw0rd123';

describe('platform console', () => {
  let ctx;
  let platform;
  const orgs = {};

  const p = (method, path, body, token = platform) => ctx.call(method, `/platform${path}`, token, body);

  before(async () => {
    ctx = await setup('platform', { strict: true });
    for (const [k, name] of [['acme', 'Acme Ltd'], ['beta', 'Beta Works'], ['gamma', 'Gamma Co']]) {
      const x = await ctx.call('POST', '/organisations/signup', null, { companyName: name, name: `HR ${k}`, email: `hr@${k}.test`, password: PASSWORD });
      orgs[k] = { id: x.body.data.organisation._id, hr: x.body.data.token };
    }
    await ctx.call('POST', '/employees', orgs.acme.hr, { name: 'Ann Employee', email: 'ann@acme.test', password: PASSWORD, department: 'Ops', designation: 'Clerk', phone: '+44 7700 900111' });
    await ctx.models.PlatformAdmin.create({ name: 'Operator', email: 'ops@staffsync.test', password: PASSWORD });
    platform = (await ctx.call('POST', '/platform/auth/login', null, { email: 'ops@staffsync.test', password: PASSWORD })).body.data.token;
  });
  after(async () => { await ctx.teardown(); });

  it('refuses organisation tokens, HR included, on every platform endpoint', async () => {
    const id = orgs.acme.id;
    for (const [method, path, body] of [
      ['GET', '/stats'], ['GET', '/organisations'], ['GET', `/organisations/${id}`], ['PATCH', `/organisations/${id}`, { name: 'X Co' }],
      ['POST', `/organisations/${id}/suspend`, { reason: 'abuse' }], ['POST', `/organisations/${id}/reactivate`, {}], ['GET', '/audit'],
    ]) {
      assert.equal((await p(method, path, body, orgs.acme.hr)).status, 401, `${method} ${path}`);
      assert.equal((await p(method, path, body, null)).status, 401, `${method} ${path} without token`);
    }
    assert.equal((await ctx.call('GET', `/organisations/${id}`, platform)).status, 404, 'no organisation API route takes an id');
  });

  // The test set-up also creates an empty "Test Organisation", so there are four.
  it('shows platform statistics', async () => {
    const { body } = await p('GET', '/stats');
    assert.deepEqual(body.data.organisations, { total: 4, active: 4, suspended: 0, newLast30Days: 4 });
    assert.deepEqual(body.data.users, { total: 4, active: 4 });
    assert.deepEqual(body.data.recentOrganisations.map((o) => o.name), ['Gamma Co', 'Beta Works', 'Acme Ltd', 'Test Organisation']);
  });

  it('lists organisations with search, status filter and pages, treating search as plain text', async () => {
    let x = await p('GET', '/organisations?limit=2');
    assert.equal(x.body.data.total, 4);
    assert.equal(x.body.data.items.length, 2);
    assert.equal(x.body.data.totalPages, 2);
    x = await p('GET', '/organisations?q=acme');
    assert.deepEqual(x.body.data.items.map((o) => [o.name, o.users]), [['Acme Ltd', 2]]);
    assert.equal((await p('GET', '/organisations?q=.*')).body.data.total, 0, 'not a regular expression');
    assert.equal((await p('GET', '/organisations?status=deleted')).status, 400);
    assert.equal((await p('GET', '/organisations?sort=name')).status, 400, 'unknown parameters refused');
  });

  it('shows an organisation’s usage and HR contacts, but no employee records', async () => {
    const x = await p('GET', `/organisations/${orgs.acme.id}`);
    assert.equal(x.status, 200);
    assert.deepEqual(x.body.data.usage.users, { hr: 1, manager: 0, employee: 1, inactive: 0 });
    assert.deepEqual(x.body.data.hrContacts, [{ name: 'HR acme', email: 'hr@acme.test', isActive: true }]);
    const text = JSON.stringify(x.body);
    assert.ok(!text.includes('ann@acme.test') && !text.includes('7700'), 'no employee details');
    assert.ok(!text.includes('password'));
    assert.equal((await p('GET', '/organisations/64b7f0000000000000000000')).status, 404);
    assert.equal((await p('GET', '/organisations/not-an-id')).status, 400);
  });

  it('renames an organisation, and only its name', async () => {
    assert.equal((await p('PATCH', `/organisations/${orgs.beta.id}`, { name: 'Beta Works Ltd' })).status, 200);
    assert.equal((await ctx.call('GET', '/organisations/me', orgs.beta.hr)).body.data.name, 'Beta Works Ltd');
    const sneaky = await p('PATCH', `/organisations/${orgs.beta.id}`, { name: 'Beta', status: 'suspended', settings: { timeZone: 'UTC' } });
    assert.equal(sneaky.status, 400);
    assert.deepEqual(sneaky.body.errors.map((e) => e.field).sort(), ['settings', 'status']);
  });

  it('suspends an organisation at once, with a reason, and reactivates it', async () => {
    assert.equal((await p('POST', `/organisations/${orgs.gamma.id}/suspend`, {})).status, 400, 'reason required');
    const x = await p('POST', `/organisations/${orgs.gamma.id}/suspend`, { reason: 'Unpaid invoices' });
    assert.equal(x.status, 200);
    assert.equal(x.body.data.status, 'suspended');
    // Existing sessions stop on their next request, and nobody can sign in.
    assert.equal((await ctx.call('GET', '/auth/me', orgs.gamma.hr)).status, 403);
    assert.equal((await ctx.call('POST', '/auth/login', null, { email: 'hr@gamma.test', password: PASSWORD })).status, 403);
    // Other organisations carry on.
    assert.equal((await ctx.call('GET', '/auth/me', orgs.acme.hr)).status, 200);
    assert.equal((await p('POST', `/organisations/${orgs.gamma.id}/suspend`, { reason: 'Again' })).status, 409);
    const detail = await p('GET', `/organisations/${orgs.gamma.id}`);
    assert.equal(detail.body.data.suspension.reason, 'Unpaid invoices');
    assert.equal((await p('GET', '/organisations?status=suspended')).body.data.total, 1);

    assert.equal((await p('POST', `/organisations/${orgs.gamma.id}/reactivate`, {})).status, 200);
    assert.equal((await ctx.call('GET', '/auth/me', orgs.gamma.hr)).status, 200, 'the same session works again');
    assert.equal((await p('GET', `/organisations/${orgs.gamma.id}`)).body.data.suspension, null);
    assert.equal((await p('POST', `/organisations/${orgs.gamma.id}/reactivate`, {})).status, 409);
  });

  it('records every change in the audit log, newest first', async () => {
    const x = await p('GET', '/audit');
    assert.deepEqual(x.body.data.items.map((e) => e.action), ['organisation.reactivate', 'organisation.suspend', 'organisation.update']);
    const [reactivate, suspend, rename] = x.body.data.items;
    assert.equal(suspend.details.reason, 'Unpaid invoices');
    assert.equal(suspend.adminEmail, 'ops@staffsync.test');
    assert.equal(reactivate.details.previousReason, 'Unpaid invoices');
    assert.deepEqual([rename.details.from, rename.details.to], ['Beta Works', 'Beta Works Ltd']);
    assert.equal((await p('GET', `/audit?organisationId=${orgs.gamma.id}`)).body.data.total, 2);
    assert.equal((await p('GET', '/audit?action=organisation.update')).body.data.total, 1);
    // Append-only: there is no route to change or delete entries.
    assert.equal((await p('DELETE', `/audit/${suspend._id}`)).status, 404);
  });

  it('lets a platform admin change their password, signing out older sessions', async () => {
    const wrong = await p('PUT', '/auth/password', { currentPassword: 'Wrong123x', newPassword: 'NewPassw0rd1' });
    assert.equal(wrong.status, 400);
    await new Promise((r) => { setTimeout(r, 1100); });
    const ok = await p('PUT', '/auth/password', { currentPassword: PASSWORD, newPassword: 'NewPassw0rd1' });
    assert.equal(ok.status, 200);
    assert.equal((await p('GET', '/me')).status, 401, 'the old token is revoked');
    platform = ok.body.data.token;
    assert.equal((await p('GET', '/me')).status, 200);
    assert.equal((await p('GET', '/audit?action=admin.password')).body.data.total, 1);
  });

  it('refuses a deactivated platform admin at once', async () => {
    await ctx.models.PlatformAdmin.updateOne({ email: 'ops@staffsync.test' }, { isActive: false });
    assert.equal((await p('GET', '/stats')).status, 401);
    assert.equal((await ctx.call('POST', '/platform/auth/login', null, { email: 'ops@staffsync.test', password: 'NewPassw0rd1' })).status, 401);
  });
});
