const Announcement = require('../models/Announcement');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');

const withAuthor = { path: 'createdBy', select: 'name email' };
const EDITABLE_FIELDS = ['title', 'content', 'targetAudience'];

// The audiences each role may read. HR sees everything.
const VISIBLE_TO = {
  employee: ['all', 'employees'],
  manager: ['all', 'managers'],
  hr: ['all', 'employees', 'managers'],
};

const visibleAudiences = (role) => VISIBLE_TO[role] || ['all'];

// Loads an announcement the caller may see. Ones outside their audience are reported as not
// found, so their existence is not revealed.
const loadVisible = async (id, role) => {
  const announcement = await Announcement.findById(id);
  if (!announcement || !visibleAudiences(role).includes(announcement.targetAudience)) {
    throw new AppError('Announcement not found', 404);
  }
  return announcement;
};

// GET /api/announcements — any role, newest first. HR may filter by ?targetAudience=.
const listAnnouncements = async (req, res) => {
  const visible = visibleAudiences(req.user.role);
  const { targetAudience } = req.query;
  // Asking for an audience you cannot see gives an empty list, never someone else's posts.
  const audiences = targetAudience ? visible.filter((a) => a === targetAudience) : visible;
  const filter = { targetAudience: { $in: audiences } };

  const pagination = getPagination(req.query);
  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate(withAuthor),
    Announcement.countDocuments(filter),
  ]);
  sendSuccess(res, { message: 'Announcements', data: buildPage(items, total, pagination) });
};

// GET /api/announcements/:id — any role, if it is meant for them.
const getAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user.role);
  await announcement.populate(withAuthor);
  sendSuccess(res, { message: 'Announcement', data: announcement });
};

// POST /api/announcements — hr.
const createAnnouncement = async (req, res) => {
  const { title, content, targetAudience } = req.body;
  const announcement = await Announcement.create({ title, content, targetAudience, createdBy: req.user._id });
  await announcement.populate(withAuthor);
  sendCreated(res, { message: 'Announcement published', data: announcement });
};

// PUT /api/announcements/:id — hr.
const updateAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user.role);
  EDITABLE_FIELDS.forEach((field) => { if (field in req.body) announcement.set(field, req.body[field]); });
  await announcement.save();
  await announcement.populate(withAuthor);
  sendSuccess(res, { message: 'Announcement updated', data: announcement });
};

// DELETE /api/announcements/:id — hr.
const deleteAnnouncement = async (req, res) => {
  const announcement = await loadVisible(req.params.id, req.user.role);
  await announcement.deleteOne();
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
