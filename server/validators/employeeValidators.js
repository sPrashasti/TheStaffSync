const { query } = require('express-validator');
const { ROLES } = require('../models/User');

const listEmployeesRules = [
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
];

module.exports = { listEmployeesRules };
