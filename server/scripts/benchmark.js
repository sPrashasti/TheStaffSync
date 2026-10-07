// Measures API speed with a realistic amount of data. Uses its own database
// (staffsync_test_perf on the MONGO_URI cluster, or TEST_MONGO_URI) and empties it afterwards.
//
//   npm run bench               seed, measure, clean up
//   npm run bench -- --keep     leave the data in place for a second run
//   npm run bench -- --reuse    measure existing data without re-seeding
//
// For each endpoint it reports the median and 95th-percentile time over several calls, and for
// the main queries whether MongoDB used an index or scanned the whole collection.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const SIZES = { employees: 500, managers: 40, days: 60, leaves: 1500, notifications: 5000, trainings: 60 };
const RUNS = 12;
const DEPARTMENTS = ['Engineering', 'Finance', 'Sales', 'Marketing', 'Operations', 'Support', 'Legal', 'Design'];

const source = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
const url = new URL(source);
url.pathname = '/staffsync_test_perf';
process.env.MONGO_URI = url.toString();
process.env.NODE_ENV = 'test';
for (const [key, value] of [['RATE_LIMIT_MAX_REQUESTS', '1000000'], ['LOGIN_MAX_FAILURES', '1000']]) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const models = require('../models');
const { signToken } = require('../utils/token');
const { toDateString, addDays, getTimeZone } = require('../utils/dates');

const { User, Employee, Attendance, Leave, Notification, Training, Announcement } = models;
const args = process.argv.slice(2);
const pick = (list, i) => list[i % list.length];

const wipe = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  await Promise.all(collections.map((c) => mongoose.connection.db.dropCollection(c.name)));
};

const seed = async () => {
  const started = Date.now();
  await wipe();
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));

  // One hash for everyone: hashing 500 passwords at cost 12 would take minutes.
  const password = await bcrypt.hash('Passw0rd123', 12);
  const total = SIZES.employees;
  const users = await User.insertMany(Array.from({ length: total }, (_, i) => ({
    name: `Person ${i}`,
    email: `p${i}@perf.test`,
    password,
    role: i === 0 ? 'hr' : i <= SIZES.managers ? 'manager' : 'employee',
    isActive: i % 50 !== 49,
  })));
  const managers = users.slice(1, SIZES.managers + 1);
  const employeesDocs = users.map((u, i) => ({
    userId: u._id,
    employeeId: `EMP${String(i + 1).padStart(4, '0')}`,
    department: pick(DEPARTMENTS, i),
    designation: 'Staff',
    joiningDate: new Date('2025-01-01T00:00:00Z'),
  }));
  const employees = await Employee.insertMany(employeesDocs);
  // Everyone except HR and managers reports to a manager.
  const managerEmployees = employees.slice(1, SIZES.managers + 1);
  await Employee.bulkWrite(employees.slice(SIZES.managers + 1).map((e, i) => ({
    updateOne: { filter: { _id: e._id }, update: { managerId: pick(managerEmployees, i)._id } },
  })));

  const today = toDateString(new Date(), getTimeZone());
  const attendance = [];
  for (let day = 1; day <= SIZES.days; day += 1) {
    const date = addDays(today, -day);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    employees.forEach((e, i) => {
      if ((i + day) % 9 === 0) return; // some absences
      const hours = (i + day) % 7 === 0 ? 3 : 8.5;
      attendance.push({
        employeeId: e._id,
        date,
        timeZone: getTimeZone(),
        checkIn: new Date(`${date}T03:30:00Z`),
        checkOut: new Date(new Date(`${date}T03:30:00Z`).getTime() + hours * 36e5),
        workingHours: hours,
        status: hours < 4 ? 'half-day' : 'present',
      });
    });
  }
  for (let i = 0; i < attendance.length; i += 5000) await Attendance.insertMany(attendance.slice(i, i + 5000));

  const statuses = ['pending', 'approved', 'approved', 'rejected'];
  await Leave.insertMany(Array.from({ length: SIZES.leaves }, (_, i) => {
    const start = addDays(today, (i % 120) - 60);
    return {
      employeeId: pick(employees, i * 7)._id,
      leaveType: pick(['casual', 'sick', 'earned', 'unpaid'], i),
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${addDays(start, i % 3)}T00:00:00Z`),
      reason: 'Benchmark',
      status: pick(statuses, i),
      approvedBy: i % 4 === 0 ? null : managers[0]._id,
    };
  }));
  await Notification.insertMany(Array.from({ length: SIZES.notifications }, (_, i) => ({
    recipient: pick(users, i)._id,
    type: 'leave',
    title: 'Benchmark',
    message: 'Benchmark notification',
    isRead: i % 3 === 0,
  })));
  await Training.insertMany(Array.from({ length: SIZES.trainings }, (_, i) => ({
    title: `Course ${i}`,
    trainer: 'Trainer',
    startDate: new Date(`${addDays(today, i - 20)}T00:00:00Z`),
    endDate: new Date(`${addDays(today, i - 19)}T00:00:00Z`),
    capacity: 30,
    createdBy: users[0]._id,
    participants: employees.slice(i, i + 20).map((e) => e._id),
  })));
  await Announcement.insertMany(Array.from({ length: 50 }, (_, i) => ({
    title: `News ${i}`, content: 'x', createdBy: users[0]._id, targetAudience: pick(['all', 'employees', 'managers'], i),
  })));

  console.log(`Seeded ${users.length} people, ${attendance.length} attendance records, ${SIZES.leaves} leave requests, ${SIZES.notifications} notifications in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
};

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const measure = async (base, label, urlPath, token) => {
  const times = [];
  let bytes = 0;
  let status = 0;
  for (let i = 0; i < RUNS; i += 1) {
    const t0 = performance.now();
    const res = await fetch(base + urlPath, { headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip' } });
    const body = await res.arrayBuffer();
    times.push(performance.now() - t0);
    bytes = Number(res.headers.get('content-length')) || body.byteLength;
    status = res.status;
  }
  times.shift(); // first call warms caches
  return { label, status, median: percentile(times, 50), p95: percentile(times, 95), kb: bytes / 1024 };
};

// How MongoDB answers a query: the winning plan's stages, and documents read versus returned.
const explain = async (label, query) => {
  const plan = await query.explain('executionStats');
  const stats = plan.executionStats || plan[0]?.executionStats;
  const stages = [];
  const walk = (node) => {
    if (!node) return;
    stages.push(node.stage);
    walk(node.inputStage);
    (node.inputStages || []).forEach(walk);
  };
  walk((plan.queryPlanner || plan[0]?.queryPlanner)?.winningPlan?.queryPlan || (plan.queryPlanner || plan[0]?.queryPlanner)?.winningPlan);
  return {
    label,
    plan: stages.join(' < '),
    scanned: stats?.totalDocsExamined,
    returned: stats?.nReturned,
    collscan: stages.includes('COLLSCAN'),
  };
};

const run = async () => {
  const log = console.log;
  console.log = () => {};
  await connectDB();
  console.log = log;

  if (!args.includes('--reuse')) await seed();

  const app = require('../app');
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}/api`;

  const hr = await User.findOne({ role: 'hr' });
  const manager = await User.findOne({ role: 'manager', isActive: true });
  const employeeUser = await User.findOne({ role: 'employee', isActive: true });
  const hrToken = signToken(hr._id);
  const managerToken = signToken(manager._id);
  const employeeToken = signToken(employeeUser._id);
  const managerEmployee = await Employee.findOne({ userId: manager._id });
  const someEmployee = await Employee.findOne({ userId: employeeUser._id });
  const today = toDateString(new Date(), getTimeZone());

  const endpoints = [
    ['HR dashboard', '/dashboard/hr', hrToken],
    ['Manager dashboard', '/dashboard/manager', managerToken],
    ['Employee dashboard', '/dashboard/employee', employeeToken],
    ['Attendance summary (month)', '/reports/attendance-summary', hrToken],
    ['Attendance summary (60 days)', `/reports/attendance-summary?from=${addDays(today, -60)}&to=${today}`, hrToken],
    ['Leave summary', '/reports/leave-summary', hrToken],
    ['Department stats', '/reports/department-stats', hrToken],
    ['Training summary', '/reports/training-summary', hrToken],
    ['Employees list', '/employees?limit=25', hrToken],
    ['Employees by role', '/employees?role=manager&limit=25', hrToken],
    ['All attendance', '/attendance?limit=25', hrToken],
    ['All attendance, one day', `/attendance?date=${addDays(today, -1)}&limit=25`, hrToken],
    ['Team attendance', '/attendance/team?limit=25', managerToken],
    ['My attendance', '/attendance/my?limit=25', employeeToken],
    ['All leave (pending)', '/leaves?status=pending&limit=25', hrToken],
    ['Team leave', '/leaves/team?limit=25', managerToken],
    ['My leave', '/leaves/my?limit=25', employeeToken],
    ['Trainings', '/trainings?limit=25', employeeToken],
    ['Announcements', '/announcements?limit=25', employeeToken],
    ['Notifications', '/notifications?limit=20', employeeToken],
    ['Health (baseline)', '/health', hrToken],
  ];

  const results = [];
  for (const [label, urlPath, token] of endpoints) results.push(await measure(base, label, urlPath, token));

  console.log('Endpoint                          status   median     p95     size');
  for (const r of results) {
    console.log(`${r.label.padEnd(32)}  ${String(r.status).padEnd(6)} ${`${r.median.toFixed(0)} ms`.padStart(7)} ${`${r.p95.toFixed(0)} ms`.padStart(7)} ${`${r.kb.toFixed(1)} kB`.padStart(8)}`);
  }

  const teamIds = await Employee.find({ managerId: managerEmployee._id }).distinct('_id');
  const plans = await Promise.all([
    explain('Leave: team, newest first', Leave.find({ employeeId: { $in: teamIds } }).sort({ createdAt: -1 }).limit(25)),
    explain('Leave: own, newest first', Leave.find({ employeeId: someEmployee._id }).sort({ createdAt: -1 }).limit(25)),
    explain('Leave: pending, newest first', Leave.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(25)),
    explain('Leave: approved overlapping a day', Leave.find({ employeeId: { $in: teamIds }, status: 'approved', startDate: { $lte: new Date() }, endDate: { $gte: new Date() } })),
    explain('Attendance: one day, all', Attendance.find({ date: addDays(today, -1) }).sort({ date: -1, checkIn: -1 }).limit(25)),
    explain('Attendance: team, newest', Attendance.find({ employeeId: { $in: teamIds } }).sort({ date: -1, checkIn: -1 }).limit(25)),
    explain('Attendance: everyone, newest', Attendance.find({}).sort({ date: -1, checkIn: -1 }).limit(25)),
    explain('Employees: team', Employee.find({ managerId: managerEmployee._id })),
    explain('Employees: sorted by code', Employee.find({}).sort({ employeeId: 1 }).limit(25)),
    explain('Users: active', User.find({ isActive: true }).select('_id')),
    explain('Notifications: own, newest', Notification.find({ recipient: employeeUser._id }).sort({ createdAt: -1 }).limit(20)),
    explain('Trainings: enrolled', Training.find({ participants: someEmployee._id }).sort({ startDate: 1 })),
    explain('Announcements: audience, newest', Announcement.find({ targetAudience: { $in: ['all', 'employees'] } }).sort({ createdAt: -1 }).limit(25)),
  ]);

  console.log('\nQuery                               scanned  returned  plan');
  for (const p of plans) {
    console.log(`${p.collscan ? '!' : ' '} ${p.label.padEnd(34)} ${String(p.scanned).padStart(7)} ${String(p.returned).padStart(9)}  ${p.plan}`);
  }
  console.log('\n! = reads the whole collection (no index used)');

  await new Promise((resolve) => server.close(resolve));
  if (!args.includes('--keep') && !args.includes('--reuse')) await wipe();
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  try { await mongoose.connection.close(); } catch { /* ignore */ }
});
