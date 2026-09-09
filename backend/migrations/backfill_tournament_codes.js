const mysql = require('mysql2/promise');

async function backfillTournamentCodes() {
  let connection;
  try {
    console.log('Starting tournament_code backfill migration...');

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
      AND TABLE_NAME = 'tournaments' 
      AND COLUMN_NAME = 'tournament_code'
    `);

    if (columns.length === 0) {
      console.log('Adding tournament_code column to tournaments table...');
      await connection.execute(`
        ALTER TABLE tournaments 
        ADD COLUMN tournament_code VARCHAR(6) NULL AFTER match_time_limit
      `);
      await connection.execute(`
        ALTER TABLE tournaments 
        ADD INDEX idx_tournament_code (tournament_code)
      `);
      console.log('Column added successfully');
    } else {
      console.log('tournament_code column already exists');
    }

    // Get all tournaments without tournament_code
    const [tournaments] = await connection.execute(`
      SELECT id FROM tournaments WHERE tournament_code IS NULL OR tournament_code = ''
    `);

    console.log(`Found ${tournaments.length} tournaments without tournament_code`);

    if (tournaments.length === 0) {
      console.log('No tournaments to backfill. Migration complete.');
      process.exit(0);
    }

    // Generate unique tournament codes for each tournament
    let successCount = 0;
    let failCount = 0;

    for (const tournament of tournaments) {
      let code;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 20;

      while (!isUnique && attempts < maxAttempts) {
        // Generate 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if it's unique among active tournaments (open or live)
        const [existing] = await connection.execute(
          'SELECT id FROM tournaments WHERE tournament_code = ? AND status IN (?, ?)',
          [code, 'open', 'live']
        );

        if (existing.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (isUnique) {
        await connection.execute(
          'UPDATE tournaments SET tournament_code = ? WHERE id = ?',
          [code, tournament.id]
        );
        successCount++;
        console.log(`Generated tournament_code ${code} for tournament ID ${tournament.id}`);
      } else {
        failCount++;
        console.error(`Failed to generate unique tournament_code for tournament ID ${tournament.id}`);
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`- Successfully backfilled: ${successCount} tournaments`);
    console.log(`- Failed: ${failCount} tournaments`);

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

backfillTournamentCodes();
