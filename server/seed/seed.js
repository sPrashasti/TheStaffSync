// SEED DATA. Creates the first HR account, and optionally demo accounts, so the system can
// be used before any HR endpoint exists. Credentials come from server/.env, never from code.
//
//   npm run seed        first HR account only
//   npm run seed:demo   HR account + demo manager, two team members and one employee outside the team
//
// Safe to re-run: existing accounts are left untouched.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Employee } = require('../models');
const { passwordProblem } = require('../utils/passwordPolicy');

const DEMO_DOMAIN = 'staffsync.demo';

const requireEnv = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is not set in server/.env (see .env.example).`);
  return value;
};

const checkPassword = (name, password) => {
  const problem = passwordProblem(password);
  if (problem) throw new Error(`${name}: ${problem}`);
};

// Creates the User and Employee together, or reports the existing account and leaves it alone.
const ensureAccount = async ({ name, email, password, role, department, designation, managerId = null }) => {
  email = email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`${email} already exists with role "${existing.role}", not "${role}". Not changing it.`);
    }
    console.log(`  exists   ${role.padEnd(8)} ${email}`);
    return Employee.findOne({ userId: existing._id });
  }

  let employee;
  await mongoose.connection.transaction(async (session) => {
    const [user] = await User.create([{ name, email, password, role }], { session });
    [employee] = await Employee.create([{ userId: user._id, department, designation, managerId }], { session });
  });
  console.log(`  created  ${role.padEnd(8)} ${email}  (${employee.employeeId})`);
  return employee;
};

const run = async () => {
  const withDemo = process.argv.includes('--demo');

  // Check every setting before touching the database.
  const hr = {
    name: requireEnv('SEED_HR_NAME'),
    email: requireEnv('SEED_HR_EMAIL'),
    password: requireEnv('SEED_HR_PASSWORD'),
  };
  checkPassword('SEED_HR_PASSWORD', hr.password);
  const demoPassword = withDemo ? requireEnv('SEED_DEMO_PASSWORD') : null;
  if (withDemo) checkPassword('SEED_DEMO_PASSWORD', demoPassword);

  await connectDB();

  console.log('HR account');
  await ensureAccount({ ...hr, role: 'hr', department: 'Human Resources', designation: 'HR Administrator' });

  if (withDemo) {
    console.log(`Demo accounts (password: SEED_DEMO_PASSWORD)`);
    const demo = (local) => `${local}@${DEMO_DOMAIN}`;
    const manager = await ensureAccount({
      name: 'Demo Manager', email: demo('manager'), password: demoPassword,
      role: 'manager', department: 'Engineering', designation: 'Engineering Manager',
    });
    await ensureAccount({
      name: 'Demo Employee One', email: demo('employee1'), password: demoPassword,
      role: 'employee', department: 'Engineering', designation: 'Software Engineer', managerId: manager._id,
    });
    await ensureAccount({
      name: 'Demo Employee Two', email: demo('employee2'), password: demoPassword,
      role: 'employee', department: 'Engineering', designation: 'QA Engineer', managerId: manager._id,
    });
    // Deliberately outside the manager's team, so team scoping can be tested.
    await ensureAccount({
      name: 'Demo Employee Three', email: demo('employee3'), password: demoPassword,
      role: 'employee', department: 'Finance', designation: 'Accountant',
    });
  }

  console.log('Seed complete.');
};

run()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
