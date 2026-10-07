// Runs when no route matched the request.
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Mongoose cast messages repeat the submitted value; use a fixed message instead.
const castMessage = (path) => `Invalid value for ${path}`;

// Turns known library errors into { statusCode, message, errors? } a client can act on.
// Anything not recognised here stays a 500.
const normaliseError = (err) => {
  // Malformed JSON body (express.json)
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body contains invalid JSON' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }

  // Schema validation failed on save/create
  if (err.name === 'ValidationError' && err.errors) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.name === 'CastError' ? castMessage(e.path) : e.message,
      })),
    };
  }

  // A malformed ObjectId can never match a document, so an invalid id is reported as not found.
  if (err.name === 'CastError') {
    return err.path === '_id'
      ? { statusCode: 404, message: 'Resource not found' }
      : { statusCode: 400, message: castMessage(err.path) };
  }

  // Query filter used a field that is not in the schema (strictQuery: 'throw')
  if (err.name === 'StrictModeError') {
    return { statusCode: 400, message: 'Request contains an unknown field' };
  }

  // Unique index violation
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || err.keyPattern || {});
    return {
      statusCode: 409,
      message: fields.length
        ? `A record with this ${fields.join(' and ')} already exists`
        : 'A record with these details already exists',
      errors: fields.map((field) => ({ field, message: `${field} already exists` })),
    };
  }

  return {
    statusCode: err.statusCode || err.status || 500,
    message: err.message || 'Internal Server Error',
    errors: err.errors,
  };
};

// Central error handler: every error leaves the API in the same JSON shape,
// { success: false, message, errors? }. Express 5 forwards errors thrown in async handlers here.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errors } = normaliseError(err);
  if (statusCode < 400 || statusCode > 599) statusCode = 500;

  const isProduction = process.env.NODE_ENV === 'production';
  if (statusCode === 500) {
    console.error(err);
    if (isProduction) message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(Array.isArray(errors) && errors.length > 0 && { errors }),
    ...(!isProduction && statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
