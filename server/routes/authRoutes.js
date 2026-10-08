const express = require('express');
const {
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const {
  loginRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../validators/authValidators');

const router = express.Router();
const limit = getLimiters();

router.post('/login', limit.login, loginRules, validate, login);
router.post('/forgot-password', limit.forgotPassword, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', limit.resetPassword, resetPasswordRules, validate, resetPassword);
router.get('/me', protect, getMe);
router.put('/password', protect, limit.passwordChange, changePasswordRules, validate, changePassword);

module.exports = router;
