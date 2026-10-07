const { param, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Place after express-validator chains in a route. Stops the request with 400 and a list of
// { field, message } if any check failed. Submitted values are never echoed back (they may be passwords).
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));
  return next(new AppError('Validation failed', 400, errors));
};

// Rejects a malformed :id (or other named param) before it reaches the database.
const validateObjectId = (name = 'id') => [
  param(name).isMongoId().withMessage(`Invalid ${name}`),
  validate,
];

module.exports = { validate, validateObjectId };
