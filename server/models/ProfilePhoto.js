const mongoose = require('mongoose');
const tenantScoped = require('./plugins/tenantScoped');

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// The app shrinks photos to 320×320 before upload (about 30 kB), so this only stops misuse.
const MAX_PHOTO_BYTES = 200 * 1024;

// A user's profile photo. Kept apart from User so the image never travels with the user record,
// which is loaded on every request; User.photoUpdatedAt says whether there is one.
const profilePhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: { values: PHOTO_TYPES, message: 'Photo must be a JPEG, PNG or WebP image' },
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

profilePhotoSchema.plugin(tenantScoped);

module.exports = mongoose.model('ProfilePhoto', profilePhotoSchema);
module.exports.PHOTO_TYPES = PHOTO_TYPES;
module.exports.MAX_PHOTO_BYTES = MAX_PHOTO_BYTES;
