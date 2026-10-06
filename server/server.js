require('dotenv').config({ quiet: true });

const app = require('./app');
const { allowedOrigins } = require('./config/cors');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`StaffSync API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ') || '(none configured)'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
