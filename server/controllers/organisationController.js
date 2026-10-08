const mongoose = require('mongoose');
const Organisation = require('../models/Organisation');
const User = require('../models/User');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { signToken } = require('../utils/token');
const { runInOrganisation } = require('../utils/tenantContext');
const { getPlatformTimeZone, getPlatformWorkingDays } = require('../utils/dates');
const { organisationSummary } = require('./authController');

// Department and designation until HR fills them in.
const UNASSIGNED = 'Unassigned';

// POST /api/organisations/signup — public. A company starts using StaffSync: creates the
// organisation and its first HR user, who then adds everyone else. The person signing up is
// always HR of the NEW organisation; this can never add anyone to an existing one.
const signup = async (req, res) => {
  const { companyName, name, email, password } = req.body;

  if (await User.emailInUse(email)) {
    throw new AppError('An account with this email already exists', 409, [{ field: 'email', message: 'An account with this email already exists' }]);
  }

  const slug = await Organisation.uniqueSlug(companyName);
  const organisation = new Organisation({
    name: companyName,
    slug,
    settings: { timeZone: getPlatformTimeZone(), workingDays: getPlatformWorkingDays().split(',') },
  });

  // Organisation, user and employee are saved together or not at all.
  let user;
  let employee;
  await mongoose.connection.transaction(async (session) => {
    await organisation.save({ session });
    await runInOrganisation(organisation, async () => {
      [user] = await User.create([{ name, email, password, role: 'hr' }], { session });
      [employee] = await Employee.create(
        [{ userId: user._id, department: 'Human Resources', designation: UNASSIGNED }],
        { session }
      );
    });
  });

  sendCreated(res, {
    message: 'Organisation created',
    data: { token: signToken(user._id), user, employee, organisation: organisationSummary(organisation) },
  });
};

// GET /api/organisations/me — any logged-in user. Their own organisation only.
const getMyOrganisation = (req, res) => {
  sendSuccess(res, { message: 'Organisation', data: organisationSummary(req.organisation) });
};

// PUT /api/organisations/me — hr. Name, time zone and working days of their own organisation.
const updateMyOrganisation = async (req, res) => {
  if (req.organisation.demo?.enabled) {
    throw new AppError('Company settings cannot be changed in the demo.', 403);
  }
  const organisation = await Organisation.findById(req.organisation._id);
  const { name, settings = {} } = req.body;
  if (name !== undefined) organisation.name = name;
  if (settings.timeZone !== undefined) organisation.settings.timeZone = settings.timeZone;
  if (settings.workingDays !== undefined) organisation.settings.workingDays = settings.workingDays;
  await organisation.save();

  sendSuccess(res, { message: 'Organisation updated', data: organisationSummary(organisation) });
};

module.exports = { signup, getMyOrganisation, updateMyOrganisation };
