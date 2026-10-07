const { body } = require('express-validator');
const { passwordProblem } = require('../utils/passwordPolicy');

// Shared with the HR "create employee" endpoint in Phase 6.
const newPasswordRule = (field = 'password') =>
  body(field).custom((value) => {
    const problem = passwordProblem(value);
    if (problem) throw new Error(problem);
    return true;
  });

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
