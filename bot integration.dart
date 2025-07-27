// Example of how to integrate the enhanced validation into your bot.js

const enhancedValidation = require("./enhanced-bot-validation")

// Replace the existing validation in your bot.js registration flow
// In the matric validation section of your message handler:

// Assuming 'text', 'bot', 'chatId', and 'db' are defined elsewhere in your bot's message handler
// For example:
// const text = message.text;
// const chatId = message.chat.id;
// const bot = new TelegramBot(token, { polling: true });
// const db = new sqlite3.Database('./database.db');

// OLD CODE (replace this):
/*
if (!isValidMatric(text)) {
  bot.sendMessage(
    chatId,
    "❌ Invalid matric number format.\n\nPlease enter a valid matric number (must start with cg or ch)."
  );
  return;
}
*/

// NEW CODE (use this instead):
const matricValidation = enhancedValidation.validateMatricWithDetails(text)

if (!matricValidation.isValid) {
  bot.sendMessage(chatId, matricValidation.message)
  return;
}

if (!matricValidation.isNacosMember) {
  // Log non-NACOS member attempt
  console.log(`Non-NACOS member registration attempt: ${text} from user ${chatId}`)

  bot.sendMessage(
    chatId,
    matricValidation.message + "\n\n" + "📞 If you believe this is an error, please contact the admin.",
  )
  return;
}

// If validation passes, continue with registration
console.log(`Valid NACOS member: ${matricValidation.details.departmentName} student`)

// Continue with existing registration logic...
db.get("SELECT matric_no FROM Users WHERE matric_no = ? AND telegram_id != ?", [text, chatId], (err, row) => {
  // ... rest of your existing code
})
