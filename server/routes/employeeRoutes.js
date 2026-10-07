const express = require('express');
const {
  listEmployees,
  getMyTeam,
  getMyProfile,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} = require('../controllers/employeeController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate, validateObjectId } = require('../middleware/validate');
const {
  listEmployeesRules,
  createEmployeeRules,
  updateEmployeeRules,
} = require('../validators/employeeValidators');

const router = express.Router();

// Every employee route needs a logged-in user.
router.use(protect);

// Fixed paths come before /:id so "me" and "team" are not read as ids.
router.get('/me', loadEmployee, getMyProfile);
router.get('/team', authorize('manager'), loadEmployee, getMyTeam);

router.get('/', authorize('hr'), listEmployeesRules, validate, listEmployees);
router.post('/', authorize('hr'), createEmployeeRules, validate, createEmployee);

// Access to a single record (hr / self / their manager) is decided in the controller.
router.get('/:id', validateObjectId(), getEmployee);
router.put('/:id', validateObjectId(), updateEmployeeRules, validate, updateEmployee);
router.delete('/:id', authorize('hr'), validateObjectId(), deactivateEmployee);

module.exports = router;
