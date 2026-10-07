const express = require('express');
const { getDepartmentStats, getAttendanceSummary, getLeaveSummary } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { noQueryRules, attendanceSummaryRules, leaveSummaryRules } = require('../validators/reportValidators');

const router = express.Router();

// Reports are HR only.
router.use(protect, authorize('hr'));

router.get('/department-stats', noQueryRules, validate, getDepartmentStats);
router.get('/attendance-summary', attendanceSummaryRules, validate, getAttendanceSummary);
router.get('/leave-summary', leaveSummaryRules, validate, getLeaveSummary);

module.exports = router;
