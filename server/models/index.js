// Single place that loads every model. Requiring this file registers all schemas with Mongoose.
const Organisation = require('./Organisation');
const PlatformAdmin = require('./PlatformAdmin');
const PlatformAuditLog = require('./PlatformAuditLog');
const User = require('./User');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const Leave = require('./Leave');
const Announcement = require('./Announcement');
const Training = require('./Training');
const Notification = require('./Notification');
const Counter = require('./Counter');

module.exports = {
  Organisation,
  PlatformAdmin,
  PlatformAuditLog,
  User,
  Employee,
  Attendance,
  Leave,
  Announcement,
  Training,
  Notification,
  Counter,
};
