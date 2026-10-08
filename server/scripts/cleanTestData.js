// Removes the accounts the Postman collection creates (postman+…@staffsync.test), everything
// that belongs to them, and the organisations its sign-up requests create. Development only.
//
//   npm run clean:test-data          show what would be deleted
//   npm run clean:test-data -- --yes delete it
//
// Test accounts that already existed when the Phase 19 migration ran were kept on purpose as
// demo data (in DemoTech Solutions), so they are never touched unless --include-preserved is given.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { Organisation, Counter, User, Employee, Attendance, Leave, Notification, Training, Announcement } = require('../models');
const { runAsPlatform } = require('../utils/tenantContext');

const TEST_EMAIL = /^postman\+[^@]*@staffsync\.test$/;

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to delete data with NODE_ENV=production.');
  }
  const confirmed = process.argv.includes('--yes');

  await connectDB();
  // Platform-level: test accounts are found by email in whichever organisation they are in.
  await runAsPlatform(() => clean(confirmed));
};

const clean = async (confirmed) => {
  const filter = { email: TEST_EMAIL };
  const migration = await mongoose.connection.db.collection('migrations').findOne({ _id: 'phase-19-tenancy' });
  if (migration?.appliedAt && !process.argv.includes('--include-preserved')) {
    filter.createdAt = { $gt: migration.startedAt };
    const kept = await User.countDocuments({ email: TEST_EMAIL, createdAt: { $lte: migration.startedAt } });
    console.log(`  ${String(kept).padStart(5)} test accounts kept as demo data (created before the Phase 19 migration)`);
  }
  const userIds = await User.find(filter).distinct('_id');
  const organisationIds = await User.find({ _id: { $in: userIds } }).distinct('organisationId');
  const employeeIds = await Employee.find({ userId: { $in: userIds } }).distinct('_id');
  const byEmployee = { employeeId: { $in: employeeIds } };
  const leaveIds = await Leave.find(byEmployee).distinct('_id');

  // Every collection that can hold rows for a test account. Add new modules here.
  const targets = [
    ['attendance records', Attendance, byEmployee],
    ['leave requests', Leave, byEmployee],
    // Their own notifications, and other people's that point at their leave (e.g. a manager's "New leave request").
    ['notifications', Notification, { $or: [{ recipient: { $in: userIds } }, { 'relatedEntity.entityId': { $in: leaveIds } }] }],
    ['employee profiles', Employee, { _id: { $in: employeeIds } }],
    ['user accounts', User, { _id: { $in: userIds } }],
  ];

  for (const [label, Model, filter] of targets) {
    const count = await Model.countDocuments(filter);
    if (confirmed && count > 0) await Model.deleteMany(filter);
    console.log(`  ${String(count).padStart(5)} ${label}${confirmed ? ' deleted' : ''}`);
  }
  if (confirmed) {
    const { modifiedCount } = await Training.updateMany(
      { participants: { $in: employeeIds } },
      { $pull: { participants: { $in: employeeIds } } }
    );
    console.log(`  ${String(modifiedCount).padStart(5)} trainings had test participants removed`);
  }

  // Organisations left with nobody in them were created by Postman's sign-up requests. Real
  // organisations always keep at least their HR account, so they are never removed here.
  const emptied = [];
  for (const id of organisationIds) {
    const remaining = await User.countDocuments({ organisationId: id, _id: { $nin: userIds } });
    if (remaining === 0) emptied.push(id);
  }
  if (confirmed && emptied.length > 0) {
    await Promise.all([Announcement, Training, Notification, Attendance, Leave].map((Model) => Model.deleteMany({ organisationId: { $in: emptied } })));
    await Counter.deleteMany({ _id: { $in: emptied.map((id) => Counter.employeeIdKey(id)) } });
    await Organisation.deleteMany({ _id: { $in: emptied } });
  }
  console.log(`  ${String(emptied.length).padStart(5)} test organisations${confirmed ? ' deleted' : ''}`);

  console.log(confirmed ? 'Test data removed.' : 'Nothing deleted. Re-run with -- --yes to delete.');
};

run()
  .catch((err) => {
    console.error(`Clean-up failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
