// Password reset by email: create a single-use token, email a link, and check the token when
// it comes back.
const crypto = require('crypto');
const User = require('../models/User');
const { runAsPlatform } = require('../utils/tenantContext');
const { sendMail } = require('../utils/mailer');

const tokenMinutes = () => Number(process.env.RESET_TOKEN_MINUTES) || 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Names come from user input, so they are escaped before going into the HTML email.
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Where the frontend lives: APP_URL, the first CLIENT_URL origin, or Render's public address.
const appUrl = () => {
  const configured = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',')[0] || process.env.RENDER_EXTERNAL_URL;
  return (configured || 'http://localhost:5173').trim().replace(/\/$/, '');
};

const resetEmail = (name, link, minutes) => {
  const safeName = escapeHtml(name);
  return {
    subject: 'Reset your StaffSync password',
    text: [
      `Hello ${name},`,
      '',
      'We received a request to reset your StaffSync password. Use this link to choose a new one:',
      '',
      link,
      '',
      `The link works once and expires in ${minutes} minutes.`,
      '',
      'If you did not ask for this, you can ignore this email; your password will not change.',
      '',
      'StaffSync',
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#211E1A;background:#FBF8F2;border:1px solid #E9DECD;border-radius:12px">
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:22px;margin:0 0 16px">Reset your password</h1>
        <p>Hello ${safeName},</p>
        <p>We received a request to reset your StaffSync password. Choose a new one here:</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#102C4A;color:#F7F2E8;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
        <p style="color:#5E574D;font-size:14px">The link works once and expires in ${minutes} minutes. If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${link}</span></p>
        <p style="color:#5E574D;font-size:14px">If you did not ask for this, ignore this email; your password will not change.</p>
      </div>`,
  };
};

// Issues a new token (replacing any earlier one) and emails the link. Does nothing for unknown or
// deactivated accounts; the caller's response is the same either way.
// Platform-level, like login: the person is not signed in, so no organisation is known yet.
const requestReset = (email) => runAsPlatform(async () => {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return false;

  const token = crypto.randomBytes(32).toString('hex');
  const minutes = tokenMinutes();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + minutes * 60 * 1000);
  await user.save({ validateModifiedOnly: true });

  const link = `${appUrl()}/reset-password?token=${token}`;
  await sendMail({ to: user.email, ...resetEmail(user.name, link, minutes) });
  return true;
});

// Sets a new password if the token is valid, unexpired and unused. Returns false otherwise.
// Saving the password also records passwordChangedAt, which signs out every existing session.
const resetPassword = (token, newPassword) => runAsPlatform(async () => {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  }).select('+passwordResetTokenHash +passwordResetExpires');
  if (!user) return false;

  user.password = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return true;
});

module.exports = { requestReset, resetPassword, hashToken };
