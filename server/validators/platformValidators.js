const { body, checkExact, param, query } = require('express-validator');
const { ORGANISATION_STATUSES } = require('../models/Organisation');
const { PLATFORM_ACTIONS } = require('../models/PlatformAuditLog');
const { newPasswordRule } = require('./authValidators');

const page = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];
const organisationId = param('id').isMongoId().withMessage('Invalid id');

const listOrganisationsRules = [checkExact([
  query('q').optional().isString().trim().isLength({ max: 100 }).withMessage('Search cannot exceed 100 characters'),
  query('status').optional().isIn(ORGANISATION_STATUSES).withMessage(`Status must be one of: ${ORGANISATION_STATUSES.join(', ')}`),
  ...page,
], { locations: ['query'] })];

const organisationIdRules = [organisationId];

// Platform admins may rename an organisation (support requests); its settings stay its HR's.
const updateOrganisationRules = [organisationId, checkExact([
  body('name')
    .isString().withMessage('Organisation name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Organisation name must be at least 2 characters')
    .isLength({ max: 100 }).withMessage('Organisation name cannot exceed 100 characters'),
], { locations: ['body'] })];

const suspendRules = [organisationId, checkExact([
  body('reason')
    .isString().withMessage('A reason is required')
    .trim()
    .isLength({ min: 3 }).withMessage('Give a reason of at least 3 characters')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
], { locations: ['body'] })];

const reactivateRules = [organisationId, checkExact([], { locations: ['body'] })];

const listAuditRules = [checkExact([
  query('organisationId').optional().isMongoId().withMessage('Invalid organisationId'),
  query('action').optional().isIn(PLATFORM_ACTIONS).withMessage(`Action must be one of: ${PLATFORM_ACTIONS.join(', ')}`),
  ...page,
], { locations: ['query'] })];

const changePasswordRules = [checkExact([
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  newPasswordRule('newPassword'),
  body('newPassword')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from the current one'),
], { locations: ['body'] })];

module.exports = {
  listOrganisationsRules,
  organisationIdRules,
  updateOrganisationRules,
  suspendRules,
  reactivateRules,
  listAuditRules,
  changePasswordRules,
};
