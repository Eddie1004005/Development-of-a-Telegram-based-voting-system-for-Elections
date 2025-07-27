// Enhanced candidate application validation

// In your candidate application callback (apply_candidate):
// Replace the existing validation with this enhanced version:

const { enhancedValidation } = require("./validation") // Import enhancedValidation
const { validPositions } = require("./positions") // Import validPositions

const enhanceCandidateApplication = (chatId, bot, db) => {
  db.get("SELECT * FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
    if (err) {
      console.error("Database error:", err.message)
      bot.sendMessage(chatId, "An error occurred. Please try again later.")
      return
    }

    if (!row || !row.is_verified) {
      bot.sendMessage(chatId, "❌ You must be registered and verified first.\n\nUse /register to get started.")
      return
    }

    // Enhanced validation using the new system
    const eligibilityCheck = enhancedValidation.canApplyForPosition(
      row.matric_no,
      "General", // We'll check specific position later
      row.level,
    )

    if (!eligibilityCheck.canApply) {
      bot.sendMessage(chatId, eligibilityCheck.reason)
      return
    }

    // Check if already applied
    db.get("SELECT candidate_id FROM candidates WHERE telegram_id = ?", [chatId], (err, candidateRow) => {
      if (err) {
        console.error("Database error:", err.message)
        bot.sendMessage(chatId, "An error occurred. Please try again later.")
        return
      }

      if (candidateRow) {
        bot.sendMessage(chatId, "📝 You have already applied as a candidate.\n\nPlease wait for admin approval.")
        return
      }

      // Show success message with department info
      const welcomeMessage =
        `🎯 **Candidate Application** 🎯\n\n` +
        `✅ You are eligible to apply as a NACOS candidate!\n\n` +
        `👤 **Your Details:**\n` +
        `🏫 Department: ${eligibilityCheck.department}\n` +
        `🎓 Level: ${row.level}\n` +
        `📧 Email: ${row.email}\n\n` +
        `Select the position you want to run for:`

      // Show position selection menu
      const eligiblePositions = validPositions.filter(
        (pos) => enhancedValidation.canApplyForPosition(row.matric_no, pos, row.level).canApply,
      )

      if (!eligiblePositions.length) {
        bot.sendMessage(chatId, "❌ No positions available for your level.")
        return
      }

      const keyboard = eligiblePositions.map((pos) => [{ text: pos, callback_data: `select_position_${pos}` }])

      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown",
      })
    })
  })
}

module.exports = { enhanceCandidateApplication }
