const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const { toDateString } = require('../utils/dates');

// Fewer hours than this between check-in and check-out counts as a half day.
const FULL_DAY_MIN_HOURS = 4;

const withEmployee = {
  path: 'employeeId',
  select: 'employeeId department designation userId',
  populate: { path: 'userId', select: 'name email' },
};

// ?date= for one day, or ?from=&to= for a range (either end optional).
const dateFilter = ({ date, from, to }) => {
  if (date) return { date };
  if (from || to) return { date: { ...(from && { $gte: from }), ...(to && { $lte: to }) } };
  return {};
};

// Runs a filtered, paginated attendance query, newest day first.
const sendPage = async (res, message, filter, query, populate) => {
  const pagination = getPagination(query);
  let find = Attendance.find(filter).sort({ date: -1, checkIn: -1 }).skip(pagination.skip).limit(pagination.limit);
  if (populate) find = find.populate(populate);
  const [items, total] = await Promise.all([find, Attendance.countDocuments(filter)]);
  sendSuccess(res, { message, data: buildPage(items, total, pagination) });
};

const sameIds = (ids, id) => ids.some((x) => x.equals(id));

// POST /api/attendance/check-in — any role. Time and date come from the server.
const checkIn = async (req, res) => {
  const now = new Date();
  try {
    const record = await Attendance.create({
      employeeId: req.employee._id,
      date: toDateString(now),
      checkIn: now,
    });
    sendCreated(res, { message: 'Checked in', data: record });
  } catch (err) {
    // The unique { employeeId, date } index is the real guard, even against simultaneous requests.
    if (err.code === 11000) throw new AppError('You have already checked in today', 409);
    throw err;
  }
};

// POST /api/attendance/check-out — any role.
const checkOut = async (req, res) => {
  const now = new Date();
  const record = await Attendance.findOne({ employeeId: req.employee._id, date: toDateString(now) });
  if (!record) throw new AppError('You have not checked in today', 404);
  if (record.checkOut) throw new AppError('You have already checked out today', 409);

  const workingHours = Math.round(((now - record.checkIn) / 36e5) * 100) / 100;
  // checkOut: null in the filter makes this a one-time update, even if two requests race.
  const updated = await Attendance.findOneAndUpdate(
    { _id: record._id, checkOut: null },
    { $set: { checkOut: now, workingHours, status: workingHours < FULL_DAY_MIN_HOURS ? 'half-day' : 'present' } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AppError('You have already checked out today', 409);

  sendSuccess(res, { message: 'Checked out', data: updated });
};

// GET /api/attendance/today — any role. Today's date and record (null if not checked in).
const getToday = async (req, res) => {
  const date = toDateString();
  const record = await Attendance.findOne({ employeeId: req.employee._id, date });
  sendSuccess(res, { message: 'Today', data: { date, record } });
};

// GET /api/attendance/my — any role. Own history.
const getMyAttendance = (req, res) =>
  sendPage(res, 'My attendance', { employeeId: req.employee._id, ...dateFilter(req.query) }, req.query);

// GET /api/attendance/team — manager. Direct reports only; ?employeeId= narrows to one of them.
const getTeamAttendance = async (req, res) => {
  const teamIds = await Employee.find({ managerId: req.employee._id }).distinct('_id');
  const { employeeId } = req.query;
  if (employeeId && !sameIds(teamIds, employeeId)) {
    throw new AppError('That employee is not in your team', 403);
  }

  const filter = { employeeId: employeeId || { $in: teamIds }, ...dateFilter(req.query) };
  return sendPage(res, 'Team attendance', filter, req.query, withEmployee);
};

// GET /api/attendance — hr. Everyone; optional ?employeeId=&department=&status=
const getAllAttendance = async (req, res) => {
  const { employeeId, department, status } = req.query;
  const filter = { ...dateFilter(req.query) };
  if (status) filter.status = status;

  if (department) {
    const deptIds = await Employee.find({ department }).distinct('_id');
    const ids = employeeId ? deptIds.filter((id) => id.equals(employeeId)) : deptIds;
    filter.employeeId = { $in: ids };
  } else if (employeeId) {
    filter.employeeId = employeeId;
  }

  return sendPage(res, 'Attendance', filter, req.query, withEmployee);
};

module.exports = {
  checkIn,
  checkOut,
  getToday,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  FULL_DAY_MIN_HOURS,
};
