// The platform (StaffSync operator) API. Phase 19 provides only what proves the separate path end
// to end; the full console (suspend, support tools, billing…) is Phase 21.
const bcrypt = require('bcryptjs');
const Organisation = require('../models/Organisation');
const PlatformAdmin = require('../models/PlatformAdmin');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { SCOPES, signToken } = require('../utils/token');

// See authController: unknown emails take as long to reject as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

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

// GET /api/platform/organisations — platform admin. Read-only list with headcounts. Deliberately
// no employee details: platform staff see organisations, not their people.
const listOrganisations = async (req, res) => {
  const [organisations, counts] = await Promise.all([
    Organisation.find().sort({ createdAt: 1 }),
    User.aggregate([
      { $group: { _id: '$organisationId', users: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));

  sendSuccess(res, {
    message: 'Organisations',
    data: organisations.map((o) => ({
      _id: o._id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      createdAt: o.createdAt,
      users: byId.get(String(o._id))?.users || 0,
      activeUsers: byId.get(String(o._id))?.active || 0,
    })),
  });
};

module.exports = { login, getMe, listOrganisations };
