const mongoose = require('mongoose');
const withPassword = require('./plugins/withPassword');

// A StaffSync operator who manages organisations (the full console arrives in Phase 21).
//
// Deliberately NOT a User and NOT a role: platform admins live in their own collection, have no
// organisationId, sign in at a separate endpoint and get tokens with scope "platform", which the
// organisation API refuses. They are created only from the command line
// (npm run platform:create-admin), never through any API.
const platformAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
  }
);

platformAdminSchema.plugin(withPassword);

module.exports = mongoose.model('PlatformAdmin', platformAdminSchema);
