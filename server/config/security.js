// Security middleware in one place: headers, caching, repeated-parameter rejection and rate
// limits. Limits are read from the environment when the app starts, so tests and deployments can
// tune them without code changes.
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AppError = require('../utils/AppError');

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Standard hardening headers. The API only ever returns JSON, so its own CSP allows nothing.
const securityHeaders = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
});

// API responses contain personal data; browsers and proxies must not keep copies.
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

// ?status=pending&status=approved would reach the database as a list and slip past validation
// written for single values, so a repeated query parameter is refused outright.
const rejectRepeatedQuery = (req, res, next) => {
  const repeated = Object.keys(req.query).filter((key) => Array.isArray(req.query[key]));
  if (repeated.length > 0) {
    return next(new AppError('Each query parameter may only appear once', 400,
      repeated.map((field) => ({ field, message: 'Repeated parameter' }))));
  }
  return next();
};

const minutes = (ms) => Math.ceil(ms / 60000);

// Rate-limit responses use the same JSON envelope as every other error.
const limitHandler = (message) => (req, res, next, options) =>
  next(new AppError(`${message} Try again in ${minutes(options.windowMs)} minutes.`, 429));

const limiter = ({ windowMinutes, limit, message, ...rest }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitHandler(message),
    ...rest,
  });

const createLimiters = () => {
  const windowMinutes = numberFromEnv('RATE_LIMIT_WINDOW_MINUTES', 15);
  return {
    // Every request, per client address: stops floods without affecting normal use.
    api: limiter({
      windowMinutes,
      limit: numberFromEnv('RATE_LIMIT_MAX_REQUESTS', 1000),
      message: 'Too many requests.',
    }),
    // Failed logins per account and address. Successful logins are not counted, so a user who
    // gets their password right is never locked out by earlier typos.
    login: limiter({
      windowMinutes,
      limit: numberFromEnv('LOGIN_MAX_FAILURES', 5),
      message: 'Too many failed login attempts.',
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').trim().toLowerCase()}`,
    }),
    // New accounts per address.
    register: limiter({
      windowMinutes: 60,
      // Strict in production; looser elsewhere so repeated test runs are not blocked.
      limit: numberFromEnv('REGISTER_MAX_PER_HOUR', process.env.NODE_ENV === 'production' ? 10 : 100),
      message: 'Too many accounts created from this address.',
    }),
    // Reset emails per address and email, so the feature cannot be used to flood an inbox.
    // Every request counts, because the response is the same whether or not the account exists.
    forgotPassword: limiter({
      windowMinutes: 60,
      limit: numberFromEnv('FORGOT_PASSWORD_MAX_PER_HOUR', 5),
      message: 'Too many password reset requests.',
      keyGenerator: (req) => `forgot|${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').trim().toLowerCase()}`,
    }),
    // Attempts to use reset links, per address: tokens are unguessable, but there is no reason to
    // allow unlimited tries.
    resetPassword: limiter({
      windowMinutes,
      limit: numberFromEnv('RESET_PASSWORD_MAX_ATTEMPTS', 10),
      message: 'Too many password reset attempts.',
    }),
    // Wrong current passwords when changing password, per account.
    passwordChange: limiter({
      windowMinutes,
      limit: numberFromEnv('LOGIN_MAX_FAILURES', 5),
      message: 'Too many failed password changes.',
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `pw|${req.user?._id || ipKeyGenerator(req.ip)}`,
    }),
  };
};

// Settings that are only dangerous in production; checked at start-up.
const assertProductionConfig = (allowedOrigins) => {
  if (process.env.NODE_ENV !== 'production') return;
  if (allowedOrigins.length === 0) {
    throw new Error('CLIENT_URL must list the frontend origin(s) in production.');
  }
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP is not configured: "Forgot password" will reply that email reset is unavailable.');
  }
};

// Number of proxies in front of the app (e.g. 1 behind a hosting provider's load balancer), so
// rate limits see the real client address. Off by default: trusting a proxy that is not there
// would let clients fake their address.
const trustProxySetting = () => {
  const value = process.env.TRUST_PROXY;
  if (!value || value === 'false') return false;
  if (value === 'true') return true;
  return Number.isInteger(Number(value)) ? Number(value) : value;
};

// Created once, on first use, after .env (or a test) has set the limits.
let limiters;
const getLimiters = () => {
  limiters = limiters || createLimiters();
  return limiters;
};

module.exports = {
  securityHeaders,
  noStore,
  rejectRepeatedQuery,
  getLimiters,
  assertProductionConfig,
  trustProxySetting,
};
