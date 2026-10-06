// Runs when no route matched the request.
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Central error handler: every error leaves the API in the same JSON shape.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON';
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (statusCode === 500) {
    console.error(err);
    if (isProduction) message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(!isProduction && statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
