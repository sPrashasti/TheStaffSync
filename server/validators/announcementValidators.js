const { body, checkExact, query } = require('express-validator');
const { TARGET_AUDIENCES } = require('../models/Announcement');

const text = (field, label, max, required) => {
  const chain = body(field);
  return (required ? chain : chain.optional())
    .isString().withMessage(`${label} is required`)
    .trim()
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ max }).withMessage(`${label} cannot exceed ${max} characters`);
};

const audience = body('targetAudience')
  .optional()
  .isIn(TARGET_AUDIENCES).withMessage(`Target audience must be one of: ${TARGET_AUDIENCES.join(', ')}`);

const exactBody = (rules) => [checkExact(rules, { locations: ['body'] })];

// targetAudience defaults to "all" when omitted.
const createAnnouncementRules = exactBody([
  text('title', 'Title', 150, true),
  text('content', 'Content', 5000, true),
  audience,
]);

const updateAnnouncementRules = exactBody([
  text('title', 'Title', 150, false),
  text('content', 'Content', 5000, false),
  audience,
]);

const listAnnouncementRules = [
  checkExact(
    [
      query('targetAudience').optional().isIn(TARGET_AUDIENCES).withMessage(`targetAudience must be one of: ${TARGET_AUDIENCES.join(', ')}`),
      query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    ],
    { locations: ['query'] }
  ),
];

module.exports = { createAnnouncementRules, updateAnnouncementRules, listAnnouncementRules };
