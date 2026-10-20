require('dotenv').config();
const nodemailer = require('nodemailer');

async function testBrevo() {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true,
    logger: true,
  });

  console.log('Verifying SMTP connection...');
  await transport.verify();
  console.log('SMTP connection verified successfully!');

  console.log('\nSending test email...');
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: 'sprashasti.10@gmail.com',
    subject: 'StaffSync Brevo Debug Test',
    text: 'Test body',
  });

  console.log('\n--- Send Result ---');
  console.log('Message ID:', info.messageId);
  console.log('Accepted:', info.accepted);
  console.log('Rejected:', info.rejected);
  console.log('Response:', info.response);
  console.log('Envelope:', info.envelope);
}

testBrevo().catch(err => {
  console.error('\nERROR SENDING VIA BREVO:');
  console.error(err);
});
