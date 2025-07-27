// Enhanced validation functions for the bot
const MatricValidator = require("./matric-validator")

// Initialize the validator
const matricValidator = new MatricValidator()

// Enhanced validation functions to replace the existing ones
const enhancedValidation = {
  /**
   * Enhanced matric validation with NACOS membership check
   */
  isValidMatric: (matric) => {
    const result = matricValidator.validateMatricNumber(matric)
    return result.isValid && result.isNacosMember
  },

  /**
   * Get detailed matric validation result
   */
  validateMatricWithDetails: (matric) => {
    return matricValidator.validateMatricNumber(matric)
  },

  /**
   * Check if user can apply for a specific position
   */
  canApplyForPosition: (matric, position, level) => {
    const matricResult = matricValidator.validateMatricNumber(matric)

    if (!matricResult.isValid || !matricResult.isNacosMember) {
      return {
        canApply: false,
        reason: matricResult.message,
      }
    }

    // Check level requirements
    if (!isValidCandidateLevel(level)) {
      return {
        canApply: false,
        reason: "❌ Only students in levels 200-400 can apply as candidates.",
      }
    }

    // Check position-specific requirements
    if (!isValidPositionForLevel(position, level)) {
      return {
        canApply: false,
        reason: `❌ Level ${level} students cannot apply for ${position} position.`,
      }
    }

    return {
      canApply: true,
      reason: `✅ Eligible to apply for ${position}.`,
      department: matricResult.details.departmentName,
    }
  },

  /**
   * Enhanced email validation (keeping existing logic)
   */
  isValidEmail: (email) => {
    const emailLower = email.toLowerCase()
    const domain = "@stu.cu.edu.ng"
    if (!emailLower.endsWith(domain)) return false
    const localPart = emailLower.slice(0, -domain.length)
    const format1 = /^[a-z]+.[a-z]+$/.test(localPart)
    const format2 = /^[a-z][a-z]+.\d{6}$/.test(localPart)
    return format1 || format2
  },

  /**
   * Level validation (keeping existing logic)
   */
  isValidLevel: (level) => /^\d+$/.test(level) && Number.parseInt(level) >= 100 && Number.parseInt(level) <= 400,

  isValidCandidateLevel: (level) =>
    /^\d+$/.test(level) && Number.parseInt(level) >= 200 && Number.parseInt(level) <= 400,

  isValidPositionForLevel: (position, level) => {
    const restrictedPositions = ["President", "Vice President"]
    return !restrictedPositions.includes(position) || level >= 300
  },

  isValidManifesto: (manifesto) => manifesto.length <= 500,
}

// Export the enhanced validation functions
module.exports = enhancedValidation
