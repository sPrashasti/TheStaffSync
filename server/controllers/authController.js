const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Organisation = require('../models/Organisation');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { signToken } = require('../utils/token');
const { isMailConfigured } = require('../utils/mailer');
const { runAsPlatform } = require('../utils/tenantContext');
const passwordReset = require('../services/passwordResetService');

// Compared against when the email is unknown, so a missing account takes as long to
// reject as a wrong password and response times do not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

// What the app shows about the user's organisation. Settings are included for every role, as
// they decide dates on screen.
const organisationSummary = (organisation) => ({
  _id: organisation._id,
  name: organisation.name,
  slug: organisation.slug,
  settings: organisation.settings,
  // The public demo: the app shows a banner and hides what the demo does not allow.
  isDemo: Boolean(organisation.demo?.enabled),
});

// There is no POST /api/auth/register: employees cannot sign themselves up. New organisations
// sign up at POST /api/organisations/signup, and HR adds their employees.

// POST /api/auth/login — public.
const login = async (req, res) => {
  const { email, password } = req.body;

  // Platform-level: email addresses are unique across organisations, and the organisation is not
  // known until the user is found.
  const user = await runAsPlatform(() => User.findOne({ email }).select('+password'));
  const passwordMatches = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);

  // Same message for unknown email and wrong password, so attackers cannot find valid accounts.
  if (!user || !passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated. Contact HR.', 401);
  }
  const organisation = await Organisation.findById(user.organisationId);
  if (!organisation) {
    throw new AppError('This account is not part of an organisation. Contact support.', 403);
  }
  if (organisation.status !== 'active') {
    throw new AppError('Your organisation\'s StaffSync account is suspended. Contact StaffSync support.', 403);
  }

  sendSuccess(res, {
    message: 'Login successful',
    data: { token: signToken(user._id), user, organisation: organisationSummary(organisation) },
  });
};

// GET /api/auth/me — any logged-in user. Returns the account and its employee profile.
const getMe = async (req, res) => {
  const employee = req.employeeLookup ?? await Employee.findOne({ userId: req.user._id });
  sendSuccess(res, {
    message: 'Current user',
    data: { user: req.user, employee, organisation: organisationSummary(req.organisation) },
  });
};

// PUT /api/auth/password — any logged-in user. Returns a fresh token for this session; every
// token issued before the change stops working.
const changePassword = async (req, res) => {
  // Everyone shares the demo accounts; one visitor must not lock the next one out.
  if (req.organisation.demo?.enabled) {
    throw new AppError('Changing passwords is turned off in the demo.', 403);
  }
  const user = await User.findById(req.user._id).select('+password');
  // 400 rather than 401: the session is valid, only the field is wrong.
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new AppError('Validation failed', 400, [{ field: 'currentPassword', message: 'Current password is incorrect' }]);
  }
  user.password = req.body.newPassword;
  await user.save();

  sendSuccess(res, { message: 'Password changed', data: { token: signToken(user._id) } });
};

const RESET_REQUESTED = 'If an account exists for that email, a reset link has been sent.';

// POST /api/auth/forgot-password — public. Always the same reply, sent before the lookup and
// email happen, so neither the message nor the response time reveals whether the account exists.
const forgotPassword = async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !isMailConfigured()) {
    throw new AppError('Password reset by email is not available. Contact HR.', 503);
  }
  sendSuccess(res, { message: RESET_REQUESTED });

  passwordReset.requestReset(req.body.email).catch((err) => {
    console.error(`Password reset email failed: ${err.message}`);
  });
};

// POST /api/auth/reset-password — public. Uses the token from the emailed link once.
const resetPassword = async (req, res) => {
  const ok = await passwordReset.resetPassword(req.body.token, req.body.newPassword);
  if (!ok) {
    throw new AppError('This reset link is invalid or has expired. Please request a new one.', 400);
  }
  sendSuccess(res, { message: 'Your password has been reset. Please log in.' });
};

module.exports = { organisationSummary, login, getMe, changePassword, forgotPassword, resetPassword };
