const mysql = require('mysql2/promise');

async function checkScores() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    console.log('Checking completed round 1 matches with missing winners:');
    const [matches] = await connection.execute(`
      SELECT id, player_1_id, player_2_id, player_1_score, player_2_score, winner_id 
      FROM matches 
      WHERE round = 1 AND status = 'completed'
    `);

    console.table(matches);

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

checkScores();
