const express = require('express');
const cors = require('cors');

const { corsOptions } = require('./config/cors');
const {
  getLimiters,
  noStore,
  rejectRepeatedQuery,
  securityHeaders,
  trustProxySetting,
} = require('./config/security');
const { mountClientApp } = require('./config/clientApp');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const organisationRoutes = require('./routes/organisationRoutes');
const platformRoutes = require('./routes/platformRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', trustProxySetting());
app.use(cors(corsOptions));
// API-only protections. Pages and static files of the web app (served below in production)
// get their own headers and must stay cacheable and outside the API rate limit.
app.use('/api', securityHeaders, getLimiters().api, noStore, rejectRepeatedQuery);
app.use(express.json({ limit: '10kb' }));

// ---- Route mounting: every route file MUST be listed here ----
// server.js prints this table on boot in development, so an unmounted module is easy to spot.
const routes = [
  ['/api/health', healthRoutes],
  ['/api/auth', authRoutes],
  ['/api/organisations', organisationRoutes],
  // StaffSync operators only: a separate kind of account with its own login (see protectPlatform).
  ['/api/platform', platformRoutes],
  ['/api/employees', employeeRoutes],
  ['/api/attendance', attendanceRoutes],
  ['/api/leaves', leaveRoutes],
  ['/api/dashboard', dashboardRoutes],
  ['/api/reports', reportRoutes],
  ['/api/announcements', announcementRoutes],
  ['/api/trainings', trainingRoutes],
  ['/api/notifications', notificationRoutes],
];
routes.forEach(([path, router]) => app.use(path, router));

// Production: the built React app on the same address. Unknown /api/… routes still get JSON 404s.
mountClientApp(app);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.mountedPaths = routes.map(([path]) => path);
