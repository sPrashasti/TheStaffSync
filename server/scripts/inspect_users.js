require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const User = require('../models/User');
const Organisation = require('../models/Organisation');
const { runAsPlatform } = require('../utils/tenantContext');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const u1 = await runAsPlatform(() => User.findOne({ email: 'sprashasti.10@gmail.com' }));
  console.log('User sprashasti.10@gmail.com:', u1);
  if (u1) {
    const org = await runAsPlatform(() => Organisation.findById(u1.organisationId));
    console.log('Organisation:', org);
  }

  const u2 = await runAsPlatform(() => User.findOne({ email: 'developerogkit@gmail.com' }));
  console.log('\nUser developerogkit@gmail.com:', u2);
  if (u2) {
    const org2 = await runAsPlatform(() => Organisation.findById(u2.organisationId));
    console.log('Organisation 2:', org2);
  }

  await mongoose.disconnect();
}

inspect();
