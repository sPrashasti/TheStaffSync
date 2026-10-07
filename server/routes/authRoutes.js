const express = require('express');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const { registerRules, loginRules, changePasswordRules } = require('../validators/authValidators');

const router = express.Router();
const limit = getLimiters();

router.post('/register', limit.register, registerRules, validate, register);
router.post('/login', limit.login, loginRules, validate, login);
router.get('/me', protect, getMe);
router.put('/password', protect, limit.passwordChange, changePasswordRules, validate, changePassword);

module.exports = router;
