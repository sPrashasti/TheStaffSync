require('dotenv').config();
const nodemailer = require('nodemailer');

async function testCandidate(senderEmail) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log(`\nTesting send with FROM: "${senderEmail}"...`);
    const info = await transport.sendMail({
      from: `StaffSync <${senderEmail}>`,
      to: 'sprashasti.10@gmail.com',
      subject: `StaffSync Sender Test from ${senderEmail}`,
      text: `Hello! This is a test sending from ${senderEmail}. If you see this, this sender is working!`,
    });
    console.log(`SUCCESS for ${senderEmail}:`, info.response);
  } catch (err) {
    console.error(`FAILED for ${senderEmail}:`, err.message);
  }
}

async function run() {
  const candidates = [
    'sprashasti001@gmail.com',
    'developerogkit@gmail.com',
    'sprashasti.10@gmail.com'
  ];

  for (const c of candidates) {
    await testCandidate(c);
  }
}

run();
