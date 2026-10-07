const { checkExact, query } = require('express-validator');
const { isDateString, daysBetween } = require('../utils/dates');

// Longest range the attendance summary accepts, to keep the per-day calculation bounded.
const MAX_REPORT_DAYS = 366;

const exactQuery = (rules) => [checkExact(rules, { locations: ['query'] })];

const department = query('department')
  .optional()
  .isString().withMessage('Department must be text')
  .trim()
  .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters');

// Dashboards and department stats take no parameters.
const noQueryRules = exactQuery([]);

const attendanceSummaryRules = exactQuery([
  query('from').optional().custom(isDateString).withMessage('from must be a date in YYYY-MM-DD format'),
  query('to').optional().custom(isDateString).withMessage('to must be a date in YYYY-MM-DD format'),
  query('to')
    .optional()
    .custom((to, { req }) => !isDateString(req.query.from) || !isDateString(to) || req.query.from <= to)
    .withMessage('to must be on or after from')
    .bail()
    .custom((to, { req }) => !isDateString(req.query.from) || !isDateString(to) || daysBetween(req.query.from, to) <= MAX_REPORT_DAYS)
    .withMessage(`The range can be at most ${MAX_REPORT_DAYS} days`),
  department,
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
]);

const leaveSummaryRules = exactQuery([
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('year must be between 2000 and 2100'),
  department,
]);

const trainingSummaryRules = exactQuery([
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('year must be between 2000 and 2100'),
]);

module.exports = { noQueryRules, attendanceSummaryRules, leaveSummaryRules, trainingSummaryRules, MAX_REPORT_DAYS };
