// The public demo: lets anyone try StaffSync as HR, a manager or an employee without a password.
// Only works for the one organisation set up with `npm run demo:setup`.
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { signToken } = require('../utils/token');
const { runAsPlatform } = require('../utils/tenantContext');
const { DEMO_ROLES, findDemoOrganisation } = require('../services/demoService');
const { organisationSummary } = require('./authController');

// GET /api/demo — public. Whether the login page should offer "Try the demo".
const getDemo = async (req, res) => {
  const organisation = await findDemoOrganisation();
  sendSuccess(res, {
    message: 'Demo',
    data: organisation
      ? { available: true, organisationName: organisation.name, roles: DEMO_ROLES }
      : { available: false },
  });
};

// POST /api/demo/login — public. { role }. Signs in as the demo organisation's account for that
// role. The accounts are fixed by the platform; the request can only choose the role.
const demoLogin = async (req, res) => {
  const organisation = await findDemoOrganisation();
  if (!organisation) throw new AppError('The demo is not available.', 404);
  if (organisation.status !== 'active') throw new AppError('The demo is not available right now.', 503);

  const user = await runAsPlatform(() => User.findOne({
    _id: organisation.demo.accounts[req.body.role],
    organisationId: organisation._id,
    isActive: true,
  }));
  if (!user) throw new AppError('The demo is not available right now.', 503);

  sendSuccess(res, {
    message: 'Signed in to the demo',
    data: { token: signToken(user._id), user, organisation: organisationSummary(organisation) },
  });
};

module.exports = { getDemo, demoLogin };
