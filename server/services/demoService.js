// The public demo (Phase 20): one organisation that anyone can try without a password.
//
//   setupDemo   marks an organisation as the demo, names its HR / manager / employee accounts and
//               takes a BASELINE: a copy of every record the organisation owns at that moment.
//   resetDemo   puts the organisation back to that baseline: records changed since are restored,
//               records created since (by visitors) are removed. Nothing else is touched.
//   isResetDue  whether the nightly reset (03:00 in the organisation's time zone) has come round.
//
// Works on the raw collections on purpose, so a reset restores records exactly as they were,
// including fields the app never lets anyone change.
const mongoose = require('mongoose');
const Organisation = require('../models/Organisation');
const Counter = require('../models/Counter');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Announcement = require('../models/Announcement');
const Training = require('../models/Training');
const Notification = require('../models/Notification');
const { runAsPlatform } = require('../utils/tenantContext');
const { toDateString, addDays } = require('../utils/dates');

const DEMO_ROLES = ['hr', 'manager', 'employee'];
// Email domains allowed for accounts in the demo, so visitors cannot occupy real people's addresses.
const DEMO_EMAIL_DOMAINS = ['staffsync.demo', 'staffsync.test'];
const RESET_HOUR = 3;

// Every organisation-owned model. A new one must be added here, or its demo data is never reset.
const OWNED = [User, Employee, Attendance, Leave, Announcement, Training, Notification];

const baselines = () => mongoose.connection.db.collection('demobaselines');
const key = (organisationId, name) => `${organisationId}:${name}`;

const isDemoEmail = (email) => DEMO_EMAIL_DOMAINS.some((domain) => String(email).toLowerCase().endsWith(`@${domain}`));

// The demo organisation, or null if none is set up.
const findDemoOrganisation = () => Organisation.findOne({ 'demo.enabled': true });

const isDemoAccount = (organisation, userId) =>
  Boolean(organisation?.demo?.enabled) && DEMO_ROLES.some((role) => organisation.demo.accounts?.[role]?.equals(userId));

// Copies every record the organisation owns, plus its employee number sequence.
const captureBaseline = async (organisation) => {
  const counts = {};
  for (const Model of OWNED) {
    const name = Model.collection.collectionName;
    const docs = await Model.collection.find({ organisationId: organisation._id }).toArray();
    await baselines().replaceOne(
      { _id: key(organisation._id, name) },
      { organisationId: organisation._id, collection: name, docs },
      { upsert: true }
    );
    counts[name] = docs.length;
  }
  const counter = await Counter.collection.findOne({ _id: Counter.employeeIdKey(organisation._id) });
  await baselines().replaceOne(
    { _id: key(organisation._id, 'counters') },
    { organisationId: organisation._id, collection: 'counters', docs: counter ? [counter] : [] },
    { upsert: true }
  );
  return counts;
};

// accounts: { hr, manager, employee } email addresses of accounts in this organisation.
const setupDemo = (organisation, accounts) => runAsPlatform(async () => {
  if (await Organisation.exists({ 'demo.enabled': true, _id: { $ne: organisation._id } })) {
    throw new Error('Another organisation is already the demo. Only one demo organisation is supported.');
  }
  const ids = {};
  for (const role of DEMO_ROLES) {
    const user = await User.findOne({ email: String(accounts[role] || '').toLowerCase() });
    if (!user || !user.organisationId.equals(organisation._id)) {
      throw new Error(`The ${role} account "${accounts[role]}" is not in ${organisation.name}.`);
    }
    if (user.role !== role) throw new Error(`${user.email} is a ${user.role}, not a ${role}.`);
    if (!user.isActive) throw new Error(`${user.email} is deactivated.`);
    ids[role] = user._id;
  }
  const now = new Date();
  const counts = await captureBaseline(organisation);
  await Organisation.updateOne(
    { _id: organisation._id },
    // lastResetAt = now, so the first reset is the next 03:00, not straight away.
    { $set: { 'demo.enabled': true, 'demo.accounts': ids, 'demo.baselineAt': now, 'demo.lastResetAt': now } }
  );
  return counts;
});

// Puts the demo organisation back to its baseline. Returns what changed, per collection.
const resetDemo = (organisation) => runAsPlatform(async () => {
  if (!organisation?.demo?.enabled) throw new Error('This organisation is not the demo.');
  const summary = {};
  const restore = async (collection, name) => {
    const baseline = await baselines().findOne({ _id: key(organisation._id, name) });
    if (!baseline) throw new Error(`No demo baseline for ${name}. Run npm run demo:setup again.`);
    const ids = baseline.docs.map((d) => d._id);
    const filter = name === 'counters' ? { _id: Counter.employeeIdKey(organisation._id) } : { organisationId: organisation._id };
    const { deletedCount } = await collection.deleteMany({ ...filter, _id: { $nin: ids } });
    let restored = 0;
    if (baseline.docs.length > 0) {
      // Unordered: one record that cannot be restored (e.g. its email is now used by another
      // organisation) must not stop the rest.
      const result = await collection.bulkWrite(
        baseline.docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
        { ordered: false }
      ).catch((err) => {
        console.error(`Demo reset: ${err.writeErrors?.length || 1} ${name} record(s) could not be restored: ${err.message}`);
        return err.result || { modifiedCount: 0, upsertedCount: 0 };
      });
      restored = (result.modifiedCount || 0) + (result.upsertedCount || 0);
    }
    summary[name] = { removed: deletedCount, restored };
  };
  for (const Model of OWNED) await restore(Model.collection, Model.collection.collectionName);
  await restore(Counter.collection, 'counters');
  await Organisation.updateOne({ _id: organisation._id }, { $set: { 'demo.lastResetAt': new Date() } });
  return summary;
});

// The instant it is 03:00 on `dateString` in `timeZone`.
const localTimeToDate = (dateString, hour, timeZone) => {
  const guess = new Date(`${dateString}T${String(hour).padStart(2, '0')}:00:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(guess).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()));
};

// The most recent 03:00 (organisation time) at or before `now`.
const lastResetTime = (now, timeZone) => {
  const today = toDateString(now, timeZone);
  const todays = localTimeToDate(today, RESET_HOUR, timeZone);
  return todays <= now ? todays : localTimeToDate(addDays(today, -1), RESET_HOUR, timeZone);
};

const isResetDue = (organisation, now = new Date()) =>
  Boolean(organisation?.demo?.enabled)
  && (!organisation.demo.lastResetAt || organisation.demo.lastResetAt < lastResetTime(now, organisation.settings.timeZone));

// Resets the demo if it is due. Safe to call from several places at once: only the caller that
// claims the reset (atomically) runs it. Returns the summary, or null if nothing was due.
const resetIfDue = (now = new Date()) => runAsPlatform(async () => {
  const organisation = await findDemoOrganisation();
  if (!isResetDue(organisation, now)) return null;
  const claimed = await Organisation.findOneAndUpdate(
    { _id: organisation._id, 'demo.lastResetAt': organisation.demo.lastResetAt },
    { $set: { 'demo.lastResetAt': now } },
    { returnDocument: 'after' }
  );
  if (!claimed) return null;
  return resetDemo(claimed);
});

// Checks every 10 minutes while the server runs, and once at start-up, so a server that was
// asleep at 03:00 (as free hosting plans do) still resets as soon as it wakes.
const CHECK_EVERY_MS = 10 * 60 * 1000;
const scheduleDemoResets = () => {
  const check = () => resetIfDue()
    .then((summary) => summary && console.log(`Demo organisation reset to its baseline: ${JSON.stringify(summary)}`))
    .catch((err) => console.error(`Demo reset failed: ${err.message}`));
  check();
  const timer = setInterval(check, CHECK_EVERY_MS);
  timer.unref();
  return timer;
};

module.exports = {
  DEMO_ROLES,
  DEMO_EMAIL_DOMAINS,
  isDemoEmail,
  isDemoAccount,
  findDemoOrganisation,
  setupDemo,
  captureBaseline,
  resetDemo,
  isResetDue,
  lastResetTime,
  resetIfDue,
  scheduleDemoResets,
};
