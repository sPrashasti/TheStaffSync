const mongoose = require('mongoose');
const tenantScoped = require('./plugins/tenantScoped');

const trainingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    trainer: {
      type: String,
      required: [true, 'Trainer is required'],
      trim: true,
      maxlength: [100, 'Trainer cannot exceed 100 characters'],
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
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
      validate: {
        validator(value) {
          return !this.capacity || value.length <= this.capacity;
        },
        message: 'Training is full',
      },
    },
  },
  { timestamps: true }
);

trainingSchema.plugin(tenantScoped);

trainingSchema.index({ organisationId: 1, startDate: 1 });
trainingSchema.index({ participants: 1 });

module.exports = mongoose.model('Training', trainingSchema);
