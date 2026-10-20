const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validate');
const { MAX_PHOTO_BYTES } = require('../models/ProfilePhoto');
const { uploadMyPhoto, removeMyPhoto, getPhoto } = require('../controllers/profilePhotoController');

const router = express.Router();

// Everyone manages only their own photo and sees colleagues' photos; no role restrictions.
router.use(protect);

// The body is the raw image. The type is checked in the controller, so any content type is read
// here; larger bodies are refused with 413 before they reach it.
const rawImage = express.raw({ type: () => true, limit: MAX_PHOTO_BYTES });

router.put('/me', rawImage, uploadMyPhoto);
router.delete('/me', removeMyPhoto);
router.get('/:userId', validateObjectId('userId'), getPhoto);

module.exports = router;
