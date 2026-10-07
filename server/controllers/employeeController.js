const Employee = require('../models/Employee');
const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');

// What other people may see of an account; never the password or internal fields.
const USER_FIELDS = 'name email role isActive';
const withUser = { path: 'userId', select: USER_FIELDS };
const withManager = {
  path: 'managerId',
  select: 'employeeId designation userId',
  populate: { path: 'userId', select: 'name email' },
};

// GET /api/employees — hr. Paginated; optional ?department=&role=&isActive=
const listEmployees = async (req, res) => {
  const { department, role, isActive } = req.query;
  const pagination = getPagination(req.query);

  const filter = {};
  if (department) filter.department = department;

  // role and isActive live on User, so find the matching users first.
  if (role || isActive !== undefined) {
    const userFilter = {};
    if (role) userFilter.role = role;
    if (isActive !== undefined) userFilter.isActive = isActive;
    filter.userId = { $in: await User.find(userFilter).distinct('_id') };
  }

  const [items, total] = await Promise.all([
    Employee.find(filter)
      .populate(withUser)
      .populate(withManager)
      .sort({ employeeId: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Employee.countDocuments(filter),
  ]);

  sendSuccess(res, { message: 'Employees', data: buildPage(items, total, pagination) });
};

// GET /api/employees/team — manager. The team is everyone whose managerId is the caller's
// own Employee record, worked out on the server from the token.
const getMyTeam = async (req, res) => {
  const team = await Employee.find({ managerId: req.employee._id })
    .populate(withUser)
    .sort({ employeeId: 1 });

  sendSuccess(res, { message: 'Team members', data: team });
};

// GET /api/employees/me — any logged-in user.
const getMyProfile = async (req, res) => {
  await req.employee.populate([withUser, withManager]);
  sendSuccess(res, { message: 'Employee profile', data: req.employee });
};

module.exports = { listEmployees, getMyTeam, getMyProfile };
