const mongoose = require('mongoose');
const tenantScoped = require('./plugins/tenantScoped');

const TARGET_AUDIENCES = ['all', 'employees', 'managers'];

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    targetAudience: {
      type: String,
      enum: { values: TARGET_AUDIENCES, message: 'Target audience must be one of: all, employees, managers' },
      default: 'all',
    },
  },
  { timestamps: true }
);

announcementSchema.plugin(tenantScoped);

announcementSchema.index({ organisationId: 1, targetAudience: 1, createdAt: -1 });
// Authors always see their own posts, whatever the audience.
announcementSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
module.exports.TARGET_AUDIENCES = TARGET_AUDIENCES;
