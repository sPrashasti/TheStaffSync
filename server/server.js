require('dotenv').config({ quiet: true });

const app = require('./app');
const { mountedPaths } = app;
const { connectDB, disconnectDB } = require('./config/db');
const { allowedOrigins } = require('./config/cors');
const { assertJwtConfig } = require('./utils/token');
const { assertTimeZone, getTimeZone } = require('./utils/dates');

// Registers every model so Mongoose builds their indexes on connect.
require('./models');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    assertJwtConfig();
    assertTimeZone();
  } catch (err) {
    console.error(`Configuration error: ${err.message}`);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`StaffSync API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ') || '(none configured)'}`);
    console.log(`Attendance time zone: ${getTimeZone()}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Mounted routes: ${mountedPaths.join(', ')}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  // Finish in-flight requests and close the database connection on Ctrl+C or a platform stop.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
