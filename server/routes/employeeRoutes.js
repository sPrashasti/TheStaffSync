const express = require('express');
const { listEmployees, getMyTeam, getMyProfile } = require('../controllers/employeeController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { listEmployeesRules } = require('../validators/employeeValidators');

const router = express.Router();

// Every employee route needs a logged-in user.
router.use(protect);

// Fixed paths come before /:id routes (added in Phase 6) so "me" and "team" are not read as ids.
router.get('/me', loadEmployee, getMyProfile);
router.get('/team', authorize('manager'), loadEmployee, getMyTeam);
router.get('/', authorize('hr'), listEmployeesRules, validate, listEmployees);

module.exports = router;
