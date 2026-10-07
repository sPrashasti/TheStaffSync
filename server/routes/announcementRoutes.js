const express = require('express');
const {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, validateObjectId } = require('../middleware/validate');
const {
  createAnnouncementRules,
  updateAnnouncementRules,
  listAnnouncementRules,
} = require('../validators/announcementValidators');

const router = express.Router();

router.use(protect);

// Everyone reads (filtered by audience); HR and managers write. A manager may only edit or
// delete their own posts, which the controller checks.
router.get('/', listAnnouncementRules, validate, listAnnouncements);
router.get('/:id', validateObjectId(), getAnnouncement);
router.post('/', authorize('hr', 'manager'), createAnnouncementRules, validate, createAnnouncement);
router.put('/:id', authorize('hr', 'manager'), validateObjectId(), updateAnnouncementRules, validate, updateAnnouncement);
router.delete('/:id', authorize('hr', 'manager'), validateObjectId(), deleteAnnouncement);

module.exports = router;
