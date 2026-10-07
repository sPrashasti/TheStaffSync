const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { signToken } = require('../utils/token');
const { isMailConfigured } = require('../utils/mailer');
const passwordReset = require('../services/passwordResetService');

// Department and designation until HR fills them in.
const UNASSIGNED = 'Unassigned';

// Compared against when the email is unknown, so a missing account takes as long to
// reject as a wrong password and response times do not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

// POST /api/auth/register — public. Always creates an employee; any `role` in the body is ignored.
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists', 409);
  }

  // User and Employee are saved together or not at all.
  let user;
  let employee;
  await mongoose.connection.transaction(async (session) => {
    [user] = await User.create([{ name, email, password, role: 'employee' }], { session });
    [employee] = await Employee.create(
      [{ userId: user._id, department: UNASSIGNED, designation: UNASSIGNED }],
      { session }
    );
  });

  sendCreated(res, {
    message: 'Registration successful',
    data: { token: signToken(user._id), user, employee },
  });
};

// POST /api/auth/login — public.
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
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

  sendSuccess(res, {
    message: 'Login successful',
    data: { token: signToken(user._id), user },
  });
};

// GET /api/auth/me — any logged-in user. Returns the account and its employee profile.
const getMe = async (req, res) => {
  const employee = req.employeeLookup ?? await Employee.findOne({ userId: req.user._id });
  sendSuccess(res, {
    message: 'Current user',
    data: { user: req.user, employee },
  });
};

// PUT /api/auth/password — any logged-in user. Returns a fresh token for this session; every
// token issued before the change stops working.
const changePassword = async (req, res) => {
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

module.exports = { register, login, getMe, changePassword, forgotPassword, resetPassword };
