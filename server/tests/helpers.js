// Shared set-up for the API test suite.
//
// Each test file gets its own database (staffsync_test_<name>) on the cluster in MONGO_URI, or
// on TEST_MONGO_URI if set. Collections are dropped before and after, so files can run in
// parallel and real data is never touched. The real app (app.js) is started on a random port
// and called over HTTP, exactly as a client would.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');

const testUri = (name) => {
  const source = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
  if (!source) throw new Error('Set MONGO_URI (or TEST_MONGO_URI) in server/.env to run the tests.');
  const url = new URL(source);
  url.pathname = `/staffsync_test_${name}`;
  return url.toString();
};

// Connects, empties the test database, builds indexes, creates a test organisation and starts
// the app. Direct database calls in a test file run as that organisation (ctx.organisation),
// unless the file asks for { strict: true }: then every direct call must say which organisation
// it is for (ctx.inOrganisation), exactly like production code.
const setup = async (name, { strict = false } = {}) => {
  process.env.MONGO_URI = testUri(name);
  process.env.NODE_ENV = 'test';
  // Tests send many requests from one address, so limits are generous unless a test file (such as
  // security.test.js) has already set its own.
  for (const [key, value] of [['RATE_LIMIT_MAX_REQUESTS', '100000'], ['LOGIN_MAX_FAILURES', '1000'], ['SIGNUP_MAX_PER_HOUR', '1000'], ['FORGOT_PASSWORD_MAX_PER_HOUR', '1000'], ['RESET_PASSWORD_MAX_ATTEMPTS', '1000']]) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  const { connectDB } = require('../config/db');
  const models = require('../models');
  const app = require('../app');

  // Never run against a database that is not clearly a test one.
  const dbName = new URL(process.env.MONGO_URI).pathname.slice(1);
  if (!dbName.includes('test')) throw new Error(`Refusing to run tests against "${dbName}".`);

  const log = console.log;
  console.log = () => {}; // keep "MongoDB connected" out of the test output
  await connectDB();
  console.log = log;

  const wipe = async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    await Promise.all(collections.map((c) => mongoose.connection.db.dropCollection(c.name)));
  };
  await wipe();
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));

  const { runAsPlatform, runInOrganisation, setTestFallback } = require('../utils/tenantContext');
  const makeOrganisation = (orgName, extra = {}) => models.Organisation.create({
    name: orgName,
    slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ...extra,
  });
  const organisation = await makeOrganisation('Test Organisation');
  setTestFallback(strict ? undefined : organisation);

  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}/api`;

  const { signToken } = require('../utils/token');

  // Calls the API. Returns { status, body }.
  const call = async (method, urlPath, token, body, rawBody) => {
    const res = await fetch(base + urlPath, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: res.status, body: await res.json() };
  };

  // Creates a user and employee directly in the database and returns a token for them.
  // In the test organisation unless another is given.
  const makeUser = ({ organisation: org = organisation, ...details }) => runInOrganisation(org, () => createUser(details));
  const createUser = async ({ name, email, role = 'employee', active = true, ...employee }) => {
    const user = await models.User.create({
      name: name || email.split('@')[0],
      email,
      password: 'Passw0rd123',
      role,
      isActive: active,
    });
    const emp = await models.Employee.create({ userId: user._id, department: 'Eng', designation: 'Engineer', ...employee });
    return { user, emp, token: signToken(user._id) };
  };

  const teardown = async () => {
    await new Promise((resolve) => server.close(resolve));
    await wipe();
    setTestFallback(undefined);
    await mongoose.connection.close();
  };

  return {
    app, base, call, makeUser, makeOrganisation, organisation, inOrganisation: runInOrganisation, asPlatform: runAsPlatform, models, mongoose, signToken, wipe, teardown,
  };
};

module.exports = { setup };
