// Phase 19: moves a single-company StaffSync database to organisations (multi-tenancy).
// See docs/PHASE-19-MULTITENANCY-PLAN.md. NON-DESTRUCTIVE: it adds organisationId to records,
// creates the organisation records and changes indexes. It deletes no record and renames nothing.
//
//   npm run migrate:tenancy -- --plan tenancy-plan.local.json             dry run (default): prints everything, changes nothing
//   npm run migrate:tenancy -- --export                                   JSON copy of every collection into server/backups/
//   npm run migrate:tenancy -- --plan tenancy-plan.local.json --apply     export, then migrate
//   npm run migrate:tenancy -- --plan tenancy-plan.local.json --rollback  undo --apply
//
// The plan file (git-ignored, as it holds real email addresses) says which accounts go where:
//   { "organisations": [
//       { "name": "Company A", "default": true },              ← every account not listed elsewhere
//       { "name": "Company B", "emails": ["a@b.com", …] } ] }
// Records follow their owner: profiles, attendance and leave follow the employee, notifications
// the recipient, announcements and trainings the author.
//
// Works on the raw collections on purpose: the app's models refuse to run without an
// organisation, and this script is the one place that sets it up.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { getPlatformTimeZone, getPlatformWorkingDays } = require('../utils/dates');

// Loading the models must not create collections or indexes: a dry run changes nothing at all.
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const { EJSON } = mongoose.mongo.BSON;
const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const OWNED = ['users', 'employees', 'attendances', 'leaves', 'announcements', 'trainings', 'notifications'];
const MIGRATION_ID = 'phase-19-tenancy';

// Indexes before Phase 19, kept so --rollback can put them back exactly.
const OLD_INDEXES = {
  users: [[{ role: 1, isActive: 1 }, {}]],
  employees: [[{ employeeId: 1 }, { unique: true }], [{ department: 1 }, {}]],
  attendances: [[{ date: 1, checkIn: 1 }, {}]],
  leaves: [[{ status: 1, createdAt: -1 }, {}]],
  announcements: [[{ targetAudience: 1, createdAt: -1 }, {}]],
  trainings: [[{ startDate: 1 }, {}]],
};

const db = () => mongoose.connection.db;
const col = (name) => db().collection(name);
const ids = (docs) => docs.map((d) => d._id);
const key = (id) => String(id);
const line = (label, value) => console.log(`  ${String(label).padEnd(44)} ${value}`);

// ---------- Plan ----------

const readPlan = () => {
  const file = option('--plan');
  if (!file) throw new Error('Give the mapping file: --plan tenancy-plan.local.json');
  const plan = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const orgs = plan.organisations || [];
  if (orgs.filter((o) => o.default).length !== 1) throw new Error('Exactly one organisation must have "default": true.');
  const seen = new Set();
  orgs.forEach((o) => {
    if (!o.name || typeof o.name !== 'string') throw new Error('Every organisation needs a name.');
    (o.emails || []).forEach((email) => {
      const e = email.toLowerCase();
      if (seen.has(e)) throw new Error(`${e} is listed twice.`);
      seen.add(e);
    });
  });
  return orgs.map((o) => ({ ...o, emails: (o.emails || []).map((e) => e.toLowerCase()), slug: slugify(o.name) }));
};

const slugify = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

// Works out, without writing anything, which organisation every record belongs to.
const computeAssignments = async (plan) => {
  const users = await col('users').find({}, { projection: { email: 1, role: 1, organisationId: 1 } }).toArray();
  const employees = await col('employees').find({}, { projection: { userId: 1, managerId: 1, employeeId: 1, organisationId: 1 } }).toArray();

  const fallback = plan.find((o) => o.default);
  const orgOfEmail = new Map(plan.flatMap((o) => o.emails.map((e) => [e, o])));
  const unmatchedEmails = plan.flatMap((o) => o.emails).filter((e) => !users.some((u) => u.email === e));

  const orgOfUser = new Map(users.map((u) => [key(u._id), orgOfEmail.get(u.email) || fallback]));
  const orphans = {};
  const orgOfEmployee = new Map(employees.map((e) => {
    const org = orgOfUser.get(key(e.userId));
    if (!org) orphans.employees = (orphans.employees || 0) + 1;
    return [key(e._id), org || fallback];
  }));

  const byRef = async (collection, field, map) => {
    const docs = await col(collection).find({}, { projection: { [field]: 1, organisationId: 1, approvedBy: 1, participants: 1 } }).toArray();
    return docs.map((d) => {
      const org = map.get(key(d[field]));
      if (!org) orphans[collection] = (orphans[collection] || 0) + 1;
      return { doc: d, org: org || fallback };
    });
  };

  const assigned = {
    users: users.map((u) => ({ doc: u, org: orgOfUser.get(key(u._id)) })),
    employees: employees.map((e) => ({ doc: e, org: orgOfEmployee.get(key(e._id)) })),
    attendances: await byRef('attendances', 'employeeId', orgOfEmployee),
    leaves: await byRef('leaves', 'employeeId', orgOfEmployee),
    announcements: await byRef('announcements', 'createdBy', orgOfUser),
    trainings: await byRef('trainings', 'createdBy', orgOfUser),
    notifications: await byRef('notifications', 'recipient', orgOfUser),
  };

  // Links that would cross organisations once split.
  const managerLinksToClear = assigned.employees
    .filter(({ doc, org }) => doc.managerId && orgOfEmployee.get(key(doc.managerId)) && orgOfEmployee.get(key(doc.managerId)) !== org)
    .map(({ doc }) => ({ employee: doc._id, employeeId: doc.employeeId, managerId: doc.managerId }));
  const crossApprovals = assigned.leaves.filter(({ doc, org }) => doc.approvedBy && orgOfUser.get(key(doc.approvedBy)) && orgOfUser.get(key(doc.approvedBy)) !== org).length;
  const crossParticipants = assigned.trainings.reduce((n, { doc, org }) => n + (doc.participants || []).filter((p) => orgOfEmployee.get(key(p)) && orgOfEmployee.get(key(p)) !== org).length, 0);

  // Each organisation's employee numbers continue from its own highest one.
  const highestNumber = new Map();
  assigned.employees.forEach(({ doc, org }) => {
    const n = Number(/^EMP(\d+)$/.exec(doc.employeeId || '')?.[1] || 0);
    highestNumber.set(org.slug, Math.max(highestNumber.get(org.slug) || 0, n));
  });
  // Codes that would clash inside one organisation (impossible today: codes are globally unique).
  const codes = new Set();
  const duplicateCodes = assigned.employees.filter(({ doc, org }) => {
    const k = `${org.slug}|${doc.employeeId}`;
    if (codes.has(k)) return true;
    codes.add(k);
    return false;
  }).length;

  return { users, assigned, unmatchedEmails, orphans, managerLinksToClear, crossApprovals, crossParticipants, highestNumber, duplicateCodes };
};

// ---------- Report ----------

const report = async (plan, a) => {
  console.log('\nOrganisations');
  for (const o of plan) {
    const exists = await col('organisations').findOne({ slug: o.slug });
    line(`${o.name} (${o.slug})`, exists ? 'already exists, reused' : `will be created  time zone ${getPlatformTimeZone()}, working days ${getPlatformWorkingDays()}`);
  }

  console.log('\nRecords per organisation (records that already have organisationId are skipped)');
  for (const name of OWNED) {
    const missing = a.assigned[name].filter(({ doc }) => !doc.organisationId);
    const counts = plan.map((o) => `${o.name}: ${missing.filter(({ org }) => org === o).length}`).join(' | ');
    line(`${name} (${a.assigned[name].length} total, ${missing.length} to update)`, counts);
  }

  console.log('\nAccounts by organisation and role');
  for (const o of plan) {
    const mine = a.assigned.users.filter(({ org }) => org === o).map(({ doc }) => doc);
    const roles = ['hr', 'manager', 'employee'].map((r) => `${r} ${mine.filter((u) => u.role === r).length}`).join(', ');
    line(o.name, `${mine.length} accounts (${roles})`);
    if (!o.default) mine.forEach((u) => line('', `${u.email} (${u.role})`));
  }

  console.log('\nCross-organisation links');
  line('Manager links to clear', a.managerLinksToClear.length);
  a.managerLinksToClear.forEach((m) => line('', `${m.employeeId}: managerId cleared (kept in the migration log for rollback)`));
  line('Leave decided by someone in another org', `${a.crossApprovals} (kept as history; approver shows as "—")`);
  line('Training participants in another org', a.crossParticipants);

  console.log('\nChecks');
  line('Plan emails not found in the database', a.unmatchedEmails.length ? a.unmatchedEmails.join(', ') : 'none');
  line('Records whose owner is missing', Object.keys(a.orphans).length ? `${JSON.stringify(a.orphans)} (go to the default organisation)` : 'none');
  line('Employee codes that would clash', a.duplicateCodes);

  console.log('\nEmployee number sequences');
  const legacy = await col('counters').findOne({ _id: 'employeeId' });
  line('Current shared sequence', legacy ? legacy.seq : '(none)');
  plan.forEach((o) => line(`${o.name}`, `continues after EMP${String(a.highestNumber.get(o.slug) || 0).padStart(4, '0')}`));

  console.log('\nIndexes (the only things removed are these old index definitions; no data)');
  const models = require('../models');
  for (const Model of Object.values(models)) {
    const diff = await Model.diffIndexes().catch(() => ({ toDrop: [], toCreate: [] }));
    if (diff.toDrop.length || diff.toCreate.length) {
      line(Model.collection.collectionName, [
        ...diff.toDrop.map((n) => `drop ${n}`),
        ...diff.toCreate.map((k) => `create ${JSON.stringify(k)}`),
      ].join('; '));
    }
  }
};

// ---------- Export ----------

const exportAll = async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  const collections = await db().listCollections().toArray();
  console.log(`\nExport to ${path.relative(process.cwd(), dir)}`);
  for (const { name } of collections) {
    const docs = await col(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, null, 0, { relaxed: false }));
    // Read it back, so a failed or partial write is caught before anything changes.
    const check = EJSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
    if (check.length !== docs.length) throw new Error(`Export of ${name} did not verify.`);
    line(name, `${docs.length} documents`);
  }
  return dir;
};

// ---------- Apply ----------

const apply = async (plan, a) => {
  if (a.duplicateCodes > 0) throw new Error('Employee codes would clash; not applying.');
  const backup = await exportAll();

  console.log('\nApplying');
  const orgIds = new Map();
  const created = [];
  for (const o of plan) {
    let org = await col('organisations').findOne({ slug: o.slug });
    if (!org) {
      const now = new Date();
      org = {
        _id: new mongoose.Types.ObjectId(),
        name: o.name,
        slug: o.slug,
        status: 'active',
        settings: { timeZone: getPlatformTimeZone(), workingDays: getPlatformWorkingDays().split(',') },
        createdAt: now,
        updatedAt: now,
        __v: 0,
      };
      await col('organisations').insertOne(org);
      created.push(org._id);
    }
    orgIds.set(o.slug, org._id);
    line(`organisation ${o.name}`, org._id);
  }

  // The log makes --rollback exact: what was created and which links were cleared.
  await col('migrations').updateOne(
    { _id: MIGRATION_ID },
    {
      $setOnInsert: { startedAt: new Date(), backup: path.basename(backup) },
      $addToSet: {
        createdOrganisations: { $each: created },
        clearedManagers: { $each: a.managerLinksToClear.map(({ employee, managerId }) => ({ employee, managerId })) },
      },
    },
    { upsert: true }
  );

  for (const { employee } of a.managerLinksToClear) {
    await col('employees').updateOne({ _id: employee }, { $set: { managerId: null } });
  }
  line('manager links cleared', a.managerLinksToClear.length);

  for (const name of OWNED) {
    let updated = 0;
    for (const o of plan) {
      const target = ids(a.assigned[name].filter(({ doc, org }) => org === o && !doc.organisationId).map(({ doc }) => doc));
      if (target.length === 0) continue;
      const result = await col(name).updateMany(
        { _id: { $in: target }, organisationId: { $exists: false } },
        { $set: { organisationId: orgIds.get(o.slug) } }
      );
      updated += result.modifiedCount;
    }
    line(`${name} given organisationId`, updated);
  }

  // Per-organisation sequences; the old shared one is left in place (unused) for rollback.
  for (const o of plan) {
    await col('counters').updateOne(
      { _id: `${orgIds.get(o.slug)}:employeeId` },
      { $max: { seq: a.highestNumber.get(o.slug) || 0 } },
      { upsert: true }
    );
  }
  line('employee number sequences', 'set per organisation');

  const models = require('../models');
  for (const Model of Object.values(models)) await Model.syncIndexes();
  line('indexes', 'synchronised');

  await col('migrations').updateOne({ _id: MIGRATION_ID }, { $set: { appliedAt: new Date() } });
  await verify(plan, orgIds);
};

const verify = async (plan, orgIds) => {
  console.log('\nVerification');
  let ok = true;
  for (const name of OWNED) {
    const missing = await col(name).countDocuments({ organisationId: { $exists: false } });
    const perOrg = await Promise.all(plan.map(async (o) => `${o.name}: ${await col(name).countDocuments({ organisationId: orgIds.get(o.slug) })}`));
    if (missing > 0) ok = false;
    line(name, `${missing === 0 ? 'OK' : `${missing} WITHOUT organisation`}  ${perOrg.join(' | ')}`);
  }
  // Every account still has its employee profile in the same organisation.
  const split = await col('employees').aggregate([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
    { $match: { $expr: { $ne: ['$organisationId', { $arrayElemAt: ['$u.organisationId', 0] }] } } },
    { $count: 'n' },
  ]).toArray();
  line('profiles in a different org from their account', split[0]?.n || 0);
  if (split[0]?.n) ok = false;
  console.log(ok ? '\nMigration verified.' : '\nVERIFICATION FAILED: see above. Nothing was deleted; run --rollback or ask for help.');
  if (!ok) process.exitCode = 1;
};

// ---------- Rollback ----------

const rollback = async () => {
  const log = await col('migrations').findOne({ _id: MIGRATION_ID });
  if (!log) throw new Error('No record of this migration having run; nothing to roll back.');

  // Checked before anything changes, so a refused rollback leaves the database exactly as it is.
  // Since the migration each organisation numbers its own employees, so organisations created or
  // grown since may share codes, which the old single-company unique index cannot hold.
  const clashes = await col('employees').aggregate([
    { $group: { _id: '$employeeId', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]).toArray();
  if (clashes.length > 0) {
    throw new Error(`Cannot roll back: employee codes are now used in more than one organisation (${clashes.map((c) => c._id).join(', ')}). `
      + 'Nothing was changed. Restore the export taken before --apply instead (server/backups/).');
  }
  const unplanned = await col('organisations').countDocuments({ _id: { $nin: log.createdOrganisations || [] } });
  if (unplanned > 0) {
    throw new Error(`Cannot roll back: ${unplanned} organisation(s) signed up after the migration, and the old single-company `
      + 'version cannot hold them. Nothing was changed.');
  }

  await exportAll();
  console.log('\nRolling back');

  for (const { employee, managerId } of log.clearedManagers || []) {
    await col('employees').updateOne({ _id: employee, managerId: null }, { $set: { managerId } });
  }
  line('manager links restored', (log.clearedManagers || []).length);

  // New per-organisation indexes go first, so the old global unique index can be rebuilt.
  for (const name of OWNED) {
    const indexes = await col(name).indexes().catch(() => []);
    for (const index of indexes) {
      if (Object.keys(index.key).includes('organisationId')) await col(name).dropIndex(index.name);
    }
    const { modifiedCount } = await col(name).updateMany({ organisationId: { $exists: true } }, { $unset: { organisationId: '' } });
    line(`${name} organisationId removed`, modifiedCount);
  }
  for (const [name, specs] of Object.entries(OLD_INDEXES)) {
    for (const [spec, opts] of specs) await col(name).createIndex(spec, opts);
  }
  line('old indexes', 'restored');

  const created = log.createdOrganisations || [];
  await col('counters').deleteMany({ _id: { $in: created.map((id) => `${id}:employeeId`) } });
  await col('organisations').deleteMany({ _id: { $in: created } });
  line('organisations created by the migration removed', created.length);
  await col('migrations').deleteOne({ _id: MIGRATION_ID });
  console.log('\nRolled back. Run the pre-Phase-19 code against this database.');
};

// ---------- Main ----------

const run = async () => {
  const log = console.log;
  console.log = () => {};
  await connectDB();
  console.log = log;
  console.log(`Database: ${mongoose.connection.name}`);

  if (args.includes('--export')) {
    await exportAll();
    return;
  }
  if (args.includes('--rollback')) {
    await rollback();
    return;
  }

  const plan = readPlan();
  const assignments = await computeAssignments(plan);
  await report(plan, assignments);

  if (args.includes('--apply')) {
    await apply(plan, assignments);
  } else {
    console.log('\nDRY RUN: nothing was changed. Re-run with --apply to migrate (an export is taken first).');
  }
};

run()
  .catch((err) => {
    console.error(`\nMigration stopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
