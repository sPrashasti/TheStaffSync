require('dotenv').config();
const https = require('https');

function getBrevo(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3' + path,
      method: 'GET',
      headers: {
        'api-key': process.env.SMTP_PASS,
        'accept': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Checking Brevo account details...');
  const account = await getBrevo('/account');
  console.log('Account Status:', account.status);
  console.log('Account Info:', JSON.stringify(account.body, null, 2));

  console.log('\nChecking Brevo verified senders...');
  const senders = await getBrevo('/senders');
  console.log('Senders Status:', senders.status);
  console.log('Senders:', JSON.stringify(senders.body, null, 2));

  console.log('\nChecking Brevo transactional email logs...');
  const events = await getBrevo('/smtp/statistics/events?limit=10');
  console.log('Events Status:', events.status);
  console.log('Events:', JSON.stringify(events.body, null, 2));
}

main().catch(console.error);
