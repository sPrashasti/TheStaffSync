const { body } = require('express-validator');

// bcrypt ignores everything after 72 bytes, so longer passwords would be silently truncated.
const MAX_PASSWORD_BYTES = 72;

// Shared with the HR "create employee" endpoint in Phase 6.
const newPasswordRule = (field = 'password') =>
  body(field)
    .isString().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES)
    .withMessage(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`)
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

const emailRule = () =>
  body('email')
    .isString().withMessage('Email is required')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Email is not valid')
    .isLength({ max: 254 }).withMessage('Email is too long');

const registerRules = [
  body('name')
    .isString().withMessage('Name is required')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  emailRule(),
  newPasswordRule(),
];

// Login only checks that something was sent; strength rules would leak policy details
// and could lock out accounts created under older rules.
const loginRules = [
  emailRule(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules, newPasswordRule, emailRule };
