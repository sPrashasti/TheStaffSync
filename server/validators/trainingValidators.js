const { body, checkExact, query } = require('express-validator');
const { isDateString } = require('../utils/dates');

const MAX_CAPACITY = 1000;

const text = (field, label, max, required) => {
  const chain = body(field);
  return (required ? chain : chain.optional())
    .isString().withMessage(`${label} is required`)
    .trim()
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ max }).withMessage(`${label} cannot exceed ${max} characters`);
};

const date = (field, label, required) => {
  const chain = body(field);
  return (required ? chain.exists({ values: 'falsy' }).withMessage(`${label} is required`).bail() : chain.optional())
    .custom(isDateString).withMessage(`${label} must be a date in YYYY-MM-DD format`);
};

const fields = (required) => [
  text('title', 'Title', 150, required),
  body('description')
    .optional({ values: 'null' })
    .isString().withMessage('Description must be text')
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  text('trainer', 'Trainer', 100, required),
  date('startDate', 'Start date', required),
  date('endDate', 'End date', required),
  // Only checkable here when both dates are sent; the controller checks the merged dates on update.
  body('endDate')
    .optional()
    .custom((end, { req }) => !isDateString(req.body.startDate) || !isDateString(end) || end >= req.body.startDate)
    .withMessage('End date cannot be before start date'),
  (required ? body('capacity').exists().withMessage('Capacity is required').bail() : body('capacity').optional())
    .isInt({ min: 1, max: MAX_CAPACITY }).withMessage(`Capacity must be a whole number from 1 to ${MAX_CAPACITY}`)
    .toInt(),
];

const exactBody = (rules) => [checkExact(rules, { locations: ['body'] })];

const createTrainingRules = exactBody(fields(true));
const updateTrainingRules = exactBody(fields(false));
const noBodyRules = exactBody([]);

const listTrainingRules = [
  checkExact(
    [
      query('status').optional().isIn(['upcoming', 'ongoing', 'completed']).withMessage('status must be one of: upcoming, ongoing, completed'),
      query('enrolled').optional().isIn(['true']).withMessage('enrolled can only be true'),
      query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    ],
    { locations: ['query'] }
  ),
];

module.exports = { createTrainingRules, updateTrainingRules, noBodyRules, listTrainingRules, MAX_CAPACITY };
