const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const MIN_SECRET_LENGTH = 32;

// Called once at startup so a missing or weak secret stops the server instead of
// failing on the first login.
const assertJwtConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_long_random_secret') {
    throw new Error('JWT_SECRET is not set. Add it to server/.env (see .env.example).');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
};

// Which kind of account a token belongs to. Organisation users and platform admins live in
// different collections, and each API accepts only its own kind (see authMiddleware).
const SCOPES = { org: 'org', platform: 'platform' };

// The payload holds only the account id and its kind. Role, organisation and active status are
// read from the database on every request, so changes take effect without waiting for the token
// to expire, and a token can never choose its organisation.
const signToken = (accountId, scope = SCOPES.org) => {
  if (!Object.values(SCOPES).includes(scope)) throw new Error(`Unknown token scope: ${scope}`);
  return jwt.sign({ id: String(accountId), scope }, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// Pinning the algorithm stops a token that claims a different one (e.g. "none") from being accepted.
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });

module.exports = { SCOPES, assertJwtConfig, signToken, verifyToken };
