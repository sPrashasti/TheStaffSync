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
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
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
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(getLimiters().api);
app.use(express.json({ limit: '10kb' }));
app.use(noStore);
app.use(rejectRepeatedQuery);

// ---- Route mounting: every route file MUST be listed here ----
// server.js prints this table on boot in development, so an unmounted module is easy to spot.
const routes = [
  ['/api/health', healthRoutes],
  ['/api/auth', authRoutes],
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.mountedPaths = routes.map(([path]) => path);
