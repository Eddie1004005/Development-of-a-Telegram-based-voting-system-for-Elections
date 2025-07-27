const crypto = require("crypto")

class RSAEncryption {
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

  // Get public key for verification
  getPublicKey() {
    return this.publicKey
  }
}

// Create singleton instance
const rsaEncryption = new RSAEncryption()

module.exports = rsaEncryption
