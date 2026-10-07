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

// Everyone reads (filtered by audience); only HR writes.
router.get('/', listAnnouncementRules, validate, listAnnouncements);
router.get('/:id', validateObjectId(), getAnnouncement);
router.post('/', authorize('hr'), createAnnouncementRules, validate, createAnnouncement);
router.put('/:id', authorize('hr'), validateObjectId(), updateAnnouncementRules, validate, updateAnnouncement);
router.delete('/:id', authorize('hr'), validateObjectId(), deleteAnnouncement);

module.exports = router;
