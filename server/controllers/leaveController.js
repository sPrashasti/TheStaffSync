const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const { toDateString, addDays, dateStringToDate, employeeTimeZone } = require('../utils/dates');

// Longest single request, in calendar days including both ends.
const MAX_LEAVE_DAYS = 60;
// Sick leave may be recorded after the event, up to this many days back. Other types cannot start in the past.
const SICK_LEAVE_BACKDATE_DAYS = 30;

const withEmployee = {
  path: 'employeeId',
  select: 'employeeId department designation managerId userId',
  populate: { path: 'userId', select: 'name email' },
};
const withApprover = { path: 'approvedBy', select: 'name email role' };

const sameIds = (ids, id) => ids.some((x) => x.equals(id));

// ?status=&leaveType=&from=&to= ; from/to keep leave that overlaps that period.
const listFilter = ({ status, leaveType, from, to }) => {
  const filter = {};
  if (status) filter.status = status;
  if (leaveType) filter.leaveType = leaveType;
  if (to) filter.startDate = { $lte: dateStringToDate(to) };
  if (from) filter.endDate = { $gte: dateStringToDate(from) };
  return filter;
};

// Paginated list, newest request first.
const sendPage = async (res, message, filter, query, populate) => {
  const pagination = getPagination(query);
  let find = Leave.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);
  if (populate) find = find.populate(populate);
  const [items, total] = await Promise.all([find, Leave.countDocuments(filter)]);
  sendSuccess(res, { message, data: buildPage(items, total, pagination) });
};

// Loads a leave request with the applicant's Employee record, or 404.
const loadLeave = async (id) => {
  const leave = await Leave.findById(id);
  const applicant = leave && (await Employee.findById(leave.employeeId));
  if (!leave || !applicant) throw new AppError('Leave request not found', 404);
  return { leave, applicant };
};

// HR may decide any request; a manager only their direct reports'. Nobody decides their own.
const assertCanDecide = (req, applicant) => {
  if (applicant.userId.equals(req.user._id)) {
    throw new AppError('You cannot approve or reject your own leave', 403);
  }
  if (req.user.role === 'manager' && !applicant.managerId?.equals(req.employee._id)) {
    throw new AppError('This leave request is not from your team', 403);
  }
};

// Moves a pending request to approved/rejected in one atomic update, so it can never be decided twice.
const decide = async (req, res, status, extra = {}) => {
  const { leave, applicant } = await loadLeave(req.params.id);
  assertCanDecide(req, applicant);

  const updated = await Leave.findOneAndUpdate(
    { _id: leave._id, status: 'pending' },
    { $set: { status, approvedBy: req.user._id, ...extra } },
    { returnDocument: 'after' }
  );
  if (!updated) {
    const current = await Leave.findById(leave._id).select('status');
    throw new AppError(`This leave request has already been ${current.status}`, 409);
  }

  await updated.populate([withEmployee, withApprover]);
  sendSuccess(res, { message: status === 'approved' ? 'Leave approved' : 'Leave rejected', data: updated });
};

// POST /api/leaves — employee, manager.
const applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  // "The past" is judged by the applicant's own calendar.
  const today = toDateString(new Date(), employeeTimeZone(req.employee));

  const earliest = leaveType === 'sick' ? addDays(today, -SICK_LEAVE_BACKDATE_DAYS) : today;
  if (startDate < earliest) {
    const message = leaveType === 'sick'
      ? `Sick leave can start at most ${SICK_LEAVE_BACKDATE_DAYS} days in the past`
      : 'Leave cannot start in the past';
    throw new AppError('Validation failed', 400, [{ field: 'startDate', message }]);
  }
  if (endDate > addDays(startDate, MAX_LEAVE_DAYS - 1)) {
    throw new AppError('Validation failed', 400, [
      { field: 'endDate', message: `A single request can cover at most ${MAX_LEAVE_DAYS} days` },
    ]);
  }

  const start = dateStringToDate(startDate);
  const end = dateStringToDate(endDate);
  let leave;
  await mongoose.connection.transaction(async (session) => {
    // Writing the applicant's Employee record makes simultaneous requests from the same person
    // conflict, so the retried one sees the other's leave in the overlap check below.
    await Employee.updateOne(
      { _id: req.employee._id },
      { $set: { updatedAt: new Date() } },
      { session, timestamps: false }
    );

    const overlap = await Leave.findOne({
      employeeId: req.employee._id,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).session(session);
    if (overlap) {
      throw new AppError(`These dates overlap your ${overlap.status} ${overlap.leaveType} leave`, 409);
    }

    [leave] = await Leave.create(
      [{ employeeId: req.employee._id, leaveType, startDate: start, endDate: end, reason }],
      { session }
    );
  });

  sendCreated(res, { message: 'Leave request submitted', data: leave });
};

// GET /api/leaves/my — any role.
const getMyLeaves = (req, res) =>
  sendPage(res, 'My leave requests', { employeeId: req.employee._id, ...listFilter(req.query) }, req.query, withApprover);

// GET /api/leaves/team — manager. Direct reports only.
const getTeamLeaves = async (req, res) => {
  const teamIds = await Employee.find({ managerId: req.employee._id }).distinct('_id');
  const { employeeId } = req.query;
  if (employeeId && !sameIds(teamIds, employeeId)) {
    throw new AppError('That employee is not in your team', 403);
  }
  const filter = { employeeId: employeeId || { $in: teamIds }, ...listFilter(req.query) };
  return sendPage(res, 'Team leave requests', filter, req.query, [withEmployee, withApprover]);
};

// GET /api/leaves — hr. Optional ?employeeId=&department=
const getAllLeaves = async (req, res) => {
  const { employeeId, department } = req.query;
  const filter = listFilter(req.query);
  if (department) {
    const deptIds = await Employee.find({ department }).distinct('_id');
    filter.employeeId = { $in: employeeId ? deptIds.filter((id) => id.equals(employeeId)) : deptIds };
  } else if (employeeId) {
    filter.employeeId = employeeId;
  }
  return sendPage(res, 'Leave requests', filter, req.query, [withEmployee, withApprover]);
};

// GET /api/leaves/:id — the applicant, their manager, or hr.
const getLeave = async (req, res) => {
  const { leave, applicant } = await loadLeave(req.params.id);
  const isOwner = applicant._id.equals(req.employee._id);
  const isTheirManager = Boolean(applicant.managerId?.equals(req.employee._id));
  if (req.user.role !== 'hr' && !isOwner && !isTheirManager) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  await leave.populate([withEmployee, withApprover]);
  sendSuccess(res, { message: 'Leave request', data: leave });
};

// PUT /api/leaves/:id/approve — the applicant's manager, or hr.
const approveLeave = (req, res) => decide(req, res, 'approved');

// PUT /api/leaves/:id/reject — the applicant's manager, or hr. Requires rejectionReason.
const rejectLeave = (req, res) => decide(req, res, 'rejected', { rejectionReason: req.body.rejectionReason });

module.exports = {
  applyLeave,
  getMyLeaves,
  getTeamLeaves,
  getAllLeaves,
  getLeave,
  approveLeave,
  rejectLeave,
  MAX_LEAVE_DAYS,
  SICK_LEAVE_BACKDATE_DAYS,
};
