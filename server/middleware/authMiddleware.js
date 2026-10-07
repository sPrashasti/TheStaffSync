const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/token');

// Requires a valid "Authorization: Bearer <token>" header and an active user.
// On success req.user holds the current User document (without the password).
const protect = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Not authenticated. Please log in.', 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    throw new AppError(message, 401);
  }
  if (!mongoose.isValidObjectId(payload.id)) {
    throw new AppError('Invalid token. Please log in again.', 401);
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new AppError('The account for this token no longer exists.', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated.', 401);
  }

  req.user = user;
  next();
};

// Allows the request only if the logged-in user has one of the given roles. Use after protect:
//   router.get('/', protect, authorize('hr'), listEmployees);
// The role comes from the database (via protect), never from the token or request.
const authorize = (...roles) => {
  // Catch typos such as authorize('HR') when the route file loads, not at request time.
  const unknown = roles.filter((role) => !User.ROLES.includes(role));
  if (roles.length === 0 || unknown.length > 0) {
    throw new Error(`authorize() needs valid roles; got: ${roles.join(', ') || '(none)'}`);
  }

  return (req, res, next) => {
    if (!req.user) {
      // A route forgot protect; fail loudly rather than let the request through.
      throw new Error('authorize() used without protect()');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
};

// Attaches the logged-in user's Employee profile as req.employee. Team and "own record"
// scoping is always worked out from this, never from ids sent by the client.
const loadEmployee = async (req, res, next) => {
  const employee = await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    throw new AppError('No employee profile exists for this account. Contact HR.', 404);
  }
  req.employee = employee;
  next();
};

module.exports = { protect, authorize, loadEmployee };
