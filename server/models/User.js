const mongoose = require('mongoose');
const tenantScoped = require('./plugins/tenantScoped');
const withPassword = require('./plugins/withPassword');
const { runAsPlatform } = require('../utils/tenantContext');

const ROLES = ['employee', 'manager', 'hr'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    // Unique across the whole platform, not just the organisation, so sign-in needs only the
    // email address. Checks for an address in use must therefore run with runAsPlatform().
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be one of: employee, manager, hr' },
      default: 'employee',
    },
    // Password reset by email: only a SHA-256 hash of the emailed token is stored, so a copy of
    // the database cannot be used to reset anyone's password.
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Soft delete: deactivated users keep their history but cannot log in.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // A freshly created document still holds the hash in memory; strip it from every response.
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordChangedAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
  }
);

// Every user belongs to exactly one organisation (see plugins/tenantScoped).
userSchema.plugin(tenantScoped);
userSchema.plugin(withPassword);

userSchema.index({ organisationId: 1, role: 1, isActive: 1 });

// True if any organisation already has an account with this email. Deliberately platform-wide:
// addresses are unique across StaffSync, so sign-in needs only the email.
userSchema.statics.emailInUse = function emailInUse(email) {
  return runAsPlatform(async () => Boolean(await this.exists({ email })));
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
