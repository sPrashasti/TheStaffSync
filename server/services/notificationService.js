// Creates notifications for events in other modules. A notification is a side effect: if
// writing one fails, the error is logged and the original action (approving leave, publishing
// an announcement…) still succeeds.
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const User = require('../models/User');

// "20 Oct 2026" for a date stored at midnight UTC.
const formatDate = (date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const formatRange = (start, end) =>
  (start.getTime() === end.getTime() ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`);

// Sends one notification to each recipient (duplicates removed). Never throws.
const notify = async (recipientIds, { type, title, message, entityType, entityId }) => {
  const unique = [...new Set(recipientIds.filter(Boolean).map(String))];
  if (unique.length === 0) return 0;
  try {
    await Notification.insertMany(unique.map((recipient) => ({
      recipient,
      type,
      title,
      message,
      relatedEntity: entityType ? { entityType, entityId } : undefined,
    })));
    return unique.length;
  } catch (err) {
    console.error(`Could not create ${type} notifications: ${err.message}`);
    return 0;
  }
};

const activeUserIds = (filter) => User.find({ ...filter, isActive: true }).distinct('_id');

// Who decides a request from this employee: their active manager, otherwise every active HR user.
const leaveApproverIds = async (applicant) => {
  if (applicant.managerId) {
    const manager = await Employee.findById(applicant.managerId).populate('userId', 'isActive');
    if (manager && manager.userId && manager.userId.isActive) return [manager.userId._id];
  }
  return activeUserIds({ role: 'hr' });
};

const ROLES_FOR_AUDIENCE = {
  all: ['employee', 'manager', 'hr'],
  employees: ['employee'],
  managers: ['manager'],
};

const leaveRequested = async ({ leave, applicant, applicantName }) =>
  notify(await leaveApproverIds(applicant), {
    type: 'leave',
    title: 'New leave request',
    message: `${applicantName} requested ${leave.leaveType} leave for ${formatRange(leave.startDate, leave.endDate)}.`,
    entityType: 'Leave',
    entityId: leave._id,
  });

const leaveDecided = async ({ leave, applicant, deciderName }) => {
  const approved = leave.status === 'approved';
  const range = formatRange(leave.startDate, leave.endDate);
  return notify([applicant.userId], {
    type: 'leave',
    title: approved ? 'Leave approved' : 'Leave rejected',
    message: approved
      ? `Your ${leave.leaveType} leave for ${range} was approved by ${deciderName}.`
      : `Your ${leave.leaveType} leave for ${range} was rejected by ${deciderName}: ${leave.rejectionReason}`,
    entityType: 'Leave',
    entityId: leave._id,
  });
};

const announcementPublished = async (announcement) => {
  const recipients = await activeUserIds({
    role: { $in: ROLES_FOR_AUDIENCE[announcement.targetAudience] },
    _id: { $ne: announcement.createdBy._id || announcement.createdBy },
  });
  return notify(recipients, {
    type: 'announcement',
    title: 'New announcement',
    message: announcement.title,
    entityType: 'Announcement',
    entityId: announcement._id,
  });
};

// Notifications that point at something deleted would lead nowhere, so they go too.
const removeFor = (entityType, entityId) =>
  Notification.deleteMany({ 'relatedEntity.entityType': entityType, 'relatedEntity.entityId': entityId });

const participantUserIds = async (training) =>
  Employee.find({ _id: { $in: training.participants } }).distinct('userId');

const trainingChanged = async (training) =>
  notify(await participantUserIds(training), {
    type: 'training',
    title: 'Training updated',
    message: `"${training.title}" has been updated. It now runs ${formatRange(training.startDate, training.endDate)}.`,
    entityType: 'Training',
    entityId: training._id,
  });

const trainingAssigned = ({ training, employee, byName }) =>
  notify([employee.userId._id || employee.userId], {
    type: 'training',
    title: 'Enrolled in training',
    message: `${byName} enrolled you in "${training.title}" (${formatRange(training.startDate, training.endDate)}).`,
    entityType: 'Training',
    entityId: training._id,
  });

const trainingUnassigned = ({ training, employee, byName }) =>
  notify([employee.userId._id || employee.userId], {
    type: 'training',
    title: 'Removed from training',
    message: `${byName} removed you from "${training.title}" (${formatRange(training.startDate, training.endDate)}).`,
    entityType: 'Training',
    entityId: training._id,
  });

const trainingCancelled = async (training) => {
  const recipients = await participantUserIds(training);
  await removeFor('Training', training._id);
  // No entity link: the training no longer exists.
  return notify(recipients, {
    type: 'training',
    title: 'Training cancelled',
    message: `"${training.title}" (${formatRange(training.startDate, training.endDate)}) has been cancelled.`,
  });
};

module.exports = {
  notify,
  leaveRequested,
  leaveDecided,
  announcementPublished,
  removeFor,
  trainingChanged,
  trainingAssigned,
  trainingUnassigned,
  trainingCancelled,
};
