const mysql = require('mysql2/promise');

async function debugMatches() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    console.log('Current matches state:');
    const [matches] = await connection.execute(`
      SELECT id, tournament_id, round, player_1_id, player_2_id, status, next_match_id 
      FROM matches 
      ORDER BY round, id
    `);

    console.table(matches);

    console.log('\nRound 1 matches:');
    const round1 = await connection.execute(`
      SELECT id, player_1_id, player_2_id, status, winner_id, next_match_id 
      FROM matches 
      WHERE round = 1 
      ORDER BY id
    `);
    console.table(round1[0]);

    console.log('\nRound 2 matches:');
    const round2 = await connection.execute(`
      SELECT id, player_1_id, player_2_id, status, winner_id, next_match_id 
      FROM matches 
      WHERE round = 2 
      ORDER BY id
    `);
    console.table(round2[0]);

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

debugMatches();
