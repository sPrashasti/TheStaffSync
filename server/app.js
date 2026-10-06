const express = require('express');
const cors = require('cors');

const { corsOptions } = require('./config/cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

// ---- Route mounting: every route file MUST be registered here ----
app.use('/api/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
