const Announcement = require('../models/Announcement');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const notifications = require('../services/notificationService');

const withAuthor = { path: 'createdBy', select: 'name email role' };
const EDITABLE_FIELDS = ['title', 'content', 'targetAudience'];

// The audiences each role may read. HR sees everything. Authors always see their own posts.
const VISIBLE_TO = {
  employee: ['all', 'employees'],
  manager: ['all', 'managers'],
  hr: ['all', 'employees', 'managers'],
};

const visibleAudiences = (role) => VISIBLE_TO[role] || ['all'];

const isAuthor = (announcement, user) => (announcement.createdBy._id || announcement.createdBy).equals(user._id);

// Loads an announcement the caller may see: one for their audience, or one they wrote. Others
// are reported as not found, so their existence is not revealed.
const loadVisible = async (id, user) => {
  const announcement = await Announcement.findById(id);
  if (!announcement || !(visibleAudiences(user.role).includes(announcement.targetAudience) || isAuthor(announcement, user))) {
    throw new AppError('Announcement not found', 404);
  }
  return announcement;
};

// HR may change any announcement; a manager only the ones they posted.
const assertCanEdit = (announcement, user) => {
  if (user.role !== 'hr' && !isAuthor(announcement, user)) {
    throw new AppError('You can only change announcements you posted', 403);
  }
};

// GET /api/announcements — any role, newest first. ?targetAudience= narrows within what you can see.
const listAnnouncements = async (req, res) => {
  const visible = visibleAudiences(req.user.role);
  const { targetAudience } = req.query;
  // Asking for an audience you cannot see gives an empty list, never someone else's posts.
  const audiences = targetAudience ? visible.filter((a) => a === targetAudience) : visible;
  const filter = {
    $or: [
      { targetAudience: { $in: audiences } },
      { createdBy: req.user._id, ...(targetAudience && { targetAudience }) },
    ],
  };

  const pagination = getPagination(req.query);
  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate(withAuthor),
    Announcement.countDocuments(filter),
  ]);
  sendSuccess(res, { message: 'Announcements', data: buildPage(items, total, pagination) });
};

// GET /api/announcements/:id — any role, if it is meant for them or they wrote it.
const getAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user);
  await announcement.populate(withAuthor);
  sendSuccess(res, { message: 'Announcement', data: announcement });
};

// POST /api/announcements — hr, manager.
const createAnnouncement = async (req, res) => {
  const { title, content, targetAudience } = req.body;
  const announcement = await Announcement.create({ title, content, targetAudience, createdBy: req.user._id });
  await notifications.announcementPublished(announcement);
  await announcement.populate(withAuthor);
  sendCreated(res, { message: 'Announcement published', data: announcement });
};

// PUT /api/announcements/:id — hr (any), manager (own).
const updateAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user);
  assertCanEdit(announcement, req.user);
  EDITABLE_FIELDS.forEach((field) => { if (field in req.body) announcement.set(field, req.body[field]); });
  await announcement.save();
  await announcement.populate(withAuthor);
  sendSuccess(res, { message: 'Announcement updated', data: announcement });
};

// DELETE /api/announcements/:id — hr (any), manager (own).
const deleteAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user);
  assertCanEdit(announcement, req.user);
  await announcement.deleteOne();
  await notifications.removeFor('Announcement', announcement._id);
  sendSuccess(res, { message: 'Announcement deleted', data: { _id: announcement._id } });
};

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  visibleAudiences,
};
