const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("./election.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message)
  } else {
    console.log("Connected to SQLite database.")
  }
})

db.run(
  `
    CREATE TABLE IF NOT EXISTS Users (
        telegram_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        matric_no TEXT UNIQUE NOT NULL,
        level INTEGER NOT NULL,
        is_verified INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        cgpa REAL,
        disciplinary_status TEXT
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating Users table:", err.message)
    } else {
      console.log("Users table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS otps (
        telegram_id TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expiry TEXT NOT NULL,
        FOREIGN KEY (telegram_id) REFERENCES Users(telegram_id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating otps table:", err.message)
    } else {
      console.log("Otps table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS admin_otps (
        telegram_id TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expiry TEXT NOT NULL,
        FOREIGN KEY (telegram_id) REFERENCES Users(telegram_id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating admin_otps table:", err.message)
    } else {
      console.log("Admin_otps table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS candidate_otps (
        telegram_id TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expiry TEXT NOT NULL,
        FOREIGN KEY (telegram_id) REFERENCES Users(telegram_id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating candidate_otps table:", err.message)
    } else {
      console.log("Candidate_otps table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS candidates (
        candidate_id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        picture TEXT,
        manifesto TEXT,
        is_approved INTEGER DEFAULT 0,
        FOREIGN KEY (telegram_id) REFERENCES Users(telegram_id),
        UNIQUE (telegram_id, position)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating candidates table:", err.message)
    } else {
      console.log("Candidates table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS voting_period (
        id INTEGER PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating voting_period table:", err.message)
    } else {
      console.log("Voting_period table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS votes (
        vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_telegram_id TEXT NOT NULL,
        candidate_id INTEGER NOT NULL,
        encrypted_vote TEXT NOT NULL,
        FOREIGN KEY (voter_telegram_id) REFERENCES Users(telegram_id),
        FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
        UNIQUE (voter_telegram_id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating votes table:", err.message)
    } else {
      console.log("Votes table created or already exists.")
    }
  },
)

db.run(
  `
    CREATE TABLE IF NOT EXISTS User_states (
        telegram_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        FOREIGN KEY (telegram_id) REFERENCES Users(telegram_id)
    )
`,
  (err) => {
    if (err) {
      console.error("Error creating User_states table:", err.message)
    } else {
      console.log("User_states table created or already exists.")
    }
  },
)

db.run("PRAGMA foreign_keys = ON", (err) => {
  if (err) {
    console.error("Error enabling foreign keys:", err.message)
  } else {
    console.log("Foreign key constraints enabled.")
  }
})

module.exports = db
