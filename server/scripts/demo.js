// The public demo organisation (Phase 20). Platform-level: only this script can turn it on.
//
//   npm run demo:setup -- --organisation "DemoTech Solutions" \
//        --hr hr@staffsync.demo --manager manager@staffsync.demo --employee employee1@staffsync.demo
//       Makes that organisation the demo, sets the three one-click sign-in accounts, and takes the
//       baseline the nightly reset returns to. Run it again to take a new baseline.
//   npm run demo:reset     put the demo back to its baseline now (otherwise 03:00 nightly)
//   npm run demo:status    show the demo organisation and when it was last reset
//   npm run demo:disable   turn the demo off (data and baseline are kept)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { Organisation } = require('../models');
const demo = require('../services/demoService');

const option = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : (process.argv[index + 1] || '').trim() || undefined;
};
const command = process.argv[2];

const run = async () => {
  const log = console.log;
  console.log = () => {};
  await connectDB();
  console.log = log;
  console.log(`Database: ${mongoose.connection.name}`);

  if (command === 'setup') {
    const name = option('--organisation');
    if (!name) throw new Error('Say which organisation: --organisation "Company name"');
    const organisation = await Organisation.findOne({ name });
    if (!organisation) throw new Error(`No organisation called "${name}".`);
    const accounts = { hr: option('--hr'), manager: option('--manager'), employee: option('--employee') };
    const counts = await demo.setupDemo(organisation, accounts);
    console.log(`${organisation.name} is now the public demo.`);
    console.log(`One-click accounts: HR ${accounts.hr}, manager ${accounts.manager}, employee ${accounts.employee}`);
    console.log('Baseline taken (the nightly reset returns to exactly this):');
    Object.entries(counts).forEach(([collection, n]) => console.log(`  ${collection.padEnd(16)} ${n}`));
    return;
  }

  const organisation = await demo.findDemoOrganisation();
  if (!organisation) {
    console.log('No demo organisation is set up. Use npm run demo:setup.');
    return;
  }
  if (command === 'reset') {
    const summary = await demo.resetDemo(organisation);
    console.log(`${organisation.name} reset to its baseline:`);
    Object.entries(summary).forEach(([collection, { removed, restored }]) => console.log(`  ${collection.padEnd(16)} ${removed} removed, ${restored} restored`));
  } else if (command === 'disable') {
    await Organisation.updateOne({ _id: organisation._id }, { $set: { 'demo.enabled': false } });
    console.log(`${organisation.name} is no longer the demo. Its data and baseline are unchanged.`);
  } else {
    const fmt = (d) => (d ? d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—');
    console.log(`Demo organisation: ${organisation.name}`);
    console.log(`Baseline taken:    ${fmt(organisation.demo.baselineAt)}`);
    console.log(`Last reset:        ${fmt(organisation.demo.lastResetAt)}`);
    console.log(`Reset due now:     ${demo.isResetDue(organisation) ? 'yes' : 'no'} (nightly at 03:00 ${organisation.settings.timeZone})`);
  }
};

run()
  .catch((err) => {
    console.error(`Demo command failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.readyState !== 0 && disconnectDB());
