// In production the API server also serves the built React app (client/dist), so the whole
// product runs as one service on one address: no cross-site CORS, and one place for headers.
//
// Enabled when NODE_ENV=production and client/dist/index.html exists, or forced with
// SERVE_CLIENT=true (SERVE_CLIENT=false turns it off, e.g. if the frontend is hosted elsewhere).
const fs = require('fs');
const path = require('path');
const express = require('express');
const { pageSecurityHeaders } = require('./security');

const clientDist = () => process.env.CLIENT_DIST || path.join(__dirname, '..', '..', 'client', 'dist');

const shouldServeClient = () => {
  if (process.env.SERVE_CLIENT === 'false') return false;
  const built = fs.existsSync(path.join(clientDist(), 'index.html'));
  return built && (process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production');
};

// Adds the frontend to `app`. Call after the API routes and before the 404 handler.
// Returns true if the frontend is being served.
const mountClientApp = (app) => {
  if (!shouldServeClient()) return false;
  const dist = clientDist();
  const indexHtml = path.join(dist, 'index.html');

  const pages = express.Router();
  pages.use(pageSecurityHeaders);
  // Built JS/CSS have content hashes in their names, so they can be cached for a year.
  pages.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
  // Other files (favicon, theme-init.js) change without renaming, so browsers check back.
  pages.use(express.static(dist, { index: false, maxAge: 0 }));
  // Every other address that is not the API is a page of the app: send index.html and let the
  // React router decide. index.html itself is never cached, so a new release shows immediately.
  pages.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });

  app.use(pages);
  return true;
};

module.exports = { mountClientApp, shouldServeClient };
