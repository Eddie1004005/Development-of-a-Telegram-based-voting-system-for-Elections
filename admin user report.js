// Enhanced admin reporting with department breakdown

const generateNacosReport = (db, callback) => {
  const query = `
    SELECT 
      matric_no,
      name,
      email,
      level,
      is_verified,
      is_admin,
      CASE 
        WHEN LOWER(matric_no) LIKE '%cg%' THEN 'Computer Science'
        WHEN LOWER(matric_no) LIKE '%ch%' THEN 'Computer Engineering'
        ELSE 'Other/Invalid'
      END as department
    FROM Users 
    ORDER BY department, level, name
  `

  db.all(query, [], (err, users) => {
    if (err) {
      callback(err, null)
      return
    }

    // Generate statistics
    const stats = {
      total: users.length,
      verified: users.filter((u) => u.is_verified).length,
      departments: {
        cg: users.filter((u) => u.department === "Computer Science").length,
        ch: users.filter((u) => u.department === "Computer Engineering").length,
        other: users.filter((u) => u.department === "Other/Invalid").length,
      },
      levels: {},
    }

    // Count by levels
    users.forEach((user) => {
      stats.levels[user.level] = (stats.levels[user.level] || 0) + 1
    })

    const report = {
      users: users,
      statistics: stats,
      generatedAt: new Date().toISOString(),
    }

    callback(null, report)
  })
}

// Admin command to show department breakdown
const showDepartmentBreakdown = (chatId, bot, db) => {
  generateNacosReport(db, (err, report) => {
    if (err) {
      bot.sendMessage(chatId, "❌ Error generating report.")
      return
    }

    const { statistics } = report

    const message =
      `📊 **NACOS Membership Report**\n\n` +
      `👥 **Total Users:** ${statistics.total}\n` +
      `✅ **Verified:** ${statistics.verified}\n\n` +
      `🏫 **Department Breakdown:**\n` +
      `💻 Computer Science (CG): ${statistics.departments.cg}\n` +
      `⚙️ Computer Engineering (CH): ${statistics.departments.ch}\n` +
      `❌ Invalid/Other: ${statistics.departments.other}\n\n` +
      `🎓 **Level Distribution:**\n` +
      Object.entries(statistics.levels)
        .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
        .map(([level, count]) => `   Level ${level}: ${count}`)
        .join("\n") +
      `\n\n📅 Generated: ${new Date().toLocaleString()}`

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" })

    // Alert about invalid registrations if any
    if (statistics.departments.other > 0) {
      bot.sendMessage(
        chatId,
        `⚠️ **Alert:** ${statistics.departments.other} users have invalid matric numbers that don't belong to CG/CH departments. Consider reviewing these registrations.`,
        { parse_mode: "Markdown" },
      )
    }
  })
}

module.exports = { generateNacosReport, showDepartmentBreakdown }
