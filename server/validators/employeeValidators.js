const { body, checkExact, query } = require('express-validator');
const { ROLES } = require('../models/User');
const { emailRule, newPasswordRule } = require('./authValidators');
const { isValidTimeZone } = require('../utils/dates');

// Unknown query parameters are refused, as on every other list endpoint.
const listEmployeesRules = [checkExact([
  query('department')
    .optional()
    .isString().withMessage('Department must be text')
    .trim()
    .isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  query('role')
    .optional()
    .isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  query('isActive')
    .optional()
    .isIn(['true', 'false']).withMessage('isActive must be true or false')
    .toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
], { locations: ['query'] })];

// Field rules shared by create and update. `required` decides whether a field must be present.
const text = (field, label, max, required) => {
  const chain = body(field);
  return (required ? chain : chain.optional())
    .isString().withMessage(`${label} is required`)
    .trim()
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ max }).withMessage(`${label} cannot exceed ${max} characters`);
};

const pastDate = (field, label) =>
  body(field)
    .optional({ values: 'null' })
    .isISO8601({ strict: true }).withMessage(`${label} must be a date (YYYY-MM-DD)`)
    .bail()
    .custom((value) => new Date(value) < new Date()).withMessage(`${label} must be in the past`);

// null clears the field.
const personalFieldRules = [
  body('phone')
    .optional({ values: 'null' })
    .isString().withMessage('Phone must be text')
    .trim()
    .matches(/^\+?[0-9\s-]{7,20}$/).withMessage('Phone number is not valid'),
  body('address')
    .optional({ values: 'null' })
    .isString().withMessage('Address must be text')
    .trim()
    .isLength({ max: 300 }).withMessage('Address cannot exceed 300 characters'),
];

const employmentFieldRules = (required) => [
  text('department', 'Department', 100, required),
  text('designation', 'Designation', 100, required),
  body('joiningDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('Joining date must be a date (YYYY-MM-DD)'),
  pastDate('dateOfBirth', 'Date of birth'),
  body('managerId')
    .optional({ values: 'null' })
    .isMongoId().withMessage('managerId must be a valid id'),
  // null means "use the company default".
  body('timeZone')
    .optional({ values: 'null' })
    .isString().withMessage('Time zone must be text')
    .trim()
    .custom(isValidTimeZone).withMessage('Time zone must be a valid IANA name, e.g. Asia/Kolkata or Europe/London'),
];

// Only body fields are checked for unknown names; :id and query strings are validated separately.
const exactBody = (rules) => checkExact(rules, { locations: ['body'] });

// POST /api/employees
const createEmployeeRules = [
  exactBody([
    text('name', 'Name', 100, true),
    emailRule(),
    newPasswordRule(),
    body('role')
      .optional()
      .isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
    ...employmentFieldRules(true),
    ...personalFieldRules,
  ]),
];

// PUT /api/employees/:id. Every field is optional; the controller decides who may change what.
const updateEmployeeRules = [
  exactBody([
    text('name', 'Name', 100, false),
    body('email')
      .optional()
      .isString().withMessage('Email is required')
      .trim()
      .toLowerCase()
      .isEmail().withMessage('Email is not valid')
      .isLength({ max: 254 }).withMessage('Email is too long'),
    body('role')
      .optional()
      .isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
    body('isActive')
      .optional()
      .isBoolean({ strict: true }).withMessage('isActive must be true or false'),
    ...employmentFieldRules(false),
    ...personalFieldRules,
  ]),
];

module.exports = { listEmployeesRules, createEmployeeRules, updateEmployeeRules };
