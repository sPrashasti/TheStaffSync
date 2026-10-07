// Phase 18: in production the API also serves the built React app. Uses a small fake build so it
// runs without building the client.
const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'staffsync-dist-'));
fs.mkdirSync(path.join(dist, 'assets'));
fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><head><title>StaffSync</title><script src="/theme-init.js"></script></head><body><div id="root"></div></body></html>');
fs.writeFileSync(path.join(dist, 'theme-init.js'), '/* theme */');
fs.writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'console.log(1)');
process.env.CLIENT_DIST = dist;
process.env.SERVE_CLIENT = 'true';

const { setup } = require('./helpers');

describe('serving the web app', () => {
  let ctx;
  let site;

  before(async () => {
    ctx = await setup('client_app');
    site = ctx.base.replace(/\/api$/, '');
  });
  after(async () => {
    await ctx.teardown();
    fs.rmSync(dist, { recursive: true, force: true });
  });

  it('serves the app with a strict page CSP and no caching of index.html', async () => {
    const res = await fetch(`${site}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<title>StaffSync<\/title>/);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self'(;|$)/, 'scripts only from this site, no inline');
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /https:\/\/fonts\.googleapis\.com/);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    assert.equal(res.headers.get('ratelimit-policy'), null, 'pages are outside the API rate limit');
  });

  it('sends deep links to the app', async () => {
    for (const page of ['/hr/dashboard', '/employee/leaves', '/reset-password?token=abc']) {
      const res = await fetch(site + page);
      assert.equal(res.status, 200, page);
      assert.match(await res.text(), /<div id="root">/);
    }
  });

  it('caches hashed assets for a year and serves other files', async () => {
    const asset = await fetch(`${site}/assets/index-abc123.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /max-age=31536000.*immutable/);
    assert.equal((await fetch(`${site}/theme-init.js`)).status, 200);
  });

  it('keeps the API as JSON with its own headers', async () => {
    const health = await fetch(`${ctx.base}/health`);
    assert.match(health.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    const missing = await ctx.call('GET', '/not-a-route');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.message, 'Route not found: GET /api/not-a-route');
  });
});
