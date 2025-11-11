const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

/**
 * Send OTP via SMS using Twilio
 * @param {string} to - Recipient's phone number (E.164 format)
 * @param {string} otp - The OTP to send
 * @returns {Promise<Object>} - Result of the SMS sending operation
 */
const sendOtpViaSms = async (to, otp) => {
  try {
    // In development, log the OTP instead of sending SMS
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${to}: ${otp}`);
      return { success: true, message: 'OTP logged in development mode' };
    }

    // In production, send actual SMS
    const message = await client.messages.create({
      body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
      from: twilioPhoneNumber,
      to: `+91${to}` // Assuming Indian numbers, adjust country code if needed
    });

    console.log('SMS sent:', message.sid);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { 
      success: false, 
      message: 'Failed to send OTP',
      error: error.message 
    };
  }
};

/**
 * Format phone number to E.164 format (Twilio's required format)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  
  // Check if the number starts with a country code, if not add +91 (India)
  if (cleaned.startsWith('+')) {
    return cleaned;
  } else if (cleaned.startsWith('91') && cleaned.length >= 12) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    return `+91${cleaned}`; // India country code
  }
  
  // If we can't format it properly, return as is and let Twilio handle the error
  return `+${cleaned}`;
};

module.exports = {
  sendOtpViaSms,
  formatPhoneNumber
};
