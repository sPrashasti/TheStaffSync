const express = require('express');
const {
  checkIn,
  checkOut,
  getToday,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  noBodyRules,
  myAttendanceRules,
  teamAttendanceRules,
  allAttendanceRules,
} = require('../validators/attendanceValidators');

const router = express.Router();

// Every attendance route needs a logged-in user with an employee profile.
router.use(protect, loadEmployee);

router.post('/check-in', noBodyRules, validate, checkIn);
router.post('/check-out', noBodyRules, validate, checkOut);
router.get('/today', getToday);
router.get('/my', myAttendanceRules, validate, getMyAttendance);
router.get('/team', authorize('manager'), teamAttendanceRules, validate, getTeamAttendance);
router.get('/', authorize('hr'), allAttendanceRules, validate, getAllAttendance);

module.exports = router;
