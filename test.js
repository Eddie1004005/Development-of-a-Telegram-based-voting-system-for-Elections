const db = require('./database'); // Import the db module
const sqlite3 = require('sqlite3').verbose();

// Define getAllUsers function
function getAllUsers(callback) {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
}

// Helper function to check if user is an admin
const isAdmin = (chatId, callback) => {
    db.get('SELECT is_admin FROM users WHERE telegram_id = ?', [chatId], (err, row) => {
        if (err) {
            console.error('Database error in isAdmin:', err.message);
            callback(err, false);
            return;
        }
        callback(null, row && row.is_admin === 1);
    });
};

// Function to update user's is_admin status
function updateUserAdminStatus(telegramId, isAdminValue, callback) {
    db.run(
        `UPDATE users SET is_admin = ? WHERE telegram_id = ?`,
        [isAdminValue, telegramId],
        function (err) {
            if (err) {
                console.error('Error updating user admin status:', err.message);
                callback(err, null);
            } else {
                callback(null, this.changes);
            }
        }
    );
}

// Run getAllUsers before update
console.log('Fetching users before update:');
getAllUsers((err, users) => {
    if (err) {
        console.error('Failed to fetch users:', err);
    } else {
        console.log('All Users:', users);
    }
});

// Check admin status before update
const telegramIdToCheck = '5630166824.0';
console.log(`Checking admin status for telegram_id: ${telegramIdToCheck}`);
isAdmin(telegramIdToCheck, (err, isAdminStatus) => {
    if (err) {
        console.error('Failed to check admin status:', err);
    } else {
        console.log(`Is user ${telegramIdToCheck} an admin? ${isAdminStatus}`);
    }

    // Update is_admin for user with telegram_id '5045527889'
    updateUserAdminStatus(telegramIdToCheck, 1, (err, changes) => {
        if (err) {
            console.error('Failed to update user:', err);
        } else {
            console.log(`User with telegram_id '${telegramIdToCheck}' updated. Rows affected: ${changes}`);
            // Fetch all users again to confirm the update
            console.log('Fetching users after update:');
            getAllUsers((err, users) => {
                if (err) {
                    console.error('Failed to fetch users:', err);
                } else {
                    console.log('All Users:', users);
                }

                // Check admin status after update
                console.log(`Checking admin status for telegram_id: ${telegramIdToCheck} after update`);
                isAdmin(telegramIdToCheck, (err, isAdminStatus) => {
                    if (err) {
                        console.error('Failed to check admin status:', err);
                    } else {
                        console.log(`Is user ${telegramIdToCheck} an admin? ${isAdminStatus}`);
                    }
                });
            });
        }
    });
});