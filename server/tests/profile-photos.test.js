// Profile photos: upload, replace, view by colleagues, remove, and every refusal.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 2)]);

describe('profile photos', () => {
  let ctx;
  let ana;
  let ben;
  let outsider;
  let demoUser;

  // Raw request: the photo endpoints take and return images, not JSON.
  const send = async (method, path, token, body, contentType) => {
    const res = await fetch(ctx.base + path, {
      method,
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(contentType && { 'Content-Type': contentType }) },
      body,
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, type, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
  };
  const upload = (who, body, type = 'image/jpeg') => send('PUT', '/profile-photos/me', who.token, body, type);

  before(async () => {
    ctx = await setup('photos');
    ana = await ctx.makeUser({ name: 'Ana', email: 'ana@t.test' });
    ben = await ctx.makeUser({ name: 'Ben', email: 'ben@t.test', role: 'hr' });
    const other = await ctx.makeOrganisation('Other Co');
    outsider = await ctx.makeUser({ organisation: other, name: 'Olu', email: 'olu@t.test' });
    const demo = await ctx.makeOrganisation('Demo Co', { demo: { enabled: true } });
    demoUser = await ctx.makeUser({ organisation: demo, name: 'Dee', email: 'dee@staffsync.demo' });
  });
  after(async () => { await ctx.teardown(); });

  it('uploads a photo that colleagues can see, and records when it changed', async () => {
    const res = await upload(ana, JPEG);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.photoUpdatedAt);

    const seen = await send('GET', `/profile-photos/${ana.user._id}`, ben.token);
    assert.equal(seen.status, 200);
    assert.equal(seen.type, 'image/jpeg');
    assert.ok(seen.body.equals(JPEG));

    const me = await ctx.call('GET', '/auth/me', ana.token);
    assert.ok(me.body.data.user.photoUpdatedAt);
    const list = await ctx.call('GET', '/employees', ben.token);
    assert.ok(list.body.data.items.find((e) => e.userId.email === 'ana@t.test').userId.photoUpdatedAt);
  });

  it('replaces the photo, and the new type is served', async () => {
    assert.equal((await upload(ana, PNG, 'image/png')).status, 200);
    const seen = await send('GET', `/profile-photos/${ana.user._id}`, ben.token);
    assert.equal(seen.type, 'image/png');
    assert.equal(await ctx.models.ProfilePhoto.countDocuments({ userId: ana.user._id }), 1);
  });

  it('refuses files that are not images, wrong types, empty and oversized bodies', async () => {
    assert.equal((await upload(ana, Buffer.from('not an image at all'))).status, 400);
    assert.equal((await upload(ana, PNG, 'image/jpeg')).status, 400);
    assert.equal((await upload(ana, Buffer.from('hello'), 'text/plain')).status, 415);
    assert.equal((await upload(ana, JSON.stringify({ a: 1 }), 'application/json')).status, 415);
    assert.equal((await upload(ana, Buffer.alloc(0))).status, 400);
    const big = Buffer.concat([JPEG, Buffer.alloc(210 * 1024)]);
    assert.equal((await upload(ana, big)).status, 413);
  });

  it('needs a signed-in user for every photo endpoint', async () => {
    assert.equal((await send('PUT', '/profile-photos/me', null, JPEG, 'image/jpeg')).status, 401);
    assert.equal((await send('DELETE', '/profile-photos/me')).status, 401);
    assert.equal((await send('GET', `/profile-photos/${ana.user._id}`)).status, 401);
  });

  it('keeps photos inside their organisation', async () => {
    assert.equal((await send('GET', `/profile-photos/${ana.user._id}`, outsider.token)).status, 404);
    assert.equal((await send('GET', '/profile-photos/not-an-id', ben.token)).status, 400);
  });

  it('removes the photo', async () => {
    const res = await send('DELETE', '/profile-photos/me', ana.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.photoUpdatedAt, null);
    assert.equal((await send('GET', `/profile-photos/${ana.user._id}`, ben.token)).status, 404);
    const me = await ctx.call('GET', '/auth/me', ana.token);
    assert.equal(me.body.data.user.photoUpdatedAt, null);
  });

  it('refuses photo changes in the public demo', async () => {
    assert.equal((await upload(demoUser, JPEG)).status, 403);
    assert.equal((await send('DELETE', '/profile-photos/me', demoUser.token)).status, 403);
  });
});
