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

// Connects, empties the test database, builds indexes and starts the app.
const setup = async (name) => {
  process.env.MONGO_URI = testUri(name);
  process.env.NODE_ENV = 'test';
  // Tests send many requests from one address, so limits are generous unless a test file (such as
  // security.test.js) has already set its own.
  for (const [key, value] of [['RATE_LIMIT_MAX_REQUESTS', '100000'], ['LOGIN_MAX_FAILURES', '1000'], ['REGISTER_MAX_PER_HOUR', '1000']]) {
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
  const makeUser = async ({ name, email, role = 'employee', active = true, ...employee }) => {
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
    await mongoose.connection.close();
  };

  return { app, base, call, makeUser, models, mongoose, signToken, wipe, teardown };
};

module.exports = { setup };
