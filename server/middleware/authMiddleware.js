const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Organisation = require('../models/Organisation');
const PlatformAdmin = require('../models/PlatformAdmin');
const AppError = require('../utils/AppError');
const { SCOPES, verifyToken } = require('../utils/token');
const { runAsPlatform, runInOrganisation } = require('../utils/tenantContext');

// Reads and checks the bearer token. Returns its payload, or throws 401.
// A token of the wrong kind is rejected as invalid, exactly like a forged one, so an
// organisation user's token never works on the platform API and vice versa.
const readToken = (req, scope) => {
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
  if (payload.scope !== scope || !mongoose.isValidObjectId(payload.id)) {
    throw new AppError('Invalid token. Please log in again.', 401);
  }
  return payload;
};

// Requires a valid organisation user's token, an active user and an active organisation.
// On success req.user holds the current User document (without the password), req.organisation
// their Organisation, and the rest of the request runs inside that organisation: every
// organisation-owned query is limited to it (see models/plugins/tenantScoped).
const protect = async (req, res, next) => {
  const payload = readToken(req, SCOPES.org);

  // The user, their employee record and organisation in one round trip (this runs on every
  // request). Platform-level because the organisation is not known until the user is loaded.
  // Secrets are left out here, so they never reach a request handler.
  const [found] = await runAsPlatform(() => User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(payload.id) } },
    {
      $lookup: {
        from: Employee.collection.collectionName,
        let: { userId: '$_id', organisationId: '$organisationId' },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }, { $eq: ['$organisationId', '$$organisationId'] }] } } }],
        as: 'employee',
      },
    },
    { $lookup: { from: Organisation.collection.collectionName, localField: 'organisationId', foreignField: '_id', as: 'organisation' } },
    { $project: { password: 0, passwordResetTokenHash: 0, passwordResetExpires: 0 } },
  ]));
  const user = found && User.hydrate({ ...found, employee: undefined, organisation: undefined });
  if (!user) {
    throw new AppError('The account for this token no longer exists.', 401);
  }
  if (!user.isActive) {
    throw new AppError('This account has been deactivated.', 401);
  }
  if (user.changedPasswordAfter(payload.iat)) {
    throw new AppError('Your password was changed. Please log in again.', 401);
  }
  const organisation = found.organisation[0] && Organisation.hydrate(found.organisation[0]);
  if (!organisation) {
    // A user without an organisation is a data error; never let it see anything.
    throw new AppError('This account is not part of an organisation. Contact support.', 403);
  }
  if (organisation.status !== 'active') {
    throw new AppError('Your organisation\'s StaffSync account is suspended. Contact StaffSync support.', 403);
  }

  req.user = user;
  req.organisation = organisation;
  // Kept for loadEmployee, so routes that need the profile do not query again.
  req.employeeLookup = found.employee[0] ? Employee.hydrate(found.employee[0]) : null;
  // The organisation comes from the database record, never from the token or the request.
  return runInOrganisation(organisation, next);
};

// Requires a valid platform admin token. Platform admins are a separate kind of account
// (models/PlatformAdmin), not an organisation role: they never pass protect(), and organisation
// users, HR included, never pass this. The request runs at platform level (all organisations).
const protectPlatform = async (req, res, next) => {
  const payload = readToken(req, SCOPES.platform);

  const admin = await PlatformAdmin.findById(payload.id).select('+passwordChangedAt');
  if (!admin) {
    throw new AppError('The account for this token no longer exists.', 401);
  }
  if (!admin.isActive) {
    throw new AppError('This account has been deactivated.', 401);
  }
  if (admin.changedPasswordAfter(payload.iat)) {
    throw new AppError('Your password was changed. Please log in again.', 401);
  }

  req.platformAdmin = admin;
  return runAsPlatform(next);
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
  const employee = req.employeeLookup !== undefined
    ? req.employeeLookup
    : await Employee.findOne({ userId: req.user._id });
  if (!employee) {
    throw new AppError('No employee profile exists for this account. Contact HR.', 404);
  }
  req.employee = employee;
  next();
};

module.exports = { protect, protectPlatform, authorize, loadEmployee };
