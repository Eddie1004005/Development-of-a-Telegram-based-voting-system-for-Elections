const db = require("./database.js")

class CampaignSystem {
  constructor(bot) {
    this.bot = bot
    this.activeCampaign = null
    this.campaignGroups = [] // Add your group chat IDs here
  }

  // Start campaign for a candidate
  async startCampaign(candidateId, duration = 24) {
    // duration in hours
    try {
      // Check if there's an active campaign
      if (this.activeCampaign) {
        return { success: false, message: "Another campaign is currently active." }
      }

      // Get candidate details
      const candidate = await this.getCandidateById(candidateId)
      if (!candidate || !candidate.is_approved) {
        return { success: false, message: "Candidate not found or not approved." }
      }

      // Start campaign
      this.activeCampaign = {
        candidateId,
        candidate,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 60 * 60 * 1000),
        duration,
      }

      // Send campaign messages to groups
      await this.broadcastCampaign()

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

  // Broadcast campaign message
  async broadcastCampaign() {
    if (!this.activeCampaign) return

    const { candidate } = this.activeCampaign
    const campaignMessage =
      `🗳️ **NACOS ELECTION CAMPAIGN** 🗳️\n\n` +
      `👤 **${candidate.name}**\n` +
      `🎯 **Running for: ${candidate.position}**\n\n` +
      `${candidate.manifesto ? `📋 **Manifesto:**\n${candidate.manifesto}\n\n` : ""}` +
      `🗳️ Vote wisely on election day!\n` +
      `#NACOSElection2024 #${candidate.position.replace(/\s+/g, "")}`

    // Send to all registered groups
    for (const groupId of this.campaignGroups) {
      try {
        if (candidate.picture) {
          await this.bot.sendPhoto(groupId, candidate.picture, {
            caption: campaignMessage,
            parse_mode: "Markdown",
          })
        } else {
          await this.bot.sendMessage(groupId, campaignMessage, {
            parse_mode: "Markdown",
          })
        }
      } catch (error) {
        console.error(`Failed to send campaign to group ${groupId}:`, error)
      }
    }
  }

  // End active campaign
  endCampaign() {
    if (this.activeCampaign) {
      const candidate = this.activeCampaign.candidate

      // Notify candidate
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

  // Add campaign group
  addCampaignGroup(groupId) {
    if (!this.campaignGroups.includes(groupId)) {
      this.campaignGroups.push(groupId)
      return true
    }
    return false
  }

  // Remove campaign group
  removeCampaignGroup(groupId) {
    const index = this.campaignGroups.indexOf(groupId)
    if (index > -1) {
      this.campaignGroups.splice(index, 1)
      return true
    }
    return false
  }
}

module.exports = CampaignSystem
