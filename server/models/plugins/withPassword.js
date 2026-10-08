// Password handling shared by organisation users and platform admins, so both are protected the
// same way: bcrypt hash on save, never selected by default, and token revocation on change.
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

function withPassword(schema) {
  schema.add({
    // The bcrypt hash. Never returned by queries unless asked for with .select('+password').
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    // When the password last changed. Tokens issued before this are rejected, which signs out
    // every other session.
    passwordChangedAt: {
      type: Date,
      select: false,
    },
  });

  // Hash on create and whenever the password changes, never on other updates. Only covers
  // save()/create(); updateOne/findOneAndUpdate would bypass this, so never set passwords that way.
  schema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    // A second earlier, so the token issued with the new password (whole seconds) still counts.
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  });

  // True if a token issued at `issuedAt` (seconds) predates the latest password change.
  schema.methods.changedPasswordAfter = function changedPasswordAfter(issuedAt) {
    return Boolean(this.passwordChangedAt) && issuedAt < Math.floor(this.passwordChangedAt.getTime() / 1000);
  };

  // Requires the document to have been loaded with .select('+password').
  schema.methods.comparePassword = function comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password);
  };
}

module.exports = withPassword;
