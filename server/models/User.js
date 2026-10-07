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
    // Stores the bcrypt hash (hashing is added in Phase 4). Never returned by queries
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
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
