require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const nodemailer = require("nodemailer")
const db = require("./database.js")

// Simple RSA encryption using Node.js crypto
const crypto = require("crypto")

class SimpleRSAEncryption {
  constructor() {
    // Generate RSA key pair for the election
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    })

    this.publicKey = publicKey
    this.privateKey = privateKey
  }

  // Encrypt vote data
  encryptVote(voteData) {
    try {
      const buffer = Buffer.from(JSON.stringify(voteData), "utf8")
      const encrypted = crypto.publicEncrypt(this.publicKey, buffer)
      return encrypted.toString("base64")
    } catch (error) {
      console.error("Encryption error:", error)
      return null
    }
  }

  // Decrypt vote data (for admin results)
  decryptVote(encryptedData) {
    try {
      const buffer = Buffer.from(encryptedData, "base64")
      const decrypted = crypto.privateDecrypt(this.privateKey, buffer)
      return JSON.parse(decrypted.toString("utf8"))
    } catch (error) {
      console.error("Decryption error:", error)
      return null
    }
  }
}

// Simple Campaign System
class SimpleCampaignSystem {
  constructor(bot) {
    this.bot = bot
    this.activeCampaign = null
    this.campaignGroups = [] // Add your group chat IDs here
  }

  // Start campaign for a candidate
  async startCampaign(candidateId, duration = 24) {
    try {
      if (this.activeCampaign) {
        return { success: false, message: "Another campaign is currently active." }
      }

      // Get candidate details
      const candidate = await this.getCandidateById(candidateId)
      if (!candidate || !candidate.is_approved) {
        return { success: false, message: "Candidate not found or not approved." }
      }

      this.activeCampaign = {
        candidateId,
        candidate,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 60 * 60 * 1000),
        duration,
      }

      // Set timer to end campaign
      setTimeout(
        () => {
          this.endCampaign()
        },
        duration * 60 * 60 * 1000,
      )

      return { success: true, message: `Campaign started for ${candidate.name}` }
    } catch (error) {
      console.error("Campaign start error:", error)
      return { success: false, message: "Failed to start campaign." }
    }
  }

  // End active campaign
  endCampaign() {
    if (this.activeCampaign) {
      const candidate = this.activeCampaign.candidate
      this.bot.sendMessage(
        candidate.telegram_id,
        `📢 Your campaign period has ended.\n\nThank you for participating in the NACOS election!`,
      )
      this.activeCampaign = null
    }
  }

  // Get candidate by ID
  getCandidateById(candidateId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM candidates WHERE candidate_id = ?", [candidateId], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  // Get campaign status
  getCampaignStatus() {
    if (!this.activeCampaign) {
      return "No active campaign"
    }

    const now = new Date()
    const remaining = Math.max(0, this.activeCampaign.endTime - now)
    const hoursRemaining = Math.floor(remaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    return `Active: ${this.activeCampaign.candidate.name} - ${hoursRemaining}h ${minutesRemaining}m remaining`
  }
}

// Simple Admin Dashboard
class SimpleAdminDashboard {
  constructor(bot) {
    this.bot = bot
  }

  // Show main admin dashboard
  showDashboard(chatId) {
    const adminMenu = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⚡ Quick Set Voting", callback_data: "quick_set_voting" }],
          [{ text: "🗑️ Clear Voting Period", callback_data: "clear_voting_period" }],
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
          [{ text: "📋 View Current Settings", callback_data: "view_election_settings" }],
          [{ text: "🔙 Back to Dashboard", callback_data: "back_to_dashboard" }],
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
            { text: "📊 User Statistics", callback_data: "user_statistics" },
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

    // Add today as first option
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    const todayDisplay =
      "Today (" +
      today.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      ")"
    dates.push([{ text: todayDisplay, callback_data: `select_date_${todayStr}` }])

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

  // Get user statistics
  getUserStatistics() {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_users
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

  // Get current election settings
  getCurrentSettings() {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM voting_period WHERE id = 1", [], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }
}

// Initialize bot with increased polling timeout
const token = process.env.BOT_TOKEN
if (!token) {
  console.error("BOT_TOKEN not set in environment variables.")
  process.exit(1)
}
const bot = new TelegramBot(token, { polling: { interval: 1000, timeout: 20 } })

// Initialize encryption, campaign system and admin dashboard
const rsaEncryption = new SimpleRSAEncryption()
const campaignSystem = new SimpleCampaignSystem(bot)
const adminDashboard = new SimpleAdminDashboard(bot)

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Admin Telegram ID
const ADMIN_TELEGRAM_ID = "5045527889"

// Helper function to check if user is an admin
const isAdmin = (chatId, callback) => {
  // First check if it's the main admin telegram ID
  if (chatId.toString() === ADMIN_TELEGRAM_ID) {
    callback(null, true)
    return
  }

  // Then check database for admin flag
  db.get("SELECT is_admin FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
    if (err) {
      console.error("Database error in isAdmin:", err.message)
      callback(err, false)
      return
    }
    callback(null, row && row.is_admin === 1)
  })
}

// Input validation functions
const isValidMatric = (matric) => {
  const regex = /^\d{2}(cg|ch)\d{6}$/i
  return regex.test(matric)
}
const isValidEmail = (email) => {
  const emailLower = email.toLowerCase()
  const domain = "@stu.cu.edu.ng"
  if (!emailLower.endsWith(domain)) return false
  const localPart = emailLower.slice(0, -domain.length)
  const format1 = /^[a-z]+.[a-z]+$/.test(localPart)
  const format2 = /^[a-z][a-z]+.\d{6}$/.test(localPart)
  return format1 || format2
}
const isValidLevel = (level) => /^\d+$/.test(level) && Number.parseInt(level) >= 100 && Number.parseInt(level) <= 400
const isValidCandidateLevel = (level) =>
  /^\d+$/.test(level) && Number.parseInt(level) >= 200 && Number.parseInt(level) <= 400
const isValidPositionForLevel = (position, level) => {
  const restrictedPositions = ["President", "Vice President"]
  return !restrictedPositions.includes(position) || level >= 300
}
const isValidManifesto = (manifesto) => manifesto.length <= 500

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

// Send OTP via email
const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "NACOSPollBuddy OTP Verification",
    text: `Your OTP for NACOSPollBuddy is: ${otp}. It expires in 5 minutes. Simply reply with this 6-digit code to verify.`,
  }
  try {
    await transporter.sendMail(mailOptions)
    console.log(`OTP ${otp} sent successfully to ${email}`)
    return true
  } catch (error) {
    console.error(`Error sending OTP to ${email}:`, error.message)
    return false
  }
}

// Pre-determined list of positions
const validPositions = [
  "President",
  "Vice President",
  "General Secretary",
  "Assistant General Secretary",
  "Financial Secretary",
  "Treasurer",
  "Public Relations Officer (PRO)",
  "Director of Socials",
  "Director of Sports",
  "Director of Programs",
  "Welfare Director",
  "Technical/IT Director",
  "Auditor",
  "Legal Adviser",
]

// Enhanced main menu
const showMainMenu = (chatId) => {
  // Check if user is a candidate
  db.get("SELECT candidate_id FROM candidates WHERE telegram_id = ?", [chatId], (err, candidate) => {
    const mainMenuButtons = [
      [{ text: "🗳️ View Candidates", callback_data: "view_candidates" }],
      [{ text: "✅ Vote Now", callback_data: "vote" }],
      [{ text: "🎯 Apply as Candidate", callback_data: "apply_candidate" }],
    ]

    // Add candidate profile option if user is a candidate
    if (candidate) {
      mainMenuButtons.splice(2, 0, [{ text: "👤 My Profile", callback_data: "candidate_profile" }])
    }

    // Check if user is admin and add admin options
    isAdmin(chatId, (err, isUserAdmin) => {
      if (!err && isUserAdmin) {
        mainMenuButtons.push([{ text: "🏛️ Admin Dashboard", callback_data: "admin_dashboard" }])
        mainMenuButtons.push([{ text: "👨‍💼 My Admin Profile", callback_data: "admin_profile" }])
      }

      mainMenuButtons.push([{ text: "ℹ️ Help", callback_data: "help_menu" }])

      const mainMenu = {
        reply_markup: {
          inline_keyboard: mainMenuButtons,
        },
      }

      bot.sendMessage(
        chatId,
        "🏛️ **Welcome to NACOSPollBuddy!**\n\n" +
          "Choose an option below:\n" +
          "🗳️ **View Candidates** - See all approved candidates\n" +
          "✅ **Vote Now** - Cast your vote (during voting period)\n" +
          (candidate ? "👤 **My Profile** - Manage your candidate profile\n" : "") +
          "🎯 **Apply as Candidate** - Run for a position\n" +
          (isUserAdmin ? "🏛️ **Admin Dashboard** - Manage elections\n" : "") +
          (isUserAdmin ? "👨‍💼 **My Admin Profile** - View admin details\n" : "") +
          "ℹ️ **Help** - Get assistance",
        { ...mainMenu, parse_mode: "Markdown" },
      )
    })
  })
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

  // Check if user is already registered
  db.get("SELECT telegram_id, is_verified FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
    if (err) {
      console.error("Database error:", err.message)
      bot.sendMessage(chatId, "An error occurred. Please try again later.")
      return
    }

    if (row && row.is_verified) {
      bot.sendMessage(
        chatId,
        `Welcome back to NACOSPollBuddy, ${username}! 🎉\n\n` +
          "You're already registered and verified. Choose an option below:",
      )
      showMainMenu(chatId)
    } else {
      bot.sendMessage(
        chatId,
        `Welcome to NACOSPollBuddy, ${username}! 🎉\n\n` +
          "Your friendly assistant for the NACOS elections.\n" +
          "Let's get you registered first!\n\n" +
          "Use /register to begin your registration process.",
      )
    }
  })
})

// Handle /register command
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id
  db.get("SELECT telegram_id, is_verified FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
    if (err) {
      console.error("Database error in /register:", err.message)
      bot.sendMessage(chatId, "An error occurred. Please try again later.")
      return
    }
    if (row && row.is_verified) {
      bot.sendMessage(chatId, "✅ You are already registered and verified!")
      showMainMenu(chatId)
      return
    }

    // Start registration process
    db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId], (err) => {
      if (err) {
        console.error("Database error clearing User_states:", err.message)
      }

      // Create or update temporary user record
      db.run(
        "INSERT OR REPLACE INTO Users (telegram_id, name, email, matric_no, level, is_verified, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [chatId, "temp_name", `temp_${chatId}@temp.com`, `temp${chatId}`, 100, 0, 0],
        (err) => {
          if (err) {
            console.error("Database error creating temp user:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }

          db.run(
            "INSERT OR REPLACE INTO User_states (telegram_id, state) VALUES (?, ?)",
            [chatId, JSON.stringify({ step: "name" })],
            (err) => {
              if (err) {
                console.error("Database error inserting User_states:", err.message)
                bot.sendMessage(chatId, "Registration failed. Please try again.")
                return
              }
              bot.sendMessage(chatId, "📝 Let's start your registration!\n\nPlease enter your *full name*:", {
                parse_mode: "Markdown",
              })
            },
          )
        },
      )
    })
  })
})

// Handle /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id
  isAdmin(chatId, (err, isCallerAdmin) => {
    if (err) {
      bot.sendMessage(chatId, "An error occurred. Please try again later.")
      return
    }

    let helpMessage =
      "🆘 *NACOSPollBuddy Help*\n\n" +
      "*Available Commands:*\n" +
      "/start - Welcome message and main menu\n" +
      "/register - Register as a voter\n" +
      "/help - Show this help message\n\n" +
      "*How to use:*\n" +
      "1️⃣ Register with /register\n" +
      "2️⃣ Verify your email with the OTP sent\n" +
      "3️⃣ Use the menu to vote or apply as candidate\n\n" +
      "Need help? Contact the admin: @blessingasuquo"

    if (isCallerAdmin) {
      helpMessage +=
        "\n\n*Admin Commands:*\n" +
        "/list_users - List all registered users\n" +
        "/list_pending_candidates - List pending applications\n" +
        "/set_voting_period - Set voting period\n" +
        "/view_results - View current vote counts"
    }

    bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" })
  })
})

// Handle callback queries (menu interactions)
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id
  const data = query.data
  bot.answerCallbackQuery(query.id)

  if (data === "view_candidates") {
    // Show approved candidates
    db.all(
      "SELECT candidate_id, name, position, picture, manifesto FROM candidates WHERE is_approved = 1 ORDER BY position",
      [],
      (err, candidates) => {
        if (err) {
          console.error("Database error:", err.message)
          bot.sendMessage(chatId, "An error occurred. Please try again later.")
          return
        }
        if (!candidates.length) {
          bot.sendMessage(chatId, "📋 No approved candidates available yet.\n\nCheck back later!")
          return
        }

        bot.sendMessage(chatId, `🗳️ *Approved Candidates (${candidates.length})*\n`, { parse_mode: "Markdown" })

        for (const candidate of candidates) {
          const message =
            `👤 *${candidate.name}*\n` +
            `🎯 Position: ${candidate.position}\n` +
            `${candidate.manifesto ? `📝 Manifesto: ${candidate.manifesto}\n` : ""}` +
            `🆔 ID: ${candidate.candidate_id}`

          if (candidate.picture) {
            bot.sendPhoto(chatId, candidate.picture, {
              caption: message,
              parse_mode: "Markdown",
            })
          } else {
            bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
          }
        }
      },
    )
  } else if (data === "vote") {
    // Handle voting
    db.get("SELECT telegram_id, is_verified FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
      if (err) {
        console.error("Database error:", err.message)
        bot.sendMessage(chatId, "An error occurred. Please try again later.")
        return
      }
      if (!row || !row.is_verified) {
        bot.sendMessage(chatId, "❌ You must be registered and verified to vote.\n\nUse /register to get started.")
        return
      }

      // Check voting period
      db.get("SELECT start_date, end_date FROM voting_period WHERE id = 1", [], (err, period) => {
        if (err) {
          console.error("Database error:", err.message)
          bot.sendMessage(chatId, "An error occurred. Please try again later.")
          return
        }
        if (!period) {
          bot.sendMessage(
            chatId,
            "⏳ Voting period has not been set yet.\n\nPlease wait for the admin to announce the voting period.",
          )
          return
        }

        const now = new Date()
        const startDate = new Date(period.start_date)
        const endDate = new Date(period.end_date)

        if (now < startDate) {
          bot.sendMessage(chatId, `⏰ Voting has not started yet.\n\nVoting starts: ${startDate.toLocaleString()}`)
          return
        }
        if (now > endDate) {
          bot.sendMessage(chatId, `⏰ Voting period has ended.\n\nVoting ended: ${endDate.toLocaleString()}`)
          return
        }

        // Check if user already voted
        db.get("SELECT vote_id FROM votes WHERE voter_telegram_id = ?", [chatId], (err, voteRow) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }
          if (voteRow) {
            bot.sendMessage(chatId, "✅ You have already cast your vote.\n\nThank you for participating!")
            return
          }

          // Show candidates for voting
          db.all(
            "SELECT candidate_id, name, position, picture FROM candidates WHERE is_approved = 1 AND telegram_id != ? ORDER BY position",
            [chatId],
            (err, candidates) => {
              if (err) {
                console.error("Database error:", err.message)
                bot.sendMessage(chatId, "An error occurred. Please try again later.")
                return
              }
              if (!candidates.length) {
                bot.sendMessage(chatId, "📋 No candidates available for voting.")
                return
              }

              bot.sendMessage(chatId, "🗳️ *Choose a candidate to vote for:*\n\nReply with the candidate ID number.", {
                parse_mode: "Markdown",
              })

              for (const candidate of candidates) {
                const message = `👤 *${candidate.name}*\n🎯 ${candidate.position}\n🆔 *Vote ID: ${candidate.candidate_id}*`
                if (candidate.picture) {
                  bot.sendPhoto(chatId, candidate.picture, {
                    caption: message,
                    parse_mode: "Markdown",
                  })
                } else {
                  bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
                }
              }

              // Set voting state
              db.run(
                "INSERT OR REPLACE INTO User_states (telegram_id, state) VALUES (?, ?)",
                [chatId, JSON.stringify({ step: "voting", candidates: candidates })],
                (err) => {
                  if (err) {
                    console.error("Database error:", err.message)
                  }
                },
              )
            },
          )
        })
      })
    })
  } else if (data === "apply_candidate") {
    // Handle candidate application
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
      if (!isValidCandidateLevel(row.level)) {
        bot.sendMessage(chatId, "❌ Only students in levels 200-400 can apply as candidates.")
        return
      }
      if (!isValidMatric(row.matric_no)) {
        bot.sendMessage(chatId, "❌ Only students from CG and CH departments can apply as candidates.")
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

        // Show position selection menu
        const eligiblePositions = validPositions.filter((pos) => isValidPositionForLevel(pos, row.level))
        if (!eligiblePositions.length) {
          bot.sendMessage(chatId, "❌ No positions available for your level.")
          return
        }

        const keyboard = eligiblePositions.map((pos) => [{ text: pos, callback_data: `select_position_${pos}` }])
        bot.sendMessage(chatId, "🎯 *Select the position you want to run for:*", {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: "Markdown",
        })
      })
    })
  } else if (data.startsWith("select_position_")) {
    // Handle position selection
    const position = data.replace("select_position_", "")

    db.get("SELECT * FROM Users WHERE telegram_id = ?", [chatId], (err, row) => {
      if (err) {
        console.error("Database error:", err.message)
        bot.sendMessage(chatId, "An error occurred. Please try again later.")
        return
      }

      // Create candidate application
      db.run(
        "INSERT INTO candidates (telegram_id, name, position, is_approved) VALUES (?, ?, ?, ?)",
        [chatId, row.name, position, 0],
        (err) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }

          // Send OTP for candidate verification
          const otp = generateOTP()
          const expiry = new Date(Date.now() + 5 * 60 * 1000)

          db.run(
            "INSERT OR REPLACE INTO candidate_otps (telegram_id, otp, expiry) VALUES (?, ?, ?)",
            [chatId, otp, expiry.toISOString()],
            async (err) => {
              if (err) {
                console.error("Database error:", err.message)
                bot.sendMessage(chatId, "An error occurred. Please try again later.")
                return
              }

              const sent = await sendOTP(row.email, otp)
              if (!sent) {
                bot.sendMessage(chatId, "❌ Failed to send OTP. Please try again.")
                return
              }

              bot.sendMessage(
                chatId,
                `✅ *Application submitted for ${position}!*\n\n` +
                  "📧 An OTP has been sent to your email for verification.\n" +
                  "Please reply with the 6-digit OTP to confirm your application.",
                { parse_mode: "Markdown" },
              )

              // Set candidate verification state
              db.run(
                "INSERT OR REPLACE INTO User_states (telegram_id, state) VALUES (?, ?)",
                [chatId, JSON.stringify({ step: "candidate_otp_verification", position: position })],
                (err) => {
                  if (err) {
                    console.error("Database error:", err.message)
                  }
                },
              )
            },
          )
        },
      )
    })
  } else if (data === "help_menu") {
    // Show help
    bot.sendMessage(
      chatId,
      "🆘 *NACOSPollBuddy Help*\n\n" +
        "*How to use:*\n" +
        "1️⃣ Register with /register\n" +
        "2️⃣ Verify your email with the OTP\n" +
        "3️⃣ Use the menu to vote or apply\n\n" +
        "*Need help?* Contact the admin.",
      { parse_mode: "Markdown" },
    )
  } else if (data.startsWith("approve_") || data.startsWith("reject_")) {
    // Handle admin approval/rejection
    const [action, telegramId] = data.split("_")
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) {
        bot.sendMessage(chatId, "❌ You don't have permission to perform this action.")
        return
      }

      if (action === "approve") {
        db.get("SELECT * FROM candidates WHERE telegram_id = ?", [telegramId], (err, candidateRow) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }
          if (!candidateRow) {
            bot.sendMessage(chatId, "❌ Candidate not found.")
            return
          }

          db.run("UPDATE candidates SET is_approved = 1 WHERE telegram_id = ?", [telegramId], (err) => {
            if (err) {
              console.error("Database error:", err.message)
              bot.sendMessage(chatId, "An error occurred. Please try again later.")
              return
            }

            bot.sendMessage(chatId, `✅ Candidate ${candidateRow.name} approved for ${candidateRow.position}.`)

            // Automatically show candidate profile after approval
            const profileMenu = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📸 Upload Photo", callback_data: "upload_photo" },
                    { text: "📝 Edit Manifesto", callback_data: "edit_manifesto" },
                  ],
                  [
                    { text: "📊 View Results", callback_data: "view_my_results" },
                    { text: "📢 Request Campaign", callback_data: "request_campaign" },
                  ],
                  [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
                ],
              },
            }

            const welcomeMessage =
              `🎉 Congratulations! Your candidacy for ${candidateRow.position} has been approved.\n\n` +
              `👤 **Your Candidate Profile**\n\n` +
              `🎯 Position: ${candidateRow.position}\n` +
              `📸 Photo: ❌ Not uploaded\n` +
              `📝 Manifesto: ❌ Not added\n` +
              `✅ Status: Approved\n\n` +
              `Complete your profile to start campaigning!`

            bot.sendMessage(telegramId, welcomeMessage, { ...profileMenu, parse_mode: "Markdown" })

            // Delete the approval message
            bot.deleteMessage(chatId, query.message.message_id).catch(() => {})
          })
        })
      } else if (action === "reject") {
        db.get("SELECT * FROM candidates WHERE telegram_id = ?", [telegramId], (err, candidateRow) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }
          if (!candidateRow) {
            bot.sendMessage(chatId, "❌ Candidate not found.")
            return
          }

          db.run("DELETE FROM candidates WHERE telegram_id = ?", [telegramId], (err) => {
            if (err) {
              console.error("Database error:", err.message)
              bot.sendMessage(chatId, "An error occurred. Please try again later.")
              return
            }

            bot.sendMessage(chatId, `❌ Candidate ${candidateRow.name} rejected.`)
            bot.sendMessage(
              telegramId,
              `❌ Sorry, your application for ${candidateRow.position} was not approved. You can apply again later.`,
            )

            // Delete the approval message
            bot.deleteMessage(chatId, query.message.message_id).catch(() => {})
          })
        })
      }
    })
  } else if (data === "admin_dashboard") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) {
        bot.sendMessage(chatId, "❌ You don't have permission to access the admin dashboard.")
        return
      }
      adminDashboard.showDashboard(chatId)
    })
  } else if (data === "admin_election_settings") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showElectionSettings(chatId)
    })
  } else if (data === "admin_user_management") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showUserManagement(chatId)
    })
  } else if (data === "set_election_date") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showDateSelection(chatId)
    })
  } else if (data === "set_election_time") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showTimeSelection(chatId)
    })
  } else if (data.startsWith("select_date_")) {
    const selectedDate = data.replace("select_date_", "")
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showTimeSelection(chatId, selectedDate)
    })
  } else if (data.startsWith("select_time_")) {
    const parts = data.replace("select_time_", "").split("_")
    const time = parts[0]
    const date = parts[1]

    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const result = await adminDashboard.setElectionPeriod(date, time)
        bot.sendMessage(
          chatId,
          `✅ **Election scheduled successfully!**\n\n` +
            `📅 Date: ${result.startDateTime.toLocaleDateString()}\n` +
            `⏰ Start: ${result.startDateTime.toLocaleTimeString()}\n` +
            `🏁 End: ${result.endDateTime.toLocaleTimeString()}\n\n` +
            `Duration: 8 hours`,
          { parse_mode: "Markdown" },
        )
        adminDashboard.showDashboard(chatId)
      } catch (error) {
        bot.sendMessage(chatId, "❌ Failed to set election period. Please try again.")
      }
    })
  } else if (data === "list_all_users") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      db.all(
        "SELECT telegram_id, name, email, level, is_verified, is_admin FROM Users ORDER BY name",
        [],
        (err, users) => {
          if (err) {
            bot.sendMessage(chatId, "❌ Error retrieving users.")
            return
          }

          if (!users.length) {
            bot.sendMessage(chatId, "📋 No users found.")
            return
          }

          let message = `👥 **All Users (${users.length})**\n\n`
          users.forEach((user, index) => {
            const status = user.is_admin ? "👨‍💼" : user.is_verified ? "✅" : "⏳"
            message += `${index + 1}. ${status} ${user.name}\n`
            message += `   📧 ${user.email}\n`
            message += `   🎓 Level ${user.level}\n`
            message += `   🆔 ${user.telegram_id}\n\n`
          })

          // Split message if too long
          if (message.length > 4000) {
            const messages = message.match(/.{1,4000}/g)
            messages.forEach((msg) => bot.sendMessage(chatId, msg, { parse_mode: "Markdown" }))
          } else {
            bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
          }
        },
      )
    })
  } else if (data === "user_statistics") {
    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const stats = await adminDashboard.getUserStatistics()
        const message =
          `📊 **User Statistics**\n\n` +
          `👥 Total Users: ${stats.total_users}\n` +
          `✅ Verified Users: ${stats.verified_users}\n` +
          `👨‍💼 Admin Users: ${stats.admin_users}\n` +
          `🎓 Unique Levels: ${stats.unique_levels}\n\n` +
          `📈 Verification Rate: ${((stats.verified_users / stats.total_users) * 100).toFixed(1)}%`

        bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
      } catch (error) {
        bot.sendMessage(chatId, "❌ Error retrieving statistics.")
      }
    })
  } else if (data === "candidate_profile") {
    // Show candidate profile management
    db.get("SELECT * FROM candidates WHERE telegram_id = ?", [chatId], (err, candidate) => {
      if (err || !candidate) {
        bot.sendMessage(chatId, "❌ Candidate profile not found.")
        return
      }

      const profileMenu = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📸 Upload Photo", callback_data: "upload_photo" },
              { text: "📝 Edit Manifesto", callback_data: "edit_manifesto" },
            ],
            [
              { text: "📊 View Results", callback_data: "view_my_results" },
              { text: "📢 Request Campaign", callback_data: "request_campaign" },
            ],
            [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
          ],
        },
      }

      const message =
        `👤 **Your Candidate Profile**\n\n` +
        `🎯 Position: ${candidate.position}\n` +
        `${candidate.picture ? "📸 Photo: ✅ Uploaded" : "📸 Photo: ❌ Not uploaded"}\n` +
        `${candidate.manifesto ? "📝 Manifesto: ✅ Added" : "📝 Manifesto: ❌ Not added"}\n` +
        `${candidate.is_approved ? "✅ Status: Approved" : "⏳ Status: Pending approval"}`

      bot.sendMessage(chatId, message, { ...profileMenu, parse_mode: "Markdown" })
    })
  } else if (data === "request_campaign") {
    db.get("SELECT * FROM candidates WHERE telegram_id = ? AND is_approved = 1", [chatId], async (err, candidate) => {
      if (err || !candidate) {
        bot.sendMessage(chatId, "❌ Only approved candidates can request campaigns.")
        return
      }

      const result = await campaignSystem.startCampaign(candidate.candidate_id)
      bot.sendMessage(
        chatId,
        result.success
          ? `✅ ${result.message}\n\nYour campaign will run for 24 hours across all registered groups.`
          : `❌ ${result.message}`,
      )
    })
  } else if (data === "upload_photo") {
    db.run(
      "INSERT OR REPLACE INTO User_states (telegram_id, state) VALUES (?, ?)",
      [chatId, JSON.stringify({ step: "upload_photo" })],
      () => {
        bot.sendMessage(
          chatId,
          "📸 **Upload Your Campaign Photo**\n\nSend a clear photo of yourself for your campaign profile.",
        )
      },
    )
  } else if (data === "edit_manifesto") {
    db.run(
      "INSERT OR REPLACE INTO User_states (telegram_id, state) VALUES (?, ?)",
      [chatId, JSON.stringify({ step: "edit_manifesto" })],
      () => {
        bot.sendMessage(
          chatId,
          "📝 **Write Your Manifesto**\n\nShare your vision and plans if elected (max 500 characters):",
        )
      },
    )
  } else if (data === "view_my_results") {
    // Show results only after election ends
    db.get("SELECT end_date FROM voting_period WHERE id = 1", [], (err, period) => {
      if (err || !period) {
        bot.sendMessage(chatId, "❌ No election period set.")
        return
      }

      const now = new Date()
      const endDate = new Date(period.end_date)

      if (now <= endDate) {
        bot.sendMessage(chatId, "⏰ Results will be available after the election ends.")
        return
      }

      // Get candidate's results
      db.get("SELECT candidate_id FROM candidates WHERE telegram_id = ?", [chatId], (err, candidate) => {
        if (err || !candidate) return

        db.get(
          "SELECT COUNT(*) as vote_count FROM votes WHERE candidate_id = ?",
          [candidate.candidate_id],
          (err, result) => {
            if (err) return

            bot.sendMessage(
              chatId,
              `📊 **Your Election Results**\n\n🗳️ Total Votes Received: ${result.vote_count}\n\nThank you for participating in the election!`,
              { parse_mode: "Markdown" },
            )
          },
        )
      })
    })
  } else if (data === "main_menu" || data === "back_to_menu") {
    showMainMenu(chatId)
  } else if (data === "back_to_dashboard") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return
      adminDashboard.showDashboard(chatId)
    })
  } else if (data === "admin_campaign") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      const campaignMenu = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Campaign Status", callback_data: "campaign_status" }],
            [{ text: "📢 How Campaigns Work", callback_data: "campaign_info" }],
            [{ text: "🔙 Back to Dashboard", callback_data: "back_to_dashboard" }],
          ],
        },
      }

      bot.sendMessage(chatId, "📢 **Campaign Management**\n\nManage candidate campaigns:", {
        ...campaignMenu,
        parse_mode: "Markdown",
      })
    })
  } else if (data === "campaign_info") {
    const campaignInfo =
      "📢 **How the Campaign System Works**\n\n" +
      "🎯 **For Candidates:**\n" +
      "• Only approved candidates can request campaigns\n" +
      "• Each campaign runs for 24 hours\n" +
      "• Only one campaign can be active at a time\n" +
      "• Campaigns are broadcast to registered groups\n\n" +
      "🏛️ **For Admins:**\n" +
      "• Monitor active campaigns with /campaign_status\n" +
      "• Add group chats for campaign broadcasting\n" +
      "• View campaign schedules and duration\n\n" +
      "📱 **Campaign Content Includes:**\n" +
      "• Candidate photo (if uploaded)\n" +
      "• Name and position\n" +
      "• Manifesto (if added)\n" +
      "• Call to vote message"

    bot.sendMessage(chatId, campaignInfo, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_campaign" }]],
      },
      parse_mode: "Markdown",
    })
  } else if (data === "campaign_status") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      const status = campaignSystem.getCampaignStatus()
      bot.sendMessage(chatId, `📢 **Campaign Status**\n\n${status}`, {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_campaign" }]],
        },
        parse_mode: "Markdown",
      })
    })
  } else if (data === "view_election_settings") {
    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const settings = await adminDashboard.getCurrentSettings()
        if (!settings) {
          bot.sendMessage(chatId, "⚙️ **Current Election Settings**\n\n❌ No election period has been set yet.", {
            reply_markup: {
              inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_election_settings" }]],
            },
            parse_mode: "Markdown",
          })
          return
        }

        const startDate = new Date(settings.start_date)
        const endDate = new Date(settings.end_date)

        const message =
          "⚙️ **Current Election Settings**\n\n" +
          `📅 Start Date: ${startDate.toLocaleDateString()}\n` +
          `⏰ Start Time: ${startDate.toLocaleTimeString()}\n` +
          `🏁 End Date: ${endDate.toLocaleDateString()}\n` +
          `⏰ End Time: ${endDate.toLocaleTimeString()}\n` +
          `⏱️ Duration: ${Math.round((endDate - startDate) / (1000 * 60 * 60))} hours`

        bot.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_election_settings" }]],
          },
          parse_mode: "Markdown",
        })
      } catch (error) {
        bot.sendMessage(chatId, "❌ Error retrieving settings.")
      }
    })
  } else if (data === "admin_profile") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) {
        bot.sendMessage(chatId, "❌ You don't have permission to view admin profile.")
        return
      }

      db.get("SELECT * FROM Users WHERE telegram_id = ?", [chatId], async (err, user) => {
        if (err || !user) {
          bot.sendMessage(chatId, "❌ Admin profile not found.")
          return
        }

        try {
          const stats = await adminDashboard.getUserStatistics()
          const settings = await adminDashboard.getCurrentSettings()

          let settingsText = "❌ Not set"
          if (settings) {
            const startDate = new Date(settings.start_date)
            settingsText = `📅 ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`
          }

          const profileMessage =
            `👨‍💼 **Admin Profile**\n\n` +
            `👤 Name: ${user.name}\n` +
            `📧 Email: ${user.email}\n` +
            `🎓 Level: ${user.level}\n` +
            `🆔 Telegram ID: ${user.telegram_id}\n` +
            `🏛️ Role: System Administrator\n\n` +
            `📊 **System Overview:**\n` +
            `👥 Total Users: ${stats.total_users}\n` +
            `✅ Verified Users: ${stats.verified_users}\n` +
            `🗳️ Election Period: ${settingsText}\n` +
            `📢 Campaign Status: ${campaignSystem.getCampaignStatus()}`

          bot.sendMessage(chatId, profileMessage, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏛️ Open Dashboard", callback_data: "admin_dashboard" }],
                [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
              ],
            },
            parse_mode: "Markdown",
          })
        } catch (error) {
          bot.sendMessage(chatId, "❌ Error loading admin profile.")
        }
      })
    })
  } else if (data === "quick_set_voting") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      bot.sendMessage(
        chatId,
        "⚡ **Quick Set Voting Period**\n\n" + "Choose a quick option or use the full settings menu:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Start NOW (8h duration)", callback_data: "quick_now" }],
              [{ text: "🕐 Start in 1 hour (8h duration)", callback_data: "quick_1hour" }],
              [{ text: "📅 Tomorrow 9 AM (8h duration)", callback_data: "quick_tomorrow" }],
              [{ text: "⚙️ Custom Settings", callback_data: "admin_election_settings" }],
              [{ text: "🔙 Back", callback_data: "admin_dashboard" }],
            ],
          },
          parse_mode: "Markdown",
        },
      )
    })
  } else if (data === "quick_now") {
    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const startTime = new Date() // Start now
        const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000) // 8 hours duration

        await db.run("INSERT OR REPLACE INTO voting_period (id, start_date, end_date) VALUES (1, ?, ?)", [
          startTime.toISOString(),
          endTime.toISOString(),
        ])

        bot.sendMessage(
          chatId,
          `✅ **Voting period set!**\n\n` +
            `⏰ Started: NOW\n` +
            `🏁 Ends: ${endTime.toLocaleString()}\n` +
            `⏱️ Duration: 8 hours`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🏛️ Back to Dashboard", callback_data: "admin_dashboard" }]],
            },
            parse_mode: "Markdown",
          },
        )
      } catch (error) {
        bot.sendMessage(chatId, "❌ Failed to set voting period.")
      }
    })
  } else if (data === "quick_1hour") {
    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const startTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000) // 8 hours duration

        await db.run("INSERT OR REPLACE INTO voting_period (id, start_date, end_date) VALUES (1, ?, ?)", [
          startTime.toISOString(),
          endTime.toISOString(),
        ])

        bot.sendMessage(
          chatId,
          `✅ **Voting period set!**\n\n` +
            `⏰ Starts: ${startTime.toLocaleString()}\n` +
            `🏁 Ends: ${endTime.toLocaleString()}\n` +
            `⏱️ Duration: 8 hours`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🏛️ Back to Dashboard", callback_data: "admin_dashboard" }]],
            },
            parse_mode: "Markdown",
          },
        )
      } catch (error) {
        bot.sendMessage(chatId, "❌ Failed to set voting period.")
      }
    })
  } else if (data === "quick_tomorrow") {
    isAdmin(chatId, async (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0) // 9 AM

        const endTime = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000) // 8 hours duration

        await db.run("INSERT OR REPLACE INTO voting_period (id, start_date, end_date) VALUES (1, ?, ?)", [
          tomorrow.toISOString(),
          endTime.toISOString(),
        ])

        bot.sendMessage(
          chatId,
          `✅ **Voting period set!**\n\n` +
            `⏰ Starts: ${tomorrow.toLocaleString()}\n` +
            `🏁 Ends: ${endTime.toLocaleString()}\n` +
            `⏱️ Duration: 8 hours`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🏛️ Back to Dashboard", callback_data: "admin_dashboard" }]],
            },
            parse_mode: "Markdown",
          },
        )
      } catch (error) {
        bot.sendMessage(chatId, "❌ Failed to set voting period.")
      }
    })
  } else if (data === "clear_voting_period") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      bot.sendMessage(
        chatId,
        "🗑️ **Clear Voting Period**\n\nAre you sure you want to clear the current voting period? This action cannot be undone.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Yes, Clear It", callback_data: "confirm_clear_voting" },
                { text: "❌ Cancel", callback_data: "admin_dashboard" },
              ],
            ],
          },
          parse_mode: "Markdown",
        },
      )
    })
  } else if (data === "confirm_clear_voting") {
    isAdmin(chatId, (err, isCallerAdmin) => {
      if (err || !isCallerAdmin) return

      db.run("DELETE FROM voting_period WHERE id = 1", (err) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Failed to clear voting period.")
          return
        }

        bot.sendMessage(chatId, "✅ **Voting period cleared successfully!**\n\nYou can now set a new voting period.", {
          reply_markup: {
            inline_keyboard: [[{ text: "🏛️ Back to Dashboard", callback_data: "admin_dashboard" }]],
          },
          parse_mode: "Markdown",
        })
      })
    })
  }
})

// Handle text messages (OTP verification and registration flow)
bot.on("message", (msg) => {
  const chatId = msg.chat.id
  const text = msg.text
  if (!text || text.startsWith("/")) return

  // Check if it's a 6-digit OTP
  if (/^\d{6}$/.test(text)) {
    // Check for voter OTP verification
    db.get("SELECT otp, expiry FROM otps WHERE telegram_id = ?", [chatId], (err, otpRow) => {
      if (err) {
        console.error("Database error:", err.message)
        bot.sendMessage(chatId, "An error occurred. Please try again later.")
        return
      }

      if (otpRow) {
        const now = new Date()
        const expiry = new Date(otpRow.expiry)

        if (now > expiry) {
          bot.sendMessage(chatId, "⏰ Your OTP has expired. Please register again with /register.")
          db.run("DELETE FROM otps WHERE telegram_id = ?", [chatId])
          return
        }

        if (otpRow.otp !== text.trim()) {
          bot.sendMessage(chatId, "❌ Invalid OTP. Please check your email and try again.")
          return
        }

        // Verify user
        db.run("UPDATE Users SET is_verified = 1 WHERE telegram_id = ?", [chatId], (err) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "Failed to verify. Please try again.")
            return
          }

          db.run("DELETE FROM otps WHERE telegram_id = ?", [chatId])
          bot.sendMessage(
            chatId,
            "🎉 *Email verified successfully!*\n\nYou are now registered and can participate in the election.",
            { parse_mode: "Markdown" },
          )
          showMainMenu(chatId)
        })
        return
      }

      // Check for candidate OTP verification
      db.get("SELECT otp, expiry FROM candidate_otps WHERE telegram_id = ?", [chatId], (err, candidateOtpRow) => {
        if (err) {
          console.error("Database error:", err.message)
          bot.sendMessage(chatId, "An error occurred. Please try again later.")
          return
        }

        if (candidateOtpRow) {
          const now = new Date()
          const expiry = new Date(candidateOtpRow.expiry)

          if (now > expiry) {
            bot.sendMessage(chatId, "⏰ Your OTP has expired. Please apply again.")
            db.run("DELETE FROM candidate_otps WHERE telegram_id = ?", [chatId])
            return
          }

          if (candidateOtpRow.otp !== text.trim()) {
            bot.sendMessage(chatId, "❌ Invalid OTP. Please check your email and try again.")
            return
          }

          // Candidate OTP verified - notify admin
          db.run("DELETE FROM candidate_otps WHERE telegram_id = ?", [chatId])
          db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId])

          bot.sendMessage(
            chatId,
            "✅ *Candidate application verified!*\n\n" +
              "📋 Your application has been submitted to the admin for approval.\n" +
              "You will be notified once a decision is made.",
            { parse_mode: "Markdown" },
          )

          // Notify admin about new candidate application
          db.get("SELECT * FROM candidates WHERE telegram_id = ?", [chatId], (err, candidate) => {
            if (err || !candidate) return

            const adminMessage =
              `🆕 *New Candidate Application*\n\n` +
              `👤 Name: ${candidate.name}\n` +
              `🎯 Position: ${candidate.position}\n` +
              `🆔 Telegram ID: ${candidate.telegram_id}`

            const keyboard = [
              [
                { text: "✅ Approve", callback_data: `approve_${candidate.telegram_id}` },
                { text: "❌ Reject", callback_data: `reject_${candidate.telegram_id}` },
              ],
            ]

            bot.sendMessage(ADMIN_TELEGRAM_ID, adminMessage, {
              reply_markup: { inline_keyboard: keyboard },
              parse_mode: "Markdown",
            })
          })
          return
        }
      })
    })
    return
  }

  // Handle registration flow
  db.get("SELECT state FROM User_states WHERE telegram_id = ?", [chatId], (err, row) => {
    if (err) {
      console.error("Database error:", err.message)
      bot.sendMessage(chatId, "An error occurred. Please try again later.")
      return
    }

    if (!row) {
      // Check if it's a vote ID
      if (/^\d+$/.test(text)) {
        db.get("SELECT state FROM User_states WHERE telegram_id = ?", [chatId], (err, stateRow) => {
          if (err || !stateRow) return

          const state = JSON.parse(stateRow.state)
          if (state.step === "voting") {
            const candidateId = Number.parseInt(text)
            const candidate = state.candidates.find((c) => c.candidate_id === candidateId)

            if (!candidate) {
              bot.sendMessage(chatId, "❌ Invalid candidate ID. Please try again.")
              return
            }

            // Cast vote with RSA encryption
            const voteData = {
              voter_id: chatId,
              candidate_id: candidateId,
              timestamp: new Date().toISOString(),
              election_id: "nacos_2024",
            }

            const encryptedVote = rsaEncryption.encryptVote(voteData)
            if (!encryptedVote) {
              bot.sendMessage(chatId, "❌ Failed to encrypt vote. Please try again.")
              return
            }

            db.run(
              "INSERT INTO votes (voter_telegram_id, candidate_id, encrypted_vote) VALUES (?, ?, ?)",
              [chatId, candidateId, encryptedVote],
              (err) => {
                if (err) {
                  console.error("Database error:", err.message)
                  bot.sendMessage(chatId, "An error occurred. Please try again later.")
                  return
                }

                db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId])
                bot.sendMessage(
                  chatId,
                  `🗳️ *Vote cast successfully!*\n\n` +
                    `You voted for: *${candidate.name}*\n` +
                    `Position: ${candidate.position}\n\n` +
                    `Thank you for participating in the election! 🎉`,
                  { parse_mode: "Markdown" },
                )
                showMainMenu(chatId)
              },
            )
          }
        })
      }
      return
    }

    const state = JSON.parse(row.state)

    // Handle photo uploads for candidates
    if (msg.photo) {
      db.get("SELECT state FROM User_states WHERE telegram_id = ?", [chatId], (err, row) => {
        if (err || !row) return

        const state = JSON.parse(row.state)
        if (state.step === "upload_photo") {
          const photo = msg.photo[msg.photo.length - 1] // Get highest resolution
          const fileId = photo.file_id

          db.run("UPDATE candidates SET picture = ? WHERE telegram_id = ?", [fileId, chatId], (err) => {
            if (err) {
              bot.sendMessage(chatId, "❌ Failed to upload photo. Please try again.")
              return
            }

            // Clear the upload state
            db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId], (err) => {
              if (err) console.error("Error clearing state:", err)

              // Show success message with updated profile
              db.get("SELECT * FROM candidates WHERE telegram_id = ?", [chatId], (err, candidate) => {
                if (err || !candidate) {
                  bot.sendMessage(chatId, "✅ Photo uploaded successfully!")
                  return
                }

                const profileMenu = {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: "📝 Edit Manifesto", callback_data: "edit_manifesto" },
                        { text: "📢 Request Campaign", callback_data: "request_campaign" },
                      ],
                      [
                        { text: "👤 View My Profile", callback_data: "candidate_profile" },
                        { text: "🔙 Back to Menu", callback_data: "main_menu" },
                      ],
                    ],
                  },
                }

                const message =
                  `✅ **Photo uploaded successfully!**\n\n` +
                  `👤 **Your Updated Profile:**\n` +
                  `🎯 Position: ${candidate.position}\n` +
                  `📸 Photo: ✅ Uploaded\n` +
                  `${candidate.manifesto ? "📝 Manifesto: ✅ Added" : "📝 Manifesto: ❌ Not added"}\n` +
                  `${candidate.is_approved ? "✅ Status: Approved" : "⏳ Status: Pending approval"}\n\n` +
                  `What would you like to do next?`

                bot.sendMessage(chatId, message, { ...profileMenu, parse_mode: "Markdown" })
              })
            })
          })
          return
        }
      })
    }

    // Handle manifesto editing
    if (state.step === "edit_manifesto") {
      if (!isValidManifesto(text)) {
        bot.sendMessage(chatId, "❌ Manifesto too long. Please keep it under 500 characters.")
        return
      }

      db.run("UPDATE candidates SET manifesto = ? WHERE telegram_id = ?", [text.trim(), chatId], (err) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Failed to update manifesto. Please try again.")
          return
        }

        db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId])
        bot.sendMessage(chatId, "✅ Manifesto updated successfully!")
      })
      return
    }

    if (state.step === "name") {
      db.run(
        "UPDATE User_states SET state = ? WHERE telegram_id = ?",
        [JSON.stringify({ ...state, step: "matric", name: text }), chatId],
        (err) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }
          bot.sendMessage(chatId, "🎓 Please enter your *matric number* (e.g., 21cg029945):", {
            parse_mode: "Markdown",
          })
        },
      )
    } else if (state.step === "matric") {
      if (!isValidMatric(text)) {
        bot.sendMessage(
          chatId,
          "❌ Invalid matric number format.\n\nPlease enter a valid matric number (must start with cg or ch).",
        )
        return
      }

      db.get("SELECT matric_no FROM Users WHERE matric_no = ? AND telegram_id != ?", [text, chatId], (err, row) => {
        if (err) {
          console.error("Database error:", err.message)
          bot.sendMessage(chatId, "An error occurred. Please try again later.")
          return
        }
        if (row) {
          bot.sendMessage(chatId, "❌ This matric number is already registered.\n\nContact admin if this is an error.")
          return
        }

        db.run(
          "UPDATE User_states SET state = ? WHERE telegram_id = ?",
          [JSON.stringify({ ...state, step: "level", matric: text }), chatId],
          (err) => {
            if (err) {
              console.error("Database error:", err.message)
              bot.sendMessage(chatId, "An error occurred. Please try again later.")
              return
            }
            bot.sendMessage(chatId, "📚 Please enter your *level* (100-400):", { parse_mode: "Markdown" })
          },
        )
      })
    } else if (state.step === "level") {
      if (!isValidLevel(text)) {
        bot.sendMessage(chatId, "❌ Invalid level.\n\nPlease enter a level between 100-400.")
        return
      }

      db.run(
        "UPDATE User_states SET state = ? WHERE telegram_id = ?",
        [JSON.stringify({ ...state, step: "email", level: Number.parseInt(text) }), chatId],
        (err) => {
          if (err) {
            console.error("Database error:", err.message)
            bot.sendMessage(chatId, "An error occurred. Please try again later.")
            return
          }
          bot.sendMessage(chatId, "📧 Please enter your *school email* (e.g., john.doe@stu.cu.edu.ng):", {
            parse_mode: "Markdown",
          })
        },
      )
    } else if (state.step === "email") {
      if (!isValidEmail(text)) {
        bot.sendMessage(chatId, "❌ Invalid email format.\n\nPlease use your school email: name.surname@stu.cu.edu.ng")
        return
      }

      db.get("SELECT email FROM Users WHERE email = ? AND telegram_id != ?", [text.trim(), chatId], (err, row) => {
        if (err) {
          console.error("Database error:", err.message)
          bot.sendMessage(chatId, "An error occurred. Please try again later.")
          return
        }
        if (row) {
          bot.sendMessage(chatId, "❌ This email is already registered.\n\nContact admin if this is an error.")
          return
        }

        // Update user record with real information
        db.run(
          "UPDATE Users SET name = ?, email = ?, matric_no = ?, level = ?, is_admin = ? WHERE telegram_id = ?",
          [state.name, text.trim(), state.matric, state.level, chatId.toString() === ADMIN_TELEGRAM_ID ? 1 : 0, chatId],
          async (err) => {
            if (err) {
              console.error("Database error:", err.message)
              bot.sendMessage(chatId, "Registration failed. Please try again.")
              return
            }

            const otp = generateOTP()
            const expiry = new Date(Date.now() + 5 * 60 * 1000)
            const sent = await sendOTP(text.trim(), otp)

            if (!sent) {
              bot.sendMessage(chatId, "❌ Failed to send OTP. Please try again.")
              return
            }

            db.run(
              "INSERT OR REPLACE INTO otps (telegram_id, otp, expiry) VALUES (?, ?, ?)",
              [chatId, otp, expiry.toISOString()],
              (err) => {
                if (err) {
                  console.error("Database error:", err.message)
                  bot.sendMessage(chatId, "An error occurred. Please try again later.")
                  return
                }

                bot.sendMessage(
                  chatId,
                  "📧 *OTP sent to your email!*\n\n" +
                    "Please check your email (including spam folder) and reply with the 6-digit OTP to complete your registration.",
                  { parse_mode: "Markdown" },
                )
                db.run("DELETE FROM User_states WHERE telegram_id = ?", [chatId])
              },
            )
          },
        )
      })
    }
  })
})

// Admin commands
bot.onText(/\/list_pending_candidates/, (msg) => {
  const chatId = msg.chat.id
  isAdmin(chatId, (err, isCallerAdmin) => {
    if (err || !isCallerAdmin) {
      bot.sendMessage(chatId, "❌ You don't have permission to use this command.")
      return
    }

    db.all("SELECT telegram_id, name, position FROM candidates WHERE is_approved = 0", [], (err, candidates) => {
      if (err) {
        console.error("Database error:", err.message)
        bot.sendMessage(chatId, "An error occurred. Please try again later.")
        return
      }
      if (!candidates.length) {
        bot.sendMessage(chatId, "📋 No pending candidate applications.")
        return
      }

      bot.sendMessage(chatId, `📋 *Pending Candidate Applications (${candidates.length})*\n`, {
        parse_mode: "Markdown",
      })

      for (const candidate of candidates) {
        const keyboard = [
          [
            { text: "✅ Approve", callback_data: `approve_${candidate.telegram_id}` },
            { text: "❌ Reject", callback_data: `reject_${candidate.telegram_id}` },
          ],
        ]

        bot.sendMessage(
          chatId,
          `👤 *${candidate.name}*\n🎯 Position: ${candidate.position}\n🆔 ID: ${candidate.telegram_id}`,
          {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: "Markdown",
          },
        )
      }
    })
  })
})

// Admin dashboard command
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id
  isAdmin(chatId, (err, isCallerAdmin) => {
    if (err || !isCallerAdmin) {
      bot.sendMessage(chatId, "❌ You don't have permission to access the admin dashboard.")
      return
    }
    adminDashboard.showDashboard(chatId)
  })
})

// Campaign status command
bot.onText(/\/campaign_status/, (msg) => {
  const chatId = msg.chat.id
  isAdmin(chatId, (err, isCallerAdmin) => {
    if (err || !isCallerAdmin) {
      bot.sendMessage(chatId, "❌ You don't have permission to view campaign status.")
      return
    }

    const status = campaignSystem.getCampaignStatus()
    bot.sendMessage(chatId, `📢 **Campaign Status**\n\n${status}`)
  })
})

// Publish results command
bot.onText(/\/publish_results/, (msg) => {
  const chatId = msg.chat.id
  isAdmin(chatId, (err, isCallerAdmin) => {
    if (err || !isCallerAdmin) {
      bot.sendMessage(chatId, "❌ You don't have permission to publish results.")
      return
    }

    // Get election results with decryption
    db.all(
      `
      SELECT 
        c.name, 
        c.position, 
        COUNT(v.vote_id) as vote_count,
        GROUP_CONCAT(v.encrypted_vote) as encrypted_votes
      FROM candidates c 
      LEFT JOIN votes v ON c.candidate_id = v.candidate_id 
      WHERE c.is_approved = 1
      GROUP BY c.candidate_id, c.name, c.position
      ORDER BY c.position, vote_count DESC
    `,
      [],
      (err, results) => {
        if (err) {
          bot.sendMessage(chatId, "❌ Error retrieving results.")
          return
        }

        let message = "🏆 **NACOS ELECTION RESULTS** 🏆\n\n"
        let currentPosition = ""

        results.forEach((result) => {
          if (result.position !== currentPosition) {
            message += `\n🎯 **${result.position}**\n`
            currentPosition = result.position
          }
          message += `👤 ${result.name}: ${result.vote_count} votes\n`
        })

        message += "\n🗳️ Thank you all for participating in the election!"

        // Send to all verified users
        db.all("SELECT telegram_id FROM Users WHERE is_verified = 1", [], (err, users) => {
          if (err) return

          users.forEach((user) => {
            bot.sendMessage(user.telegram_id, message, { parse_mode: "Markdown" })
          })
        })

        bot.sendMessage(chatId, "✅ Results published to all verified users!")
      },
    )
  })
})

// Log bot status
console.log("🚀 NACOSPollBuddy is running...")
