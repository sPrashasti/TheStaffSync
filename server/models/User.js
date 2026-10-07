const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const ROLES = ['employee', 'manager', 'hr'];

const userSchema = new mongoose.Schema(
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
    // Stores the bcrypt hash (see the pre-save hook below). Never returned by queries
    // unless explicitly requested with .select('+password').
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be one of: employee, manager, hr' },
      default: 'employee',
    },
    // When the password last changed. Tokens issued before this are rejected, which signs out
    // every other session.
    passwordChangedAt: {
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
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });

const SALT_ROUNDS = 12;

// Hash on create and whenever the password changes, never on other updates.
// Only covers save()/create(); updateOne/findOneAndUpdate would bypass this, so never set passwords that way.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  // A second earlier, so the token issued with the new password (whole seconds) still counts.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

// True if a token issued at `issuedAt` (seconds) predates the latest password change.
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(issuedAt) {
  return Boolean(this.passwordChangedAt) && issuedAt < Math.floor(this.passwordChangedAt.getTime() / 1000);
};

// Requires the document to have been loaded with .select('+password').
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
