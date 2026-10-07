// Removes the accounts the Postman collection creates (postman+…@staffsync.test) and everything
// that belongs to them. Development only.
//
//   npm run clean:test-data          show what would be deleted
//   npm run clean:test-data -- --yes delete it
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Employee, Attendance, Leave, Notification, Training } = require('../models');

const TEST_EMAIL = /^postman\+[^@]*@staffsync\.test$/;

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to delete data with NODE_ENV=production.');
  }
  const confirmed = process.argv.includes('--yes');

  await connectDB();

  const userIds = await User.find({ email: TEST_EMAIL }).distinct('_id');
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

  console.log(confirmed ? 'Test data removed.' : 'Nothing deleted. Re-run with -- --yes to delete.');
};

run()
  .catch((err) => {
    console.error(`Clean-up failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
