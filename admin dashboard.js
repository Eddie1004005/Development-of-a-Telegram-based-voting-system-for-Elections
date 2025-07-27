const db = require("./database.js")

class AdminDashboard {
  constructor(bot) {
    this.bot = bot
  }

  // Show main admin dashboard
  showDashboard(chatId) {
    const adminMenu = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚙️ Election Settings", callback_data: "admin_election_settings" },
            { text: "👥 User Management", callback_data: "admin_user_management" },
          ],
          [
            { text: "🗳️ Candidate Management", callback_data: "admin_candidate_management" },
            { text: "📊 Results & Analytics", callback_data: "admin_results" },
          ],
          [
            { text: "📢 Campaign Management", callback_data: "admin_campaign" },
            { text: "👨‍💼 Admin Management", callback_data: "admin_management" },
          ],
          [
            { text: "🔐 Security Settings", callback_data: "admin_security" },
            { text: "📋 System Logs", callback_data: "admin_logs" },
          ],
        ],
      },
    }

    this.bot.sendMessage(chatId, "🏛️ **NACOS Election Admin Dashboard**\n\nSelect an option to manage:", {
      ...adminMenu,
      parse_mode: "Markdown",
    })
  }

  // Show election settings menu
  showElectionSettings(chatId) {
    const settingsMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📅 Set Election Date", callback_data: "set_election_date" }],
          [{ text: "⏰ Set Election Time", callback_data: "set_election_time" }],
          [{ text: "🕐 Set Voting Duration", callback_data: "set_voting_duration" }],
          [{ text: "📋 View Current Settings", callback_data: "view_election_settings" }],
          [{ text: "🔙 Back to Dashboard", callback_data: "admin_dashboard" }],
        ],
      },
    }

    this.bot.sendMessage(chatId, "⚙️ **Election Settings**\n\nManage election timing and configuration:", {
      ...settingsMenu,
      parse_mode: "Markdown",
    })
  }

  // Show user management menu
  showUserManagement(chatId) {
    const userMenu = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "👥 List All Users", callback_data: "list_all_users" },
            { text: "🔍 Search User", callback_data: "search_user" },
          ],
          [
            { text: "❌ Remove User", callback_data: "remove_user_menu" },
            { text: "✅ Verify User", callback_data: "verify_user_menu" },
          ],
          [
            { text: "📊 User Statistics", callback_data: "user_statistics" },
            { text: "📋 Export Users", callback_data: "export_users" },
          ],
          [{ text: "🔙 Back to Dashboard", callback_data: "admin_dashboard" }],
        ],
      },
    }

    this.bot.sendMessage(chatId, "👥 **User Management**\n\nManage registered users:", {
      ...userMenu,
      parse_mode: "Markdown",
    })
  }

  // Show date selection menu
  showDateSelection(chatId) {
    const now = new Date()
    const dates = []

    // Generate next 14 days
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split("T")[0]
      const displayDate = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      dates.push([{ text: displayDate, callback_data: `select_date_${dateStr}` }])
    }

    dates.push([{ text: "🔙 Back", callback_data: "admin_election_settings" }])

    const dateMenu = {
      reply_markup: {
        inline_keyboard: dates,
      },
    }

    this.bot.sendMessage(chatId, "📅 **Select Election Date**\n\nChoose from the available dates:", {
      ...dateMenu,
      parse_mode: "Markdown",
    })
  }

  // Show time selection menu
  showTimeSelection(chatId, selectedDate = null) {
    const times = [
      ["08:00", "09:00", "10:00"],
      ["11:00", "12:00", "13:00"],
      ["14:00", "15:00", "16:00"],
      ["17:00", "18:00", "19:00"],
    ]

    const timeButtons = times.map((row) =>
      row.map((time) => ({
        text: time,
        callback_data: selectedDate ? `select_time_${time}_${selectedDate}` : `select_start_time_${time}`,
      })),
    )

    timeButtons.push([{ text: "🔙 Back", callback_data: "admin_election_settings" }])

    const timeMenu = {
      reply_markup: {
        inline_keyboard: timeButtons,
      },
    }

    this.bot.sendMessage(chatId, "⏰ **Select Election Time**\n\nChoose the starting time:", {
      ...timeMenu,
      parse_mode: "Markdown",
    })
  }

  // Set election period
  setElectionPeriod(startDate, startTime, durationHours = 8) {
    return new Promise((resolve, reject) => {
      const startDateTime = new Date(`${startDate}T${startTime}:00.000Z`)
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000)

      db.run(
        "INSERT OR REPLACE INTO voting_period (id, start_date, end_date) VALUES (1, ?, ?)",
        [startDateTime.toISOString(), endDateTime.toISOString()],
        (err) => {
          if (err) reject(err)
          else resolve({ startDateTime, endDateTime })
        },
      )
    })
  }

  // Get current election settings
  getCurrentSettings() {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM voting_period WHERE id = 1", [], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  // Get user statistics
  getUserStatistics() {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users,
          COUNT(DISTINCT level) as unique_levels
        FROM Users
      `,
        [],
        (err, row) => {
          if (err) reject(err)
          else resolve(row[0])
        },
      )
    })
  }

  // Remove user
  removeUser(telegramId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Delete related records first
        db.run("DELETE FROM votes WHERE voter_telegram_id = ?", [telegramId])
        db.run("DELETE FROM candidates WHERE telegram_id = ?", [telegramId])
        db.run("DELETE FROM otps WHERE telegram_id = ?", [telegramId])
        db.run("DELETE FROM admin_otps WHERE telegram_id = ?", [telegramId])
        db.run("DELETE FROM candidate_otps WHERE telegram_id = ?", [telegramId])
        db.run("DELETE FROM User_states WHERE telegram_id = ?", [telegramId])

        // Finally delete user
        db.run("DELETE FROM Users WHERE telegram_id = ?", [telegramId], function (err) {
          if (err) reject(err)
          else resolve(this.changes > 0)
        })
      })
    })
  }

  // Add admin
  addAdmin(telegramId) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE Users SET is_admin = 1 WHERE telegram_id = ?", [telegramId], function (err) {
        if (err) reject(err)
        else resolve(this.changes > 0)
      })
    })
  }

  // Remove admin
  removeAdmin(telegramId, currentAdminId) {
    return new Promise((resolve, reject) => {
      // Prevent removing the main admin
      if (telegramId === currentAdminId) {
        reject(new Error("Cannot remove yourself as admin"))
        return
      }

      db.run("UPDATE Users SET is_admin = 0 WHERE telegram_id = ?", [telegramId], function (err) {
        if (err) reject(err)
        else resolve(this.changes > 0)
      })
    })
  }
}

module.exports = AdminDashboard
