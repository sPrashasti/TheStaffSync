const express = require('express');
const { getEmployeeDashboard, getManagerDashboard, getHrDashboard } = require('../controllers/dashboardController');
const { protect, authorize, loadEmployee } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { noQueryRules } = require('../validators/reportValidators');

const router = express.Router();

router.use(protect, loadEmployee);

router.get('/employee', authorize('employee'), noQueryRules, validate, getEmployeeDashboard);
router.get('/manager', authorize('manager'), noQueryRules, validate, getManagerDashboard);
router.get('/hr', authorize('hr'), noQueryRules, validate, getHrDashboard);

module.exports = router;
