const mongoose = require('mongoose');

const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'];
const LEAVE_STATUSES = ['pending', 'approved', 'rejected'];

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: { values: LEAVE_TYPES, message: 'Leave type must be one of: casual, sick, earned, unpaid' },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'End date cannot be before start date',
      },
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: { values: LEAVE_STATUSES, message: 'Status must be one of: pending, approved, rejected' },
      default: 'pending',
    },
    // The User who approved or rejected the request.
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
module.exports.LEAVE_TYPES = LEAVE_TYPES;
module.exports.LEAVE_STATUSES = LEAVE_STATUSES;
