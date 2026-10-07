// Shared statistics for dashboards and reports. Counting happens in MongoDB; only the
// working-day calendar walk for absences runs here, because it needs each employee's time zone.
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const User = require('../models/User');
const {
  toDateString,
  employeeTimeZone,
  addDays,
  dateStringToDate,
  dateToDateString,
  parseWorkingDays,
  isWorkingDay,
} = require('../utils/dates');

const round2 = (n) => Math.round(n * 100) / 100;
const groupBy = (items, keyOf) => items.reduce((map, item) => {
  const key = keyOf(item);
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
  return map;
}, new Map());

// Active employees matching `filter`, with name and email, sorted by employee code.
const activeEmployees = async (filter = {}) => {
  const activeUserIds = await User.find({ isActive: true }).distinct('_id');
  return Employee.find({ ...filter, userId: { $in: activeUserIds } })
    .populate('userId', 'name email role')
    .sort({ employeeId: 1 });
};

// For each employee: today's date in their time zone, today's attendance record and any approved
// leave covering today. One query per distinct time zone, not per employee.
const todayStatuses = async (employees, now = new Date()) => {
  const result = new Map();
  const byZone = groupBy(employees, (e) => employeeTimeZone(e));

  await Promise.all([...byZone].map(async ([timeZone, group]) => {
    const date = toDateString(now, timeZone);
    const day = dateStringToDate(date);
    const ids = group.map((e) => e._id);
    const [records, leaves] = await Promise.all([
      Attendance.find({ employeeId: { $in: ids }, date }),
      Leave.find({ employeeId: { $in: ids }, status: 'approved', startDate: { $lte: day }, endDate: { $gte: day } }),
    ]);
    const recordOf = new Map(records.map((r) => [String(r.employeeId), r]));
    const leaveOf = new Map(leaves.map((l) => [String(l.employeeId), l]));
    group.forEach((e) => {
      const record = recordOf.get(String(e._id)) || null;
      const leave = leaveOf.get(String(e._id)) || null;
      let status = 'not-checked-in';
      if (record) status = record.checkOut ? 'checked-out' : 'checked-in';
      else if (leave) status = 'on-leave';
      result.set(String(e._id), { date, timeZone, status, record, leave });
    });
  }));
  return result;
};

// Totals for a set of today statuses.
const countStatuses = (statuses) => {
  const counts = { checkedIn: 0, onLeave: 0, notCheckedIn: 0 };
  statuses.forEach(({ status }) => {
    if (status === 'checked-in' || status === 'checked-out') counts.checkedIn += 1;
    else if (status === 'on-leave') counts.onLeave += 1;
    else counts.notCheckedIn += 1;
  });
  return counts;
};

// Per-employee attendance between two dates (inclusive):
//   present / halfDay / totalHours  from attendance records (aggregated in MongoDB)
//   onLeave   working days with approved leave and no check-in
//   absent    working days with neither, counted only up to yesterday in the employee's time zone
//             and not before their joining date
const attendanceBreakdown = async (employees, from, to, now = new Date()) => {
  const ids = employees.map((e) => e._id);
  const workingDays = parseWorkingDays();

  const [grouped, leaves] = await Promise.all([
    Attendance.aggregate([
      { $match: { employeeId: { $in: ids }, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$employeeId',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
          totalHours: { $sum: '$workingHours' },
          dates: { $addToSet: '$date' },
        },
      },
    ]),
    Leave.find({
      employeeId: { $in: ids },
      status: 'approved',
      startDate: { $lte: dateStringToDate(to) },
      endDate: { $gte: dateStringToDate(from) },
    }).select('employeeId startDate endDate'),
  ]);

  const statsOf = new Map(grouped.map((g) => [String(g._id), g]));
  const leavesOf = groupBy(leaves, (l) => String(l.employeeId));

  return employees.map((e) => {
    const stats = statsOf.get(String(e._id)) || { present: 0, halfDay: 0, totalHours: 0, dates: [] };
    const attended = new Set(stats.dates);
    const leaveRanges = (leavesOf.get(String(e._id)) || []).map((l) => [dateToDateString(l.startDate), dateToDateString(l.endDate)]);
    const onLeaveOn = (d) => leaveRanges.some(([s, end]) => s <= d && d <= end);

    const joined = e.joiningDate ? dateToDateString(e.joiningDate) : from;
    const yesterday = addDays(toDateString(now, employeeTimeZone(e)), -1);
    const start = joined > from ? joined : from;
    const end = yesterday < to ? yesterday : to;

    let absent = 0;
    let onLeave = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (isWorkingDay(d, workingDays) && !attended.has(d)) {
        if (onLeaveOn(d)) onLeave += 1;
        else absent += 1;
      }
    }

    return {
      employee: e,
      present: stats.present,
      halfDay: stats.halfDay,
      absent,
      onLeave,
      totalHours: round2(stats.totalHours),
    };
  });
};

// Adds up breakdown rows (e.g. for a department or the whole company).
const sumBreakdown = (rows) => {
  const total = rows.reduce((acc, r) => ({
    employees: acc.employees + 1,
    present: acc.present + r.present,
    halfDay: acc.halfDay + r.halfDay,
    absent: acc.absent + r.absent,
    onLeave: acc.onLeave + r.onLeave,
    totalHours: acc.totalHours + r.totalHours,
  }), { employees: 0, present: 0, halfDay: 0, absent: 0, onLeave: 0, totalHours: 0 });
  const daysWorked = total.present + total.halfDay;
  return { ...total, totalHours: round2(total.totalHours), avgHoursPerDay: daysWorked ? round2(total.totalHours / daysWorked) : 0 };
};

module.exports = {
  round2,
  activeEmployees,
  todayStatuses,
  countStatuses,
  attendanceBreakdown,
  sumBreakdown,
};
