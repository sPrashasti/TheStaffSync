const { body, checkExact, query } = require('express-validator');
const { LEAVE_TYPES, LEAVE_STATUSES } = require('../models/Leave');
const { isDateString } = require('../utils/dates');

const dateField = (field, label) =>
  body(field)
    .exists({ values: 'falsy' }).withMessage(`${label} is required`)
    .bail()
    .custom(isDateString).withMessage(`${label} must be a date in YYYY-MM-DD format`);

// POST /api/leaves. Business rules (past dates, overlaps, maximum length) are checked in the controller.
const applyLeaveRules = [
  checkExact(
    [
      body('leaveType')
        .exists({ values: 'falsy' }).withMessage('Leave type is required')
        .bail()
        .isIn(LEAVE_TYPES).withMessage(`Leave type must be one of: ${LEAVE_TYPES.join(', ')}`),
      dateField('startDate', 'Start date'),
      dateField('endDate', 'End date'),
      body('endDate')
        .custom((end, { req }) => !isDateString(req.body.startDate) || !isDateString(end) || end >= req.body.startDate)
        .withMessage('End date cannot be before start date'),
      body('reason')
        .isString().withMessage('Reason is required')
        .trim()
        .notEmpty().withMessage('Reason is required')
        .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
    ],
    { locations: ['body'] }
  ),
];

const approveLeaveRules = [checkExact([], { locations: ['body'] })];

const rejectLeaveRules = [
  checkExact(
    [
      body('rejectionReason')
        .isString().withMessage('Rejection reason is required')
        .trim()
        .notEmpty().withMessage('Rejection reason is required')
        .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
    ],
    { locations: ['body'] }
  ),
];

// List filters. from/to select leave that overlaps that period.
const listFilterRules = [
  query('status').optional().isIn(LEAVE_STATUSES).withMessage(`status must be one of: ${LEAVE_STATUSES.join(', ')}`),
  query('leaveType').optional().isIn(LEAVE_TYPES).withMessage(`leaveType must be one of: ${LEAVE_TYPES.join(', ')}`),
  query('from').optional().custom(isDateString).withMessage('from must be a date in YYYY-MM-DD format'),
  query('to').optional().custom(isDateString).withMessage('to must be a date in YYYY-MM-DD format'),
  query('to')
    .optional()
    .custom((to, { req }) => !req.query.from || !isDateString(req.query.from) || req.query.from <= to)
    .withMessage('to must be on or after from'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];
const employeeIdParam = query('employeeId').optional().isMongoId().withMessage('employeeId must be a valid id');
const exactQuery = (rules) => checkExact(rules, { locations: ['query'] });

const myLeavesRules = [exactQuery(listFilterRules)];
const teamLeavesRules = [exactQuery([...listFilterRules, employeeIdParam])];
const allLeavesRules = [
  exactQuery([
    ...listFilterRules,
    employeeIdParam,
    query('department')
      .optional()
      .isString().withMessage('Department must be text')
      .trim()
      .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  ]),
];

module.exports = {
  applyLeaveRules,
  approveLeaveRules,
  rejectLeaveRules,
  myLeavesRules,
  teamLeavesRules,
  allLeavesRules,
};
