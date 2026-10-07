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

// The payload holds only the user id. Role and active status are read from the
// database on every request, so changes take effect without waiting for the token to expire.
const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Pinning the algorithm stops a token that claims a different one (e.g. "none") from being accepted.
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });

module.exports = { assertJwtConfig, signToken, verifyToken };
