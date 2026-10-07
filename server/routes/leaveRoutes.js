const express = require('express');
const {
  applyLeave,
  getMyLeaves,
  getTeamLeaves,
  getAllLeaves,
  getLeave,
  approveLeave,
  rejectLeave,
} = require('../controllers/leaveController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate, validateObjectId } = require('../middleware/validate');
const {
  applyLeaveRules,
  approveLeaveRules,
  rejectLeaveRules,
  myLeavesRules,
  teamLeavesRules,
  allLeavesRules,
} = require('../validators/leaveValidators');

const router = express.Router();

// Every leave route needs a logged-in user with an employee profile.
router.use(protect, loadEmployee);

// Fixed paths come before /:id so "my" and "team" are not read as ids.
router.get('/my', myLeavesRules, validate, getMyLeaves);
router.get('/team', authorize('manager'), teamLeavesRules, validate, getTeamLeaves);
router.get('/', authorize('hr'), allLeavesRules, validate, getAllLeaves);
router.post('/', authorize('employee', 'manager'), applyLeaveRules, validate, applyLeave);

// Ownership and team checks for single requests happen in the controller.
router.get('/:id', validateObjectId(), getLeave);
router.put('/:id/approve', authorize('manager', 'hr'), validateObjectId(), approveLeaveRules, validate, approveLeave);
router.put('/:id/reject', authorize('manager', 'hr'), validateObjectId(), rejectLeaveRules, validate, rejectLeave);

module.exports = router;
