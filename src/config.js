require('dotenv').config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  BOT_USERNAME: process.env.BOT_USERNAME || 'botbanacc69_bot',
  BANK_CODE: process.env.BANK_CODE || 'VCB',
  BANK_ACCOUNT: process.env.BANK_ACCOUNT || '9923678668',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || 'TRAN ANH VIET',
  ADMIN_ID: process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID, 10) : 5206263099,
  TEST_MODE: process.env.TEST_MODE === 'true',
  ORDER_HOLD_MINUTES: parseInt(process.env.ORDER_HOLD_MINUTES || '10', 10),
  SUPPORT_CONTACT: '@botbanacc69_bot'
};
