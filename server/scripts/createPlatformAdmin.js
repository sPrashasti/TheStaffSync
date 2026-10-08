// Creates a StaffSync platform admin: the operator account that will manage organisations (the
// console arrives in Phase 21). This script is the ONLY way to create one; no API can.
//
//   npm run platform:create-admin -- --name "Your Name" --email you@example.com
//
// The password comes from PLATFORM_ADMIN_PASSWORD in server/.env, never from the command line
// (which would keep it in your shell history). Remove it from .env afterwards if you like.
// Safe to re-run: an existing admin with that email is left untouched.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { PlatformAdmin, User } = require('../models');
const { passwordProblem } = require('../utils/passwordPolicy');

const option = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : (process.argv[index + 1] || '').trim() || undefined;
};

const run = async () => {
  const name = option('--name') || (process.env.PLATFORM_ADMIN_NAME || '').trim();
  const email = (option('--email') || process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || '';
  if (!name || !email) throw new Error('Give --name "…" and --email "…" (or PLATFORM_ADMIN_NAME / PLATFORM_ADMIN_EMAIL).');
  if (!password) throw new Error('Set PLATFORM_ADMIN_PASSWORD in server/.env.');
  const problem = passwordProblem(password);
  if (problem) throw new Error(`PLATFORM_ADMIN_PASSWORD: ${problem}`);

  await connectDB();

  if (await PlatformAdmin.exists({ email })) {
    console.log(`Platform admin ${email} already exists. Not changed.`);
    return;
  }
  // Kept apart from organisation accounts, so nobody is confused about which login is which.
  if (await User.emailInUse(email)) {
    throw new Error(`${email} is an organisation user's email. Use a separate address for the platform admin.`);
  }
  await PlatformAdmin.create({ name, email, password });
  console.log(`Platform admin ${email} created. Sign in with POST /api/platform/auth/login.`);
};

run()
  .catch((err) => {
    console.error(`Could not create platform admin: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
