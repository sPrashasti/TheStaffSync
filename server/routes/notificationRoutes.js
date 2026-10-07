const express = require('express');
const { checkExact, query } = require('express-validator');
const { listNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

const listRules = [
  checkExact(
    [
      query('isRead').optional().isIn(['true', 'false']).withMessage('isRead must be true or false'),
      query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    ],
    { locations: ['query'] }
  ),
];

// Everyone has their own notifications; no role restrictions.
router.use(protect);

router.get('/', listRules, validate, listNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', validateObjectId(), markRead);

module.exports = router;
