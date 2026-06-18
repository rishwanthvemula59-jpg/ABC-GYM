import twilio from 'twilio';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || '';

let client = null;

const hasValidCreds = 
  accountSid && 
  accountSid.startsWith('AC') && 
  accountSid !== 'ACxxxxxxxxxxxxxxxxxxxx' && 
  authToken && 
  authToken !== 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx';

if (hasValidCreds) {
  try {
    client = twilio(accountSid, authToken);
    logger.info('🚀 Twilio client initialized successfully.');
  } catch (error) {
    logger.error('❌ Failed to initialize Twilio client:', error);
  }
} else {
  logger.warn('⚠️ Twilio credentials not fully configured in .env. Falling back to logger mock mode.');
}

/**
 * Send an SMS or WhatsApp message
 * @param {string} to - The recipient phone number
 * @param {string} body - The message content
 * @returns {Promise<boolean>}
 */
export async function sendSMS(to, body) {
  // Clean phone number format
  let cleanTo = to.trim();
  if (!cleanTo.startsWith('+') && !cleanTo.startsWith('whatsapp:')) {
    if (cleanTo.length === 10) {
      cleanTo = `+91${cleanTo}`;
    } else {
      cleanTo = `+${cleanTo}`;
    }
  }

  if (!client) {
    logger.info(`📱 [Twilio Mock Send] to: ${cleanTo}, body: "${body}"`);
    return true;
  }

  try {
    const isWhatsApp = twilioNumber.startsWith('whatsapp:');
    const fromNum = isWhatsApp ? twilioNumber : (twilioNumber.startsWith('+') ? twilioNumber : `+${twilioNumber}`);
    const toNum = isWhatsApp && !cleanTo.startsWith('whatsapp:') ? `whatsapp:${cleanTo}` : cleanTo;

    const message = await client.messages.create({
      body,
      from: fromNum,
      to: toNum
    });

    logger.info(`✅ [Twilio Success] Message SID: ${message.sid}`);
    return true;
  } catch (error) {
    logger.error('❌ Twilio message send failed:', error.message);
    return false;
  }
}
