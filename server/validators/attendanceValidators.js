const { checkExact, query } = require('express-validator');
const { ATTENDANCE_STATUSES } = require('../models/Attendance');
const { isDateString } = require('../utils/dates');

const dateParam = (field) =>
  query(field)
    .optional()
    .custom(isDateString).withMessage(`${field} must be a date in YYYY-MM-DD format`);

const dateRangeRules = [
  dateParam('date'),
  dateParam('from'),
  dateParam('to'),
  query('date')
    .optional()
    .custom((value, { req }) => !req.query.from && !req.query.to)
    .withMessage('Use either date or from/to, not both'),
  query('to')
    .optional()
    .custom((to, { req }) => !req.query.from || !isDateString(req.query.from) || req.query.from <= to)
    .withMessage('to must be on or after from'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

const employeeIdParam = query('employeeId').optional().isMongoId().withMessage('employeeId must be a valid id');

// Only query parameters are checked for unknown names here.
const exactQuery = (rules) => checkExact(rules, { locations: ['query'] });

// Check-in and check-out take no input: the time is always the server's.
const noBodyRules = [checkExact([], { locations: ['body'] })];

const myAttendanceRules = [exactQuery(dateRangeRules)];
const teamAttendanceRules = [exactQuery([...dateRangeRules, employeeIdParam])];
const allAttendanceRules = [
  exactQuery([
    ...dateRangeRules,
    employeeIdParam,
    query('department')
      .optional()
      .isString().withMessage('Department must be text')
      .trim()
      .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
    query('status')
      .optional()
      .isIn(ATTENDANCE_STATUSES).withMessage(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
  ]),
];

module.exports = { noBodyRules, myAttendanceRules, teamAttendanceRules, allAttendanceRules };
