const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/apiResponse');

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// GET /api/health
const getHealth = (req, res) => {
  sendSuccess(res, {
    message: 'StaffSync API is running',
    data: {
      environment: process.env.NODE_ENV || 'development',
      database: DB_STATES[mongoose.connection.readyState] || 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { getHealth };
