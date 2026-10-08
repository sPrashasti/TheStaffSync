const express = require('express');
const { body, checkExact } = require('express-validator');
const { getDemo, demoLogin } = require('../controllers/demoController');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const { DEMO_ROLES } = require('../services/demoService');

const router = express.Router();
const limit = getLimiters();

const demoLoginRules = [
  checkExact([
    body('role').isIn(DEMO_ROLES).withMessage(`Role must be one of: ${DEMO_ROLES.join(', ')}`),
  ], { locations: ['body'] }),
];

router.get('/', getDemo);
router.post('/login', limit.demoLogin, demoLoginRules, validate, demoLogin);

module.exports = router;
