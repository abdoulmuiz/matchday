const mysql = require('mysql2/promise');

async function fixBracket() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    console.log('Fixing bracket by advancing winners...');

    // Get all completed round 1 matches
    const [round1Matches] = await connection.execute(`
      SELECT id, winner_id, next_match_id 
      FROM matches 
      WHERE round = 1 AND status = 'completed' AND winner_id IS NOT NULL
    `);

    console.log(`Found ${round1Matches.length} completed round 1 matches`);

    for (const match of round1Matches) {
      if (match.next_match_id && match.winner_id) {
        console.log(`Advancing winner ${match.winner_id} from match ${match.id} to match ${match.next_match_id}`);
        
        // Get the next match
        const [nextMatch] = await connection.execute(`
          SELECT player_1_id, player_2_id 
          FROM matches 
          WHERE id = ?
        `, [match.next_match_id]);

        if (nextMatch.length > 0) {
          const nm = nextMatch[0];
          if (!nm.player_1_id) {
            await connection.execute(`
              UPDATE matches SET player_1_id = ? WHERE id = ?
            `, [match.winner_id, match.next_match_id]);
            console.log(`  -> Set as player_1 in match ${match.next_match_id}`);
          } else if (!nm.player_2_id) {
            await connection.execute(`
              UPDATE matches SET player_2_id = ? WHERE id = ?
            `, [match.winner_id, match.next_match_id]);
            console.log(`  -> Set as player_2 in match ${match.next_match_id}`);
          } else {
            console.log(`  -> Both players already filled in match ${match.next_match_id}`);
          }
        }
      }
    }

    // Update round 2 matches to 'live' if both players are filled
    const [round2Matches] = await connection.execute(`
      SELECT id, player_1_id, player_2_id 
      FROM matches 
      WHERE round = 2 AND status = 'pending'
    `);

    console.log(`\nChecking ${round2Matches.length} round 2 matches for status update`);

    for (const match of round2Matches) {
      if (match.player_1_id && match.player_2_id) {
        await connection.execute(`
          UPDATE matches SET status = 'live' WHERE id = ?
        `, [match.id]);
        console.log(`Updated match ${match.id} to 'live' status`);
      }
    }

    console.log('\nBracket fix complete!');
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

fixBracket();
