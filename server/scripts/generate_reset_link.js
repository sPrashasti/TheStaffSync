require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const { runAsPlatform } = require('../utils/tenantContext');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function generateLink(email) {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await runAsPlatform(() => User.findOne({ email, isActive: true }));
  if (!user) {
    console.log(`User ${email} not found!`);
    await mongoose.disconnect();
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateModifiedOnly: true });

  const appUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
  const link = `${appUrl}/reset-password?token=${token}`;
  console.log(`\n==================================================`);
  console.log(`Direct Password Reset Link for ${email}:`);
  console.log(link);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
}

const target = process.argv[2] || 'sprashasti.10@gmail.com';
generateLink(target);
