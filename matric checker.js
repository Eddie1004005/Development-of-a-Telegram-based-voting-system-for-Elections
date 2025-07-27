/**
 * Enhanced Matric Number Validator for NACOS Membership
 * Checks if student belongs to CG (Computer Science) or CH (Computer Engineering) departments
 */

class MatricValidator {
  constructor() {
    // Valid department codes for NACOS members
    this.validDepartments = ["cg", "ch"]

    // Full matric pattern: 2 digits + department code + 6 digits
    this.matricPattern = /^(\d{2})(cg|ch)(\d{6})$/i
  }

  /**
   * Validate if matric number belongs to NACOS member departments
   * @param {string} matric - The matric number to validate
   * @returns {Object} - Validation result with success status and message
   */
  validateMatricNumber(matric) {
    if (!matric || typeof matric !== "string") {
      return {
        isValid: false,
        isNacosMember: false,
        error: "INVALID_FORMAT",
        message: "❌ Please provide a valid matric number.",
      }
    }

    // Clean the matric number (remove spaces, convert to lowercase)
    const cleanMatric = matric.trim().toLowerCase()

    // Check if matric contains CG or CH department codes
    const containsCgOrCh = this.validDepartments.some((dept) => cleanMatric.includes(dept))

    if (!containsCgOrCh) {
      return {
        isValid: false,
        isNacosMember: false,
        error: "NOT_NACOS_MEMBER",
        message:
          "❌ Only students from Computer Science (CG) and Computer Engineering (CH) departments can register.\n\n" +
          "You are not eligible for NACOS membership with this matric number.",
      }
    }

    // Check full matric format
    const formatMatch = this.matricPattern.test(cleanMatric)

    if (!formatMatch) {
      return {
        isValid: false,
        isNacosMember: true, // They have CG/CH but wrong format
        error: "INVALID_FORMAT",
        message:
          "❌ Invalid matric number format.\n\n" +
          "Expected format: YYcgNNNNNN or YYchNNNNNN\n" +
          "Example: 21cg029945 or 22ch031256",
      }
    }

    // Extract department code for additional validation
    const match = cleanMatric.match(this.matricPattern)
    const [, year, department, studentNumber] = match

    return {
      isValid: true,
      isNacosMember: true,
      error: null,
      message: "✅ Valid NACOS member matric number.",
      details: {
        year: `20${year}`,
        department: department.toUpperCase(),
        departmentName: department === "cg" ? "Computer Science" : "Computer Engineering",
        studentNumber: studentNumber,
        cleanMatric: cleanMatric,
      },
    }
  }

  /**
   * Get department full name from code
   * @param {string} deptCode - Department code (cg or ch)
   * @returns {string} - Full department name
   */
  getDepartmentName(deptCode) {
    const departments = {
      cg: "Computer Science",
      ch: "Computer Engineering",
    }
    return departments[deptCode.toLowerCase()] || "Unknown Department"
  }

  /**
   * Check if user is eligible for specific positions based on department
   * @param {string} matric - Matric number
   * @param {string} position - Position being applied for
   * @returns {Object} - Eligibility result
   */
  checkPositionEligibility(matric, position) {
    const validation = this.validateMatricNumber(matric)

    if (!validation.isValid || !validation.isNacosMember) {
      return {
        eligible: false,
        message: validation.message,
      }
    }

    // Additional position-specific checks can be added here
    // For now, all NACOS members are eligible for all positions
    return {
      eligible: true,
      message: `✅ Eligible for ${position} position.`,
      department: validation.details.departmentName,
    }
  }
}

module.exports = MatricValidator
