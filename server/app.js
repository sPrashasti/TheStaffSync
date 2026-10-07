const express = require('express');
const cors = require('cors');

const { corsOptions } = require('./config/cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

// ---- Route mounting: every route file MUST be listed here ----
// server.js prints this table on boot in development, so an unmounted module is easy to spot.
const routes = [
  ['/api/health', healthRoutes],
  ['/api/auth', authRoutes],
];
routes.forEach(([path, router]) => app.use(path, router));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.mountedPaths = routes.map(([path]) => path);
