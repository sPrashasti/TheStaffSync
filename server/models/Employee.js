const mongoose = require('mongoose');
const Counter = require('./Counter');
const { isValidTimeZone } = require('../utils/dates');

const employeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    // Assigned automatically on creation, e.g. EMP0001.
    employeeId: {
      type: String,
      unique: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\s-]{7,20}$/, 'Phone number is not valid'],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    // The manager's Employee document. A manager's team = employees whose managerId is theirs.
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    // IANA time zone (e.g. Europe/London) that decides this employee's attendance and leave dates.
    // null means the company default (TIMEZONE). Set by HR only.
    timeZone: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: (value) => value === null || isValidTimeZone(value),
        message: 'Time zone must be a valid IANA name, e.g. Asia/Kolkata',
      },
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value) => !value || value < new Date(),
        message: 'Date of birth must be in the past',
      },
    },
  },
  { timestamps: true }
);

employeeSchema.index({ managerId: 1 });
employeeSchema.index({ department: 1 });

employeeSchema.pre('validate', async function assignEmployeeId() {
  if (this.isNew && !this.employeeId) {
    const seq = await Counter.next('employeeId');
    this.employeeId = `EMP${String(seq).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
