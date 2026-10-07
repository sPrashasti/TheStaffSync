// Every successful response uses the same envelope: { success: true, message, data }.
// Errors are shaped by middleware/errorMiddleware.js, so controllers only ever call these.
const sendSuccess = (res, { statusCode = 200, message = 'OK', data = null } = {}) =>
  res.status(statusCode).json({ success: true, message, data });

const sendCreated = (res, { message = 'Created', data = null } = {}) =>
  sendSuccess(res, { statusCode: 201, message, data });

module.exports = { sendSuccess, sendCreated };
