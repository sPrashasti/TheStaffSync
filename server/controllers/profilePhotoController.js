const ProfilePhoto = require('../models/ProfilePhoto');
const { PHOTO_TYPES } = require('../models/ProfilePhoto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

// The real type of an image, from its first bytes, so a file cannot claim to be a photo.
const detectType = (buf) => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

// Visitors share the demo accounts, so one visitor's photo would be shown to the next.
const assertNotDemo = (req) => {
  if (req.organisation.demo?.enabled) {
    throw new AppError('Profile photos cannot be changed in the demo.', 403);
  }
};

// PUT /api/profile-photos/me — any signed-in user. Body: the image itself (image/jpeg, image/png
// or image/webp), not JSON. Replaces any earlier photo.
const uploadMyPhoto = async (req, res) => {
  assertNotDemo(req);
  const declared = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!PHOTO_TYPES.includes(declared) || !Buffer.isBuffer(req.body)) {
    throw new AppError('Send the photo as a JPEG, PNG or WebP image', 415);
  }
  if (req.body.length === 0) throw new AppError('The photo is empty', 400);
  if (detectType(req.body) !== declared) throw new AppError('The file is not a valid JPEG, PNG or WebP image', 400);

  const existing = await ProfilePhoto.findOne({ userId: req.user._id });
  if (existing) {
    existing.contentType = declared;
    existing.data = req.body;
    await existing.save();
  } else {
    await ProfilePhoto.create({ userId: req.user._id, contentType: declared, data: req.body });
  }
  const photoUpdatedAt = new Date();
  await User.updateOne({ _id: req.user._id }, { $set: { photoUpdatedAt } });

  sendSuccess(res, { message: 'Profile photo updated', data: { photoUpdatedAt } });
};

// DELETE /api/profile-photos/me — any signed-in user.
const removeMyPhoto = async (req, res) => {
  assertNotDemo(req);
  await ProfilePhoto.deleteOne({ userId: req.user._id });
  await User.updateOne({ _id: req.user._id }, { $set: { photoUpdatedAt: null } });
  sendSuccess(res, { message: 'Profile photo removed', data: { photoUpdatedAt: null } });
};

// GET /api/profile-photos/:userId — any signed-in user, for anyone in their own organisation
// (the query is limited to it, so another organisation's photo is "not found").
const getPhoto = async (req, res) => {
  const photo = await ProfilePhoto.findOne({ userId: req.params.userId });
  if (!photo) throw new AppError('Photo not found', 404);
  res.set('Content-Type', photo.contentType);
  res.set('Content-Length', String(photo.data.length));
  res.send(photo.data);
};

module.exports = { uploadMyPhoto, removeMyPhoto, getPhoto, detectType };
