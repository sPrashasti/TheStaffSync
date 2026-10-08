const express = require('express');
const { signup, getMyOrganisation, updateMyOrganisation } = require('../controllers/organisationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const { signupRules } = require('../validators/authValidators');
const { updateOrganisationRules } = require('../validators/organisationValidators');

const router = express.Router();
const limit = getLimiters();

router.post('/signup', limit.signup, signupRules, validate, signup);
// "me" is always the caller's own organisation, taken from their account; there is no route that
// takes an organisation id, so one organisation can never address another.
router.get('/me', protect, getMyOrganisation);
router.put('/me', protect, authorize('hr'), updateOrganisationRules, validate, updateMyOrganisation);

module.exports = router;
