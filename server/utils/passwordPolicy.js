// One password policy for every place a password is set: organisation sign-up,
// HR-created accounts, platform admins and the seed script.

// bcrypt ignores everything after 72 bytes, so longer passwords would be silently truncated.
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

// Returns the first rule the password breaks, or null if it is acceptable.
const passwordProblem = (password) => {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`;
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter';
  if (!/\d/.test(password)) return 'Password must contain a number';
  return null;
};

module.exports = { passwordProblem, MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH };
