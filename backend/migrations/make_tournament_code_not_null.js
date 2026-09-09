const mysql = require('mysql2/promise');

async function makeTournamentCodeNotNull() {
  let connection;
  try {
    console.log('Making tournament_code column NOT NULL...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    await connection.execute(`
      ALTER TABLE tournaments 
      MODIFY COLUMN tournament_code VARCHAR(6) NOT NULL
    `);

    console.log('tournament_code column is now NOT NULL');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

makeTournamentCodeNotNull();
