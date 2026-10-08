const express = require('express');
const {
  login,
  getMe,
  changePassword,
  getStats,
  listOrganisations,
  getOrganisation,
  updateOrganisation,
  suspendOrganisation,
  reactivateOrganisation,
  listAudit,
} = require('../controllers/platformController');
const { protectPlatform } = require('../middleware/authMiddleware');
const { getLimiters } = require('../config/security');
const { validate } = require('../middleware/validate');
const { loginRules } = require('../validators/authValidators');
const {
  listOrganisationsRules,
  organisationIdRules,
  updateOrganisationRules,
  suspendRules,
  reactivateRules,
  listAuditRules,
  changePasswordRules,
} = require('../validators/platformValidators');

const router = express.Router();
const limit = getLimiters();

// Platform admins are created only from the command line (npm run platform:create-admin).
// There is intentionally no sign-up or create-admin endpoint.
router.post('/auth/login', limit.login, loginRules, validate, login);

// Everything below: platform admin token only. Organisation users, HR included, get 401.
router.use(protectPlatform);
router.get('/me', getMe);
router.put('/auth/password', limit.passwordChange, changePasswordRules, validate, changePassword);
router.get('/stats', getStats);
router.get('/organisations', listOrganisationsRules, validate, listOrganisations);
router.get('/organisations/:id', organisationIdRules, validate, getOrganisation);
router.patch('/organisations/:id', updateOrganisationRules, validate, updateOrganisation);
router.post('/organisations/:id/suspend', suspendRules, validate, suspendOrganisation);
router.post('/organisations/:id/reactivate', reactivateRules, validate, reactivateOrganisation);
router.get('/audit', listAuditRules, validate, listAudit);

module.exports = router;
