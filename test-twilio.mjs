import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config({ path: '.env' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;
const toPhone = '+919860952918'; // The user's phone number

const client = twilio(accountSid, authToken);

async function testSMS() {
  console.log(`Sending SMS from ${fromPhone} to ${toPhone}...`);
  try {
    const message = await client.messages.create({
      body: 'MedRemind Twilio Test SMS',
      from: fromPhone,
      to: toPhone
    });
    console.log('SUCCESS! Message SID:', message.sid);
  } catch (error) {
    console.error('TWILIO ERROR:', error.message);
    console.error('ERROR CODE:', error.code);
  }
}

testSMS();
