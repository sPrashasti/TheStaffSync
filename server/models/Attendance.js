const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['present', 'half-day', 'absent'];

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    // Calendar day as YYYY-MM-DD, computed on the server, so timezones cannot shift a record to another day.
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    // The time zone `date` was worked out in, kept so the record still makes sense if the
    // employee's time zone changes later.
    timeZone: {
      type: String,
      required: [true, 'Time zone is required'],
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOut: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          return !value || !this.checkIn || value > this.checkIn;
        },
        message: 'Check-out must be after check-in',
      },
    },
    status: {
      type: String,
      enum: { values: ATTENDANCE_STATUSES, message: 'Status must be one of: present, half-day, absent' },
      default: 'present',
    },
    workingHours: {
      type: Number,
      default: 0,
      min: [0, 'Working hours cannot be negative'],
    },
  },
  { timestamps: true }
);

// One record per employee per day: the database itself rejects a second check-in.
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// Serves date filters and the newest-first sort ({ date: -1, checkIn: -1 }, read backwards), so
// company-wide lists never sort every record in memory.
attendanceSchema.index({ date: 1, checkIn: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
