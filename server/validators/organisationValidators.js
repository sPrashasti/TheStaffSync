const { body, checkExact } = require('express-validator');
const { DAY_NAMES } = require('../models/Organisation');
const { isValidTimeZone } = require('../utils/dates');

// PUT /api/organisations/me — hr. Only the name and settings can be changed here; the slug and
// status are platform-level and never accepted from an organisation.
const updateOrganisationRules = [
  checkExact(
    [
      body('name')
        .optional()
        .isString().withMessage('Organisation name must be text')
        .trim()
        .isLength({ min: 2 }).withMessage('Organisation name must be at least 2 characters')
        .isLength({ max: 100 }).withMessage('Organisation name cannot exceed 100 characters'),
      body('settings').optional().isObject().withMessage('Settings must be an object'),
      body('settings.timeZone')
        .optional()
        .custom(isValidTimeZone).withMessage('Time zone must be a valid IANA name, e.g. Asia/Kolkata'),
      body('settings.workingDays')
        .optional()
        .isArray({ min: 1, max: 7 }).withMessage('Working days must list at least one day')
        .bail()
        .custom((days) => days.every((d) => DAY_NAMES.includes(d)) && new Set(days).size === days.length)
        .withMessage(`Working days must be distinct values from: ${DAY_NAMES.join(', ')}`),
    ],
    { locations: ['body'] }
  ),
  body().custom((value) => Object.keys(value || {}).length > 0).withMessage('Nothing to update'),
];

module.exports = { updateOrganisationRules };
