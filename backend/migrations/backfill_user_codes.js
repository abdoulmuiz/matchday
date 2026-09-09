const mysql = require('mysql2/promise');

async function backfillUserCodes() {
  let connection;
  try {
    console.log('Starting user_code backfill migration...');

    // Create a direct connection for ALTER TABLE commands
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday',
      multipleStatements: true
    });

    // Check if column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ef_matchday' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'user_code'
    `);

    if (columns.length === 0) {
      console.log('Adding user_code column to users table...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN user_code VARCHAR(11) NULL AFTER profile_completed
      `);
      await connection.execute(`
        ALTER TABLE users 
        ADD INDEX idx_user_code (user_code)
      `);
      console.log('Column added successfully');
    } else {
      console.log('user_code column already exists');
    }

    // Get all users without user_code
    const [users] = await connection.execute(`
      SELECT id FROM users WHERE user_code IS NULL OR user_code = ''
    `);

    console.log(`Found ${users.length} users without user_code`);

    if (users.length === 0) {
      console.log('No users to backfill. Migration complete.');
      process.exit(0);
    }

    // Generate unique user codes for each user
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      let userCode;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        // Generate random 11-digit number
        const min = 10000000000;
        const max = 99999999999;
        userCode = Math.floor(Math.random() * (max - min + 1)) + min;

        // Check if it's unique
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE user_code = ?',
          [userCode.toString()]
        );

        if (existing.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (isUnique) {
        await connection.execute(
          'UPDATE users SET user_code = ? WHERE id = ?',
          [userCode.toString(), user.id]
        );
        successCount++;
        console.log(`Generated user_code ${userCode} for user ID ${user.id}`);
      } else {
        failCount++;
        console.error(`Failed to generate unique user_code for user ID ${user.id}`);
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`- Successfully backfilled: ${successCount} users`);
    console.log(`- Failed: ${failCount} users`);

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backfillUserCodes();
