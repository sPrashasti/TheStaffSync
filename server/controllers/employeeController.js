const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');

// What other people may see of an account; never the password or internal fields.
const USER_FIELDS = 'name email role isActive';
const withUser = { path: 'userId', select: USER_FIELDS };
const withManager = {
  path: 'managerId',
  select: 'employeeId designation userId',
  populate: { path: 'userId', select: 'name email' },
};

const USER_UPDATE_FIELDS = ['name', 'email', 'role', 'isActive'];
const EMPLOYEE_UPDATE_FIELDS = ['department', 'designation', 'joiningDate', 'dateOfBirth', 'managerId', 'timeZone', 'phone', 'address'];
// The only fields people other than HR may change, and only on their own record.
const SELF_EDITABLE_FIELDS = ['phone', 'address'];

// Reporting chains deeper than this are treated as a loop rather than walked forever.
const MAX_REPORTING_DEPTH = 50;

const findPopulated = (id) => Employee.findById(id).populate(withUser).populate(withManager);

const managerError = (message) => new AppError('Invalid manager', 400, [{ field: 'managerId', message }]);

// managerId must point at an active manager, not the employee themselves, and must not
// create a reporting loop (A reports to B who reports to A).
const assertValidManager = async (managerId, employeeId) => {
  if (employeeId && employeeId.equals(managerId)) {
    throw managerError('An employee cannot be their own manager');
  }
  const manager = await Employee.findById(managerId).populate('userId', 'role isActive');
  if (!manager || !manager.userId) throw managerError('Manager not found');
  if (manager.userId.role !== 'manager') throw managerError('The selected person is not a manager');
  if (!manager.userId.isActive) throw managerError('The selected manager is deactivated');

  if (employeeId) {
    let current = manager.managerId;
    for (let depth = 0; current && depth < MAX_REPORTING_DEPTH; depth += 1) {
      if (current.equals(employeeId)) throw managerError('This would create a reporting loop');
      const next = await Employee.findById(current).select('managerId');
      current = next && next.managerId;
    }
    if (current) throw managerError('Reporting chain is too deep');
  }
};

// Guards that apply whether HR changes a role, deactivates through PUT, or uses DELETE.
const assertSafeStatusChange = async ({ user, employee, isSelf, roleChange, deactivating }) => {
  if (!roleChange && !deactivating) return;

  if (isSelf) {
    throw new AppError('You cannot change your own role or deactivate your own account', 400);
  }

  if (user.role === 'hr' && user.isActive) {
    const otherActiveHr = await User.countDocuments({ role: 'hr', isActive: true, _id: { $ne: user._id } });
    if (otherActiveHr === 0) {
      throw new AppError('There must be at least one active HR account', 409);
    }
  }

  if (user.role === 'manager') {
    const reports = await Employee.find({ managerId: employee._id }).select('userId');
    // A role change orphans every report; deactivation only matters for active ones.
    const count = roleChange
      ? reports.length
      : await User.countDocuments({ _id: { $in: reports.map((r) => r.userId) }, isActive: true });
    if (count > 0) {
      throw new AppError(`Reassign this manager's ${count} team member(s) to another manager first`, 409);
    }
  }
};

// Loads the Employee for :id and its User, or 404.
const loadTarget = async (id) => {
  const employee = await Employee.findById(id);
  const user = employee && (await User.findById(employee.userId));
  if (!employee || !user) throw new AppError('Employee not found', 404);
  return { employee, user };
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

// GET /api/employees/:id — hr, the employee themselves, or their manager.
const getEmployee = async (req, res) => {
  const employee = await findPopulated(req.params.id);
  if (!employee || !employee.userId) throw new AppError('Employee not found', 404);

  const me = req.user._id;
  const isHr = req.user.role === 'hr';
  const isSelf = employee.userId._id.equals(me);
  const isTheirManager = Boolean(employee.managerId?.userId?._id?.equals(me));
  if (!isHr && !isSelf && !isTheirManager) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  sendSuccess(res, { message: 'Employee', data: employee });
};

// POST /api/employees — hr. Creates the login account and employee profile together, with any role.
const createEmployee = async (req, res) => {
  const { name, email, password, role = 'employee', managerId, ...profile } = req.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists', 409);
  }
  if (managerId) await assertValidManager(managerId, null);

  let employee;
  await mongoose.connection.transaction(async (session) => {
    const [user] = await User.create([{ name, email, password, role }], { session });
    [employee] = await Employee.create([{ ...profile, managerId: managerId || null, userId: user._id }], { session });
  });

  sendCreated(res, { message: 'Employee created', data: await findPopulated(employee._id) });
};

// PUT /api/employees/:id — hr may change anything; anyone else only their own phone and address.
const updateEmployee = async (req, res) => {
  const { employee, user } = await loadTarget(req.params.id);
  const changes = req.body;
  const isSelf = user._id.equals(req.user._id);

  if (req.user.role !== 'hr') {
    if (!isSelf) throw new AppError('You do not have permission to perform this action', 403);
    const notAllowed = Object.keys(changes).filter((field) => !SELF_EDITABLE_FIELDS.includes(field));
    if (notAllowed.length > 0) {
      throw new AppError(
        'You can only update your own phone and address',
        403,
        notAllowed.map((field) => ({ field, message: 'Only HR can change this field' }))
      );
    }
  } else {
    await assertSafeStatusChange({
      user,
      employee,
      isSelf,
      roleChange: changes.role !== undefined && changes.role !== user.role,
      deactivating: changes.isActive === false && user.isActive,
    });
    if (changes.managerId) await assertValidManager(changes.managerId, employee._id);
    if (changes.email && changes.email !== user.email && (await User.exists({ email: changes.email }))) {
      throw new AppError('An account with this email already exists', 409);
    }
  }

  USER_UPDATE_FIELDS.forEach((field) => { if (field in changes) user.set(field, changes[field]); });
  EMPLOYEE_UPDATE_FIELDS.forEach((field) => { if (field in changes) employee.set(field, changes[field]); });

  await mongoose.connection.transaction(async (session) => {
    await user.save({ session });
    await employee.save({ session });
  });

  sendSuccess(res, { message: 'Employee updated', data: await findPopulated(employee._id) });
};

// DELETE /api/employees/:id — hr. Soft delete: the account is deactivated so attendance,
// leave and other history that refers to it stays intact. Reactivate with PUT { isActive: true }.
const deactivateEmployee = async (req, res) => {
  const { employee, user } = await loadTarget(req.params.id);

  if (user.isActive) {
    await assertSafeStatusChange({
      user,
      employee,
      isSelf: user._id.equals(req.user._id),
      roleChange: false,
      deactivating: true,
    });
    user.isActive = false;
    await user.save();
  }

  sendSuccess(res, { message: 'Employee deactivated', data: await findPopulated(employee._id) });
};

module.exports = {
  listEmployees,
  getMyTeam,
  getMyProfile,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
};
