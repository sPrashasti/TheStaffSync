const mongoose = require('mongoose');
const User = require('../models/User');
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

module.exports = { protect };
