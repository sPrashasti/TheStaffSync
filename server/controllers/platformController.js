// The platform (StaffSync operator) API: the console for managing customer organisations.
//
// Platform admins look after ORGANISATIONS, not their people: they see counts and the HR contacts
// they would need to support a customer, never employee records, attendance or leave details.
// Every change is written to the platform audit log.
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Organisation = require('../models/Organisation');
const PlatformAdmin = require('../models/PlatformAdmin');
const PlatformAuditLog = require('../models/PlatformAuditLog');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Announcement = require('../models/Announcement');
const Training = require('../models/Training');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const { SCOPES, signToken } = require('../utils/token');

// See authController: unknown emails take as long to reject as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);
const DAY_MS = 864e5;

const audit = (req, action, organisation, details = {}) => PlatformAuditLog.create({
  admin: req.platformAdmin._id,
  adminEmail: req.platformAdmin.email,
  action,
  organisationId: organisation?._id || null,
  organisationName: organisation?.name || null,
  details,
  ip: req.ip,
});

// What the console shows about an organisation in lists.
const summary = (o, counts) => ({
  _id: o._id,
  name: o.name,
  slug: o.slug,
  status: o.status,
  isDemo: Boolean(o.demo?.enabled),
  createdAt: o.createdAt,
  users: counts?.users || 0,
  activeUsers: counts?.active || 0,
});

// User counts per organisation, for the given organisation ids (or all).
const userCounts = async (ids) => {
  const rows = await User.aggregate([
    ...(ids ? [{ $match: { organisationId: { $in: ids } } }] : []),
    { $group: { _id: '$organisationId', users: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

const loadOrganisation = async (id) => {
  const organisation = await Organisation.findById(id);
  if (!organisation) throw new AppError('Organisation not found', 404);
  return organisation;
};

// POST /api/platform/auth/login — public. Platform admins only; organisation users, HR
// included, are not in this collection and get the same "invalid" reply as a wrong password.
const login = async (req, res) => {
  const { email, password } = req.body;

  const admin = await PlatformAdmin.findOne({ email }).select('+password');
  const passwordMatches = admin
    ? await admin.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);
  if (!admin || !passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!admin.isActive) {
    throw new AppError('This account has been deactivated.', 401);
  }

  sendSuccess(res, {
    message: 'Login successful',
    data: { token: signToken(admin._id, SCOPES.platform), admin },
  });
};

// GET /api/platform/me — platform admin.
const getMe = (req, res) => {
  sendSuccess(res, { message: 'Current platform admin', data: req.platformAdmin });
};

// PUT /api/platform/auth/password — platform admin. Returns a fresh token; older ones stop working.
const changePassword = async (req, res) => {
  const admin = await PlatformAdmin.findById(req.platformAdmin._id).select('+password');
  if (!(await admin.comparePassword(req.body.currentPassword))) {
    throw new AppError('Validation failed', 400, [{ field: 'currentPassword', message: 'Current password is incorrect' }]);
  }
  admin.password = req.body.newPassword;
  await admin.save();
  await audit(req, 'admin.password', null);
  sendSuccess(res, { message: 'Password changed', data: { token: signToken(admin._id, SCOPES.platform) } });
};

// GET /api/platform/stats — platform admin. The whole platform at a glance.
const getStats = async (req, res) => {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [byStatus, users, newOrganisations, recent, demo] = await Promise.all([
    Organisation.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }]),
    Organisation.countDocuments({ createdAt: { $gte: since } }),
    Organisation.find().sort({ createdAt: -1 }).limit(5),
    Organisation.findOne({ 'demo.enabled': true }).select('name demo.lastResetAt'),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  const counts = await userCounts(recent.map((o) => o._id));

  sendSuccess(res, {
    message: 'Platform statistics',
    data: {
      organisations: {
        total: (status.active || 0) + (status.suspended || 0),
        active: status.active || 0,
        suspended: status.suspended || 0,
        newLast30Days: newOrganisations,
      },
      users: { total: users[0]?.total || 0, active: users[0]?.active || 0 },
      recentOrganisations: recent.map((o) => summary(o, counts.get(String(o._id)))),
      demo: demo ? { _id: demo._id, name: demo.name, lastResetAt: demo.demo.lastResetAt } : null,
    },
  });
};

// GET /api/platform/organisations — platform admin. ?q= (name or slug) &status= &page= &limit=
const listOrganisations = async (req, res) => {
  const pagination = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    // Escaped, so the search is plain text and never a regular expression from the client.
    const text = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: text, $options: 'i' } }, { slug: { $regex: text, $options: 'i' } }];
  }
  const [organisations, total] = await Promise.all([
    Organisation.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Organisation.countDocuments(filter),
  ]);
  const counts = await userCounts(organisations.map((o) => o._id));

  sendSuccess(res, {
    message: 'Organisations',
    data: buildPage(organisations.map((o) => summary(o, counts.get(String(o._id)))), total, pagination),
  });
};

// GET /api/platform/organisations/:id — platform admin. Details, usage counts and the HR
// contacts (the customer's administrators). No employee records.
const getOrganisation = async (req, res) => {
  const organisation = await loadOrganisation(req.params.id);
  const organisationId = organisation._id;
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [roles, employees, attendance30, pendingLeave, announcements, trainings, hr, lastAttendance] = await Promise.all([
    User.aggregate([
      { $match: { organisationId } },
      { $group: { _id: { role: '$role', isActive: '$isActive' }, n: { $sum: 1 } } },
    ]),
    Employee.countDocuments({ organisationId }),
    Attendance.countDocuments({ organisationId, checkIn: { $gte: since } }),
    Leave.countDocuments({ organisationId, status: 'pending' }),
    Announcement.countDocuments({ organisationId }),
    Training.countDocuments({ organisationId }),
    User.find({ organisationId, role: 'hr' }).select('name email isActive createdAt').sort({ createdAt: 1 }),
    Attendance.findOne({ organisationId }).sort({ checkIn: -1 }).select('checkIn'),
  ]);
  const users = { hr: 0, manager: 0, employee: 0, inactive: 0 };
  roles.forEach(({ _id, n }) => {
    if (_id.isActive) users[_id.role] += n;
    else users.inactive += n;
  });

  sendSuccess(res, {
    message: 'Organisation',
    data: {
      ...summary(organisation, { users: users.hr + users.manager + users.employee + users.inactive, active: users.hr + users.manager + users.employee }),
      settings: organisation.settings,
      suspension: organisation.status === 'suspended' ? organisation.suspension : null,
      demoLastResetAt: organisation.demo?.enabled ? organisation.demo.lastResetAt : null,
      usage: { users, employees, attendanceLast30Days: attendance30, pendingLeave, announcements, trainings, lastCheckIn: lastAttendance?.checkIn || null },
      hrContacts: hr.map((u) => ({ name: u.name, email: u.email, isActive: u.isActive })),
    },
  });
};

// PATCH /api/platform/organisations/:id — platform admin. Rename (support requests).
const updateOrganisation = async (req, res) => {
  const organisation = await loadOrganisation(req.params.id);
  const from = organisation.name;
  if (from !== req.body.name) {
    organisation.name = req.body.name;
    await organisation.save();
    await audit(req, 'organisation.update', organisation, { field: 'name', from, to: organisation.name });
  }
  sendSuccess(res, { message: 'Organisation updated', data: summary(organisation) });
};

// POST /api/platform/organisations/:id/suspend — platform admin. { reason }. Every user of the
// organisation is refused from their next request; nothing is deleted.
const suspendOrganisation = async (req, res) => {
  const organisation = await loadOrganisation(req.params.id);
  if (organisation.status === 'suspended') throw new AppError('This organisation is already suspended', 409);
  organisation.status = 'suspended';
  organisation.suspension = { reason: req.body.reason, at: new Date() };
  await organisation.save();
  await audit(req, 'organisation.suspend', organisation, { reason: req.body.reason });
  sendSuccess(res, { message: 'Organisation suspended', data: summary(organisation) });
};

// POST /api/platform/organisations/:id/reactivate — platform admin.
const reactivateOrganisation = async (req, res) => {
  const organisation = await loadOrganisation(req.params.id);
  if (organisation.status === 'active') throw new AppError('This organisation is already active', 409);
  const previous = organisation.suspension?.reason;
  organisation.status = 'active';
  organisation.suspension = undefined;
  await organisation.save();
  await audit(req, 'organisation.reactivate', organisation, { previousReason: previous || null });
  sendSuccess(res, { message: 'Organisation reactivated', data: summary(organisation) });
};

// GET /api/platform/audit — platform admin. Newest first; ?organisationId= &action= &page= &limit=
const listAudit = async (req, res) => {
  const pagination = getPagination(req.query);
  const filter = {};
  if (req.query.organisationId) filter.organisationId = new mongoose.Types.ObjectId(req.query.organisationId);
  if (req.query.action) filter.action = req.query.action;
  const [items, total] = await Promise.all([
    PlatformAuditLog.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).select('-__v'),
    PlatformAuditLog.countDocuments(filter),
  ]);
  sendSuccess(res, { message: 'Platform audit log', data: buildPage(items, total, pagination) });
};

module.exports = {
  login,
  getMe,
  changePassword,
  getStats,
  listOrganisations,
  getOrganisation,
  updateOrganisation,
  suspendOrganisation,
  reactivateOrganisation,
  listAudit,
};
