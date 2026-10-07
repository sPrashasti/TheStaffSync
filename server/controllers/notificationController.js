const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');

// GET /api/notifications — own only, newest first. Optional ?isRead=true|false.
// unreadCount is always the total unread, whatever the filter, for the bell badge.
const listNotifications = async (req, res) => {
  const filter = { recipient: req.user._id };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

  const pagination = getPagination(req.query);
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);
  sendSuccess(res, { message: 'Notifications', data: { ...buildPage(items, total, pagination), unreadCount } });
};

// PUT /api/notifications/:id/read — owner. Someone else's notification is reported as not found.
const markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { isRead: true } },
    { returnDocument: 'after' }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  sendSuccess(res, { message: 'Notification marked as read', data: notification });
};

// PUT /api/notifications/read-all — owner.
const markAllRead = async (req, res) => {
  const { modifiedCount } = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  sendSuccess(res, { message: 'All notifications marked as read', data: { updated: modifiedCount } });
};

module.exports = { listNotifications, markRead, markAllRead };
