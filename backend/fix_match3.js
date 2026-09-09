const mysql = require('mysql2/promise');

async function fixMatch3() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    console.log('Fixing match 3 (tie situation)...');

    // Match 3 is a tie (4-4), need to set a winner
    // For this case, let's set player 8 as the winner (you can change this)
    const winnerId = 8; // Change this if you want player 7 to win instead
    
    await connection.execute(`
      UPDATE matches SET winner_id = ? WHERE id = 3
    `, [winnerId]);
    
    console.log(`Set winner_id to ${winnerId} for match 3`);

    // Now advance the winner to round 2
    const [match3] = await connection.execute(`
      SELECT next_match_id FROM matches WHERE id = 3
    `);
    
    if (match3.length > 0 && match3[0].next_match_id) {
      const nextMatchId = match3[0].next_match_id;
      console.log(`Advancing winner to match ${nextMatchId}`);
      
      const [nextMatch] = await connection.execute(`
        SELECT player_1_id, player_2_id FROM matches WHERE id = ?
      `, [nextMatchId]);
      
      if (nextMatch.length > 0) {
        const nm = nextMatch[0];
        if (!nm.player_1_id) {
          await connection.execute(`
            UPDATE matches SET player_1_id = ? WHERE id = ?
          `, [winnerId, nextMatchId]);
          console.log(`  -> Set as player_1 in match ${nextMatchId}`);
        } else if (!nm.player_2_id) {
          await connection.execute(`
            UPDATE matches SET player_2_id = ? WHERE id = ?
          `, [winnerId, nextMatchId]);
          console.log(`  -> Set as player_2 in match ${nextMatchId}`);
        }
        
        // Check if both players are now filled
        const [updatedMatch] = await connection.execute(`
          SELECT player_1_id, player_2_id FROM matches WHERE id = ?
        `, [nextMatchId]);
        
        if (updatedMatch[0].player_1_id && updatedMatch[0].player_2_id) {
          await connection.execute(`
            UPDATE matches SET status = 'live' WHERE id = ?
          `, [nextMatchId]);
          console.log(`  -> Updated match ${nextMatchId} to 'live' status`);
        }
      }
    }

    console.log('\nFix complete!');
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

fixMatch3();
