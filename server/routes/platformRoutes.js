const express = require('express');
const { login, getMe, listOrganisations } = require('../controllers/platformController');
const { protectPlatform } = require('../middleware/authMiddleware');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const { loginRules } = require('../validators/authValidators');

const router = express.Router();
const limit = getLimiters();

// Platform admins are created only from the command line (npm run platform:create-admin).
// There is intentionally no sign-up or create-admin endpoint.
router.post('/auth/login', limit.login, loginRules, validate, login);

router.use(protectPlatform);
router.get('/me', getMe);
router.get('/organisations', listOrganisations);

module.exports = router;
