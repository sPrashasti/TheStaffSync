const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Training = require('../models/Training');
const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const { toDateString, employeeTimeZone, getTimeZone, dateStringToDate } = require('../utils/dates');
const {
  activeEmployees,
  todayStatuses,
  countStatuses,
  attendanceBreakdown,
} = require('../services/statsService');

const RECENT_LIMIT = 5;
const withApplicant = {
  path: 'employeeId',
  select: 'employeeId department designation userId',
  populate: { path: 'userId', select: 'name email' },
};

// Approved leave days falling inside [from, to].
const approvedDaysBetween = async (employeeId, from, to) => {
  const [result] = await Leave.aggregate([
    {
      $match: {
        employeeId,
        status: 'approved',
        startDate: { $lte: dateStringToDate(to) },
        endDate: { $gte: dateStringToDate(from) },
      },
    },
    {
      $group: {
        _id: null,
        days: {
          $sum: {
            $add: [
              {
                $dateDiff: {
                  startDate: { $max: ['$startDate', dateStringToDate(from)] },
                  endDate: { $min: ['$endDate', dateStringToDate(to)] },
                  unit: 'day',
                },
              },
              1,
            ],
          },
        },
      },
    },
  ]);
  return result ? result.days : 0;
};

// Today, this month and leave for one employee. Used by the employee dashboard and the
// manager's own section.
const personalSummary = async (employee) => {
  const timeZone = employeeTimeZone(employee);
  const today = toDateString(new Date(), timeZone);
  const monthStart = `${today.slice(0, 8)}01`;
  const year = today.slice(0, 4);

  const companyTodayDate = dateStringToDate(toDateString(new Date(), getTimeZone()));
  const [statuses, [month], pending, approvedDaysThisYear, upcoming, trainings] = await Promise.all([
    todayStatuses([employee]),
    attendanceBreakdown([employee], monthStart, today),
    Leave.countDocuments({ employeeId: employee._id, status: 'pending' }),
    approvedDaysBetween(employee._id, `${year}-01-01`, `${year}-12-31`),
    Leave.find({ employeeId: employee._id, status: 'approved', startDate: { $gte: dateStringToDate(today) } })
      .sort({ startDate: 1 })
      .limit(RECENT_LIMIT),
    // Trainings this person is enrolled in that have not finished yet.
    Training.find({ participants: employee._id, endDate: { $gte: companyTodayDate } })
      .sort({ startDate: 1 })
      .limit(RECENT_LIMIT)
      .select('title trainer startDate endDate'),
  ]);
  const todayStatus = statuses.get(String(employee._id));

  return {
    date: today,
    timeZone,
    today: { status: todayStatus.status, record: todayStatus.record, leave: todayStatus.leave },
    thisMonth: {
      from: monthStart,
      to: today,
      present: month.present,
      halfDay: month.halfDay,
      absent: month.absent,
      onLeave: month.onLeave,
      totalHours: month.totalHours,
    },
    leave: { pending, approvedDaysThisYear, upcoming },
    trainings: { enrolled: trainings },
  };
};

// GET /api/dashboard/employee — employee.
const getEmployeeDashboard = async (req, res) => {
  sendSuccess(res, { message: 'Employee dashboard', data: await personalSummary(req.employee) });
};

// GET /api/dashboard/manager — manager. Own summary plus the team's day and pending leave.
const getManagerDashboard = async (req, res) => {
  const team = await activeEmployees({ managerId: req.employee._id });
  const teamIds = team.map((e) => e._id);

  const [me, statuses, pendingCount, pendingLatest] = await Promise.all([
    personalSummary(req.employee),
    todayStatuses(team),
    Leave.countDocuments({ employeeId: { $in: teamIds }, status: 'pending' }),
    Leave.find({ employeeId: { $in: teamIds }, status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(RECENT_LIMIT)
      .populate(withApplicant),
  ]);

  const members = team.map((e) => {
    const s = statuses.get(String(e._id));
    return {
      employee: { _id: e._id, employeeId: e.employeeId, name: e.userId.name, designation: e.designation },
      date: s.date,
      status: s.status,
      checkIn: s.record ? s.record.checkIn : null,
      checkOut: s.record ? s.record.checkOut : null,
    };
  });

  sendSuccess(res, {
    message: 'Manager dashboard',
    data: {
      me,
      team: { size: team.length, today: countStatuses(statuses), members },
      // Oldest first: the requests that have waited longest.
      pendingLeave: { count: pendingCount, oldest: pendingLatest },
    },
  });
};

// GET /api/dashboard/hr — hr. Company-wide picture.
const getHrDashboard = async (req, res) => {
  const today = toDateString(new Date(), getTimeZone());
  const monthStart = dateStringToDate(`${today.slice(0, 8)}01`);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));

  const employees = await activeEmployees();
  const activeIds = employees.map((e) => e._id);

  const todayDate = dateStringToDate(today);
  const [roleCounts, statuses, pending, approvedThisMonth, recentJoiners, joinedThisMonth, upcomingTrainings, ongoingTrainings] = await Promise.all([
    User.aggregate([{ $group: { _id: { role: '$role', isActive: '$isActive' }, count: { $sum: 1 } } }]),
    todayStatuses(employees),
    Leave.countDocuments({ status: 'pending' }),
    Leave.countDocuments({ status: 'approved', startDate: { $lte: monthEnd }, endDate: { $gte: monthStart } }),
    Employee.find({ _id: { $in: activeIds } })
      .sort({ joiningDate: -1 })
      .limit(RECENT_LIMIT)
      .select('employeeId department designation joiningDate userId')
      .populate('userId', 'name email'),
    Employee.countDocuments({ _id: { $in: activeIds }, joiningDate: { $gte: monthStart } }),
    Training.countDocuments({ startDate: { $gt: todayDate } }),
    Training.countDocuments({ startDate: { $lte: todayDate }, endDate: { $gte: todayDate } }),
  ]);

  const byRole = { employee: 0, manager: 0, hr: 0 };
  let inactive = 0;
  roleCounts.forEach(({ _id, count }) => {
    if (_id.isActive) byRole[_id.role] += count;
    else inactive += count;
  });

  sendSuccess(res, {
    message: 'HR dashboard',
    data: {
      date: today,
      headcount: {
        active: byRole.employee + byRole.manager + byRole.hr,
        inactive,
        byRole,
        departments: new Set(employees.map((e) => e.department)).size,
        joinedThisMonth,
      },
      today: countStatuses(statuses),
      leave: { pending, approvedThisMonth },
      training: { upcoming: upcomingTrainings, ongoing: ongoingTrainings },
      recentJoiners,
    },
  });
};

module.exports = { getEmployeeDashboard, getManagerDashboard, getHrDashboard };
