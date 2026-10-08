// The organisation (tenant) a piece of work belongs to, carried through every await of a request.
//
//   protect          → runs the rest of the request inside the user's organisation
//   runAsPlatform    → platform-level code that may see every organisation: login, sign-up,
//                      password reset, platform admin APIs, scripts. Every use is deliberate.
//
// The tenantScoped plugin reads this to scope every database query. Queries run when they are
// awaited, so callers await inside the callback (the helpers below do this for you).
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

// Test suite only (see setTestFallback): the organisation used when no context is set.
let testFallback;

// Mongoose queries and aggregations run only when awaited. If the callback returns one instead of
// awaiting it, the await would happen outside the context, so run it here, inside.
const settle = (value) => (value && typeof value.exec === 'function' ? value.exec() : value);

// `organisation` is the Organisation document (or a plain object with _id, status and settings).
const runInOrganisation = (organisation, fn) =>
  storage.run({ organisationId: organisation._id, organisation }, () => Promise.resolve(settle(fn())));

const runAsPlatform = (fn) => storage.run({ allTenants: true }, () => Promise.resolve(settle(fn())));

const currentStore = () => storage.getStore() ?? testFallback;
const currentOrganisationId = () => currentStore()?.organisationId || null;
const currentOrganisation = () => currentStore()?.organisation || null;

// Scripts and tests only: sets the context for the rest of the current async flow.
const enterForTests = (store) => storage.enterWith(store);

// Test suite only: lets test files read and write the database directly as one organisation,
// without wrapping every line. Requests still get their own context from protect. Refused
// outside NODE_ENV=test, so it can never weaken isolation in a running server.
const setTestFallback = (organisation) => {
  if (process.env.NODE_ENV !== 'test') throw new Error('setTestFallback() is for the test suite only');
  testFallback = organisation ? { organisationId: organisation._id, organisation } : undefined;
};

module.exports = {
  runInOrganisation,
  runAsPlatform,
  currentStore,
  currentOrganisationId,
  currentOrganisation,
  enterForTests,
  setTestFallback,
};
