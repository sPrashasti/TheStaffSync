// SEED DATA. Creates an organisation's first HR account, and optionally demo accounts.
// Passwords come from server/.env, never from code or the command line.
//
//   npm run seed -- --organisation "Name"        that organisation (created if new) + its HR account
//   npm run seed:demo -- --organisation "Name"   + demo manager, two team members and one employee
//                                                 outside the team
//   --hr-name "…" --hr-email "…"                 override SEED_HR_NAME / SEED_HR_EMAIL
//
// The organisation can also come from SEED_ORGANISATION. Usually you don't need this script at all:
// a new company signs up at /signup. Safe to re-run: existing accounts are left untouched, and an
// email already used in ANOTHER organisation is refused (addresses are unique across StaffSync).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { Organisation, User, Employee } = require('../models');
const { runAsPlatform, runInOrganisation, currentOrganisationId } = require('../utils/tenantContext');
const { getPlatformTimeZone, getPlatformWorkingDays } = require('../utils/dates');
const { passwordProblem } = require('../utils/passwordPolicy');

const DEMO_DOMAIN = 'staffsync.demo';

const requireEnv = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is not set in server/.env (see .env.example).`);
  return value;
};

// The value after a flag, e.g. --organisation "DemoTech Corporation".
const option = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : (process.argv[index + 1] || '').trim() || undefined;
};

const checkPassword = (name, password) => {
  const problem = passwordProblem(password);
  if (problem) throw new Error(`${name}: ${problem}`);
};

// Creates the User and Employee together, or reports the existing account and leaves it alone.
const ensureAccount = async ({ name, email, password, role, department, designation, managerId = null }) => {
  email = email.toLowerCase();
  // Platform-wide, because an address may already be in use in another organisation.
  const existing = await runAsPlatform(() => User.findOne({ email }));
  if (existing && !existing.organisationId.equals(currentOrganisationId())) {
    throw new Error(`${email} already belongs to another organisation. Use a different email.`);
  }
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
  const organisationName = option('--organisation') || (process.env.SEED_ORGANISATION || '').trim();
  if (!organisationName) {
    throw new Error('Say which organisation: --organisation "Company name" (or set SEED_ORGANISATION).');
  }
  const hr = {
    name: option('--hr-name') || requireEnv('SEED_HR_NAME'),
    email: option('--hr-email') || requireEnv('SEED_HR_EMAIL'),
    password: requireEnv('SEED_HR_PASSWORD'),
  };
  checkPassword('SEED_HR_PASSWORD', hr.password);
  const demoPassword = withDemo ? requireEnv('SEED_DEMO_PASSWORD') : null;
  if (withDemo) checkPassword('SEED_DEMO_PASSWORD', demoPassword);

  await connectDB();

  // Matched by exact name; created with the platform defaults if it does not exist yet.
  let organisation = await Organisation.findOne({ name: organisationName });
  if (organisation) {
    console.log(`Organisation  ${organisation.name} (exists)`);
  } else {
    organisation = await Organisation.create({
      name: organisationName,
      slug: await Organisation.uniqueSlug(organisationName),
      settings: { timeZone: getPlatformTimeZone(), workingDays: getPlatformWorkingDays().split(',') },
    });
    console.log(`Organisation  ${organisation.name} (created)`);
  }
  await runInOrganisation(organisation, () => seedAccounts({ hr, withDemo, demoPassword }));
  console.log('Seed complete.');
};

const seedAccounts = async ({ hr, withDemo, demoPassword }) => {
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
};

run()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
