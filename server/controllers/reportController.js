const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { LEAVE_TYPES, LEAVE_STATUSES } = require('../models/Leave');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildPage } = require('../utils/pagination');
const { toDateString, getTimeZone, dateStringToDate, getWorkingDayNames } = require('../utils/dates');
const { activeEmployees, attendanceBreakdown, sumBreakdown } = require('../services/statsService');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/reports/department-stats — hr. Headcount per department, from one aggregation.
const getDepartmentStats = async (req, res) => {
  const isActiveRole = (role) => ({ $cond: [{ $and: ['$user.isActive', { $eq: ['$user.role', role] }] }, 1, 0] });
  const departments = await Employee.aggregate([
    { $lookup: { from: User.collection.collectionName, localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$user.isActive', 1, 0] } },
        employees: { $sum: isActiveRole('employee') },
        managers: { $sum: isActiveRole('manager') },
        hr: { $sum: isActiveRole('hr') },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        department: '$_id',
        total: 1,
        active: 1,
        inactive: { $subtract: ['$total', '$active'] },
        employees: 1,
        managers: 1,
        hr: 1,
      },
    },
  ]);

  const totals = departments.reduce((acc, d) => ({
    total: acc.total + d.total,
    active: acc.active + d.active,
    inactive: acc.inactive + d.inactive,
  }), { total: 0, active: 0, inactive: 0 });

  sendSuccess(res, { message: 'Department statistics', data: { totals, departments } });
};

// GET /api/reports/attendance-summary — hr. ?from=&to= (default: this month so far), ?department=,
// paginated byEmployee. Active employees only.
const getAttendanceSummary = async (req, res) => {
  const today = toDateString(new Date(), getTimeZone());
  const from = req.query.from || `${today.slice(0, 8)}01`;
  const to = req.query.to || today;
  const { department } = req.query;

  const employees = await activeEmployees(department ? { department } : {});
  const rows = await attendanceBreakdown(employees, from, to);

  const byDepartment = [...rows.reduce((map, r) => {
    const key = r.employee.department;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
    return map;
  }, new Map())]
    .map(([name, deptRows]) => ({ department: name, ...sumBreakdown(deptRows) }))
    .sort((a, b) => a.department.localeCompare(b.department));

  const sorted = rows
    .map((r) => ({
      employee: {
        _id: r.employee._id,
        employeeId: r.employee.employeeId,
        name: r.employee.userId.name,
        department: r.employee.department,
      },
      present: r.present,
      halfDay: r.halfDay,
      absent: r.absent,
      onLeave: r.onLeave,
      totalHours: r.totalHours,
    }))
    .sort((a, b) => a.employee.department.localeCompare(b.employee.department) || a.employee.name.localeCompare(b.employee.name));
  const pagination = getPagination(req.query);

  sendSuccess(res, {
    message: 'Attendance summary',
    data: {
      from,
      to,
      workingDays: getWorkingDayNames(),
      totals: sumBreakdown(rows),
      byDepartment,
      byEmployee: buildPage(sorted.slice(pagination.skip, pagination.skip + pagination.limit), sorted.length, pagination),
    },
  });
};

// GET /api/reports/leave-summary — hr. ?year= (default this year), ?department=.
// Days are clipped to the year, so leave spanning New Year counts only its days in that year.
const getLeaveSummary = async (req, res) => {
  const year = Number(req.query.year) || Number(toDateString(new Date(), getTimeZone()).slice(0, 4));
  const yearStart = dateStringToDate(`${year}-01-01`);
  const yearEnd = dateStringToDate(`${year}-12-31`);
  const { department } = req.query;

  const isApproved = { $eq: ['$status', 'approved'] };
  const [facets] = await Leave.aggregate([
    { $match: { startDate: { $lte: yearEnd }, endDate: { $gte: yearStart } } },
    { $lookup: { from: Employee.collection.collectionName, localField: 'employeeId', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
    ...(department ? [{ $match: { 'employee.department': department } }] : []),
    {
      $addFields: {
        clippedStart: { $max: ['$startDate', yearStart] },
        daysInYear: {
          $add: [{ $dateDiff: { startDate: { $max: ['$startDate', yearStart] }, endDate: { $min: ['$endDate', yearEnd] }, unit: 'day' } }, 1],
        },
      },
    },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', requests: { $sum: 1 }, days: { $sum: '$daysInYear' } } }],
        byType: [{
          $group: {
            _id: '$leaveType',
            requests: { $sum: 1 },
            approvedDays: { $sum: { $cond: [isApproved, '$daysInYear', 0] } },
          },
        }],
        byDepartment: [
          {
            $group: {
              _id: '$employee.department',
              requests: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              approvedDays: { $sum: { $cond: [isApproved, '$daysInYear', 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
        // Approved days by the month the leave starts in (clipped to the year).
        byMonth: [
          { $match: { status: 'approved' } },
          { $group: { _id: { $month: '$clippedStart' }, approvedDays: { $sum: '$daysInYear' }, requests: { $sum: 1 } } },
        ],
      },
    },
  ]);

  // Fill in zeros so every status, type and month is always present.
  const pick = (rows) => new Map(rows.map((r) => [r._id, r]));
  const statusRows = pick(facets.byStatus);
  const typeRows = pick(facets.byType);
  const monthRows = pick(facets.byMonth);

  const byStatus = Object.fromEntries(LEAVE_STATUSES.map((s) => [s, {
    requests: statusRows.get(s)?.requests || 0,
    days: statusRows.get(s)?.days || 0,
  }]));

  sendSuccess(res, {
    message: 'Leave summary',
    data: {
      year,
      totals: {
        requests: LEAVE_STATUSES.reduce((n, s) => n + byStatus[s].requests, 0),
        approvedDays: byStatus.approved.days,
      },
      byStatus,
      byType: LEAVE_TYPES.map((t) => ({
        leaveType: t,
        requests: typeRows.get(t)?.requests || 0,
        approvedDays: typeRows.get(t)?.approvedDays || 0,
      })),
      byDepartment: facets.byDepartment.map(({ _id, ...rest }) => ({ department: _id, ...rest })),
      byMonth: MONTHS.map((month, i) => ({
        month,
        requests: monthRows.get(i + 1)?.requests || 0,
        approvedDays: monthRows.get(i + 1)?.approvedDays || 0,
      })),
    },
  });
};

module.exports = { getDepartmentStats, getAttendanceSummary, getLeaveSummary };
