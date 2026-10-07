// Mirrors the server's password policy (server/utils/passwordPolicy.js) for instant feedback.
// The server still checks every password; this only saves a round trip.
export const passwordProblem = (password) => {
  if (password.length < 8) return 'At least 8 characters';
  if (new TextEncoder().encode(password).length > 72) return 'At most 72 bytes';
  if (!/[A-Za-z]/.test(password)) return 'Must contain a letter';
  if (!/\d/.test(password)) return 'Must contain a number';
  return '';
};
