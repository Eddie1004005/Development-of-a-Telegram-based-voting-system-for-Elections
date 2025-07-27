const sqlite3 = require("sqlite3").verbose()

// Create a new database connection for cleanup
const db = new sqlite3.Database("./election.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message)
    process.exit(1)
  } else {
    console.log("Connected to SQLite database for cleanup.")
  }
})

// Fix foreign key issues by temporarily disabling them
console.log("Fixing database foreign key constraints...")

db.serialize(() => {
  // Disable foreign keys temporarily
  db.run("PRAGMA foreign_keys = OFF", (err) => {
    if (err) {
      console.error("Error disabling foreign keys:", err.message)
      return
    }
    console.log("Foreign keys disabled temporarily")

    // Clean up orphaned records in User_states
    db.run(`DELETE FROM User_states WHERE telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning User_states:", err.message)
      } else {
        console.log("Cleaned orphaned User_states records")
      }
    })

    // Clean up orphaned records in otps
    db.run(`DELETE FROM otps WHERE telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning otps:", err.message)
      } else {
        console.log("Cleaned orphaned otps records")
      }
    })

    // Clean up orphaned records in admin_otps
    db.run(`DELETE FROM admin_otps WHERE telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning admin_otps:", err.message)
      } else {
        console.log("Cleaned orphaned admin_otps records")
      }
    })

    // Clean up orphaned records in candidate_otps
    db.run(`DELETE FROM candidate_otps WHERE telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning candidate_otps:", err.message)
      } else {
        console.log("Cleaned orphaned candidate_otps records")
      }
    })

    // Clean up orphaned records in candidates
    db.run(`DELETE FROM candidates WHERE telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning candidates:", err.message)
      } else {
        console.log("Cleaned orphaned candidates records")
      }
    })

    // Clean up orphaned records in votes
    db.run(`DELETE FROM votes WHERE voter_telegram_id NOT IN (SELECT telegram_id FROM Users)`, (err) => {
      if (err) {
        console.error("Error cleaning votes:", err.message)
      } else {
        console.log("Cleaned orphaned votes records")
      }
    })

    // Re-enable foreign keys
    db.run("PRAGMA foreign_keys = ON", (err) => {
      if (err) {
        console.error("Error re-enabling foreign keys:", err.message)
      } else {
        console.log("Foreign keys re-enabled")
        console.log("Database cleanup completed successfully!")
      }

      // Close the database connection
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err.message)
        } else {
          console.log("Database connection closed.")
        }
        process.exit(0)
      })
    })
  })
})
