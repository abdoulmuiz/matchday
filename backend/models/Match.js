const pool = require('../config/database');
const Notification = require('./Notification');

class Match {
  static async create(tournamentId, round, player1Id = null, player2Id = null) {
    const query = `
      INSERT INTO matches (tournament_id, round, player_1_id, player_2_id)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [tournamentId, round, player1Id, player2Id]);
    return result.insertId;
  }

  static async findById(id) {
    const query = `
      SELECT m.*, 
             p1.username as player_1_username,
             p1.profile_picture_url as player_1_picture,
             p2.username as player_2_username,
             p2.profile_picture_url as player_2_picture,
             w.username as winner_username
      FROM matches m
      LEFT JOIN users p1 ON m.player_1_id = p1.id
      LEFT JOIN users p2 ON m.player_2_id = p2.id
      LEFT JOIN users w ON m.winner_id = w.id
      WHERE m.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByTournament(tournamentId) {
    const query = `
      SELECT m.*, 
             p1.username as player_1_username,
             p1.profile_picture_url as player_1_picture,
             p2.username as player_2_username,
             p2.profile_picture_url as player_2_picture,
             w.username as winner_username
      FROM matches m
      LEFT JOIN users p1 ON m.player_1_id = p1.id
      LEFT JOIN users p2 ON m.player_2_id = p2.id
      LEFT JOIN users w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round ASC, m.id ASC
    `;
    const [rows] = await pool.execute(query, [tournamentId]);
    return rows;
  }

  static async findByRound(tournamentId, round) {
    const query = `
      SELECT m.*, 
             p1.username as player_1_username,
             p1.profile_picture_url as player_1_picture,
             p2.username as player_2_username,
             p2.profile_picture_url as player_2_picture,
             w.username as winner_username
      FROM matches m
      LEFT JOIN users p1 ON m.player_1_id = p1.id
      LEFT JOIN users p2 ON m.player_2_id = p2.id
      LEFT JOIN users w ON m.winner_id = w.id
      WHERE m.tournament_id = ? AND m.round = ?
      ORDER BY m.id ASC
    `;
    const [rows] = await pool.execute(query, [tournamentId, round]);
    return rows;
  }

  static async updateNextMatchId(matchId, nextMatchId) {
    const query = 'UPDATE matches SET next_match_id = ? WHERE id = ?';
    await pool.execute(query, [nextMatchId, matchId]);
  }

  static async updateResult(matchId, player1Score, player2Score, winnerId) {
    const query = `
      UPDATE matches 
      SET player_1_score = ?, player_2_score = ?, winner_id = ?, status = 'completed'
      WHERE id = ?
    `;
    await pool.execute(query, [player1Score, player2Score, winnerId, matchId]);
  }

  static async updateResultManual(matchId, player1Score, player2Score, winnerId, editedBy) {
    const query = `
      UPDATE matches 
      SET player_1_score = ?, player_2_score = ?, winner_id = ?, status = 'completed', manually_edited = TRUE, edited_by = ?
      WHERE id = ?
    `;
    await pool.execute(query, [player1Score, player2Score, winnerId, editedBy, matchId]);
  }

  static async updateResultDirect(matchId, player1Score, player2Score, winnerId, submittedBy) {
    const query = `
      UPDATE matches 
      SET player_1_score = ?, player_2_score = ?, winner_id = ?, status = 'completed', direct_input = TRUE, submitted_by = ?
      WHERE id = ?
    `;
    await pool.execute(query, [player1Score, player2Score, winnerId, submittedBy, matchId]);
  }

  static async updateStatus(matchId, status) {
    const query = 'UPDATE matches SET status = ? WHERE id = ?';
    await pool.execute(query, [status, matchId]);
  }

  /**
   * Mark a match live and set deadline from tournament.match_time_limit (minutes).
   * No-op for deadline if tournament has no time limit.
   */
  static async activateMatch(matchId, executor = pool) {
    const [rows] = await executor.execute(
      `SELECT m.id, m.status, m.player_1_id, m.player_2_id, t.match_time_limit
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.id = ?`,
      [matchId]
    );
    const match = rows[0];
    if (!match) return null;
    if (!match.player_1_id || !match.player_2_id) return match;
    if (match.status === 'completed') return match;

    if (match.match_time_limit) {
      // Only set deadline when first becoming active — do not reset an existing one
      await executor.execute(
        `UPDATE matches
         SET status = 'live',
             match_deadline = COALESCE(match_deadline, DATE_ADD(NOW(), INTERVAL ? MINUTE))
         WHERE id = ? AND status != 'completed'`,
        [match.match_time_limit, matchId]
      );
    } else {
      await executor.execute(
        `UPDATE matches SET status = 'live' WHERE id = ? AND status != 'completed'`,
        [matchId]
      );
    }
    return match;
  }

  static async activateMatches(matchIds, tournamentId, executor = pool) {
    if (!matchIds || matchIds.length === 0) return;

    const [tRows] = await executor.execute(
      'SELECT match_time_limit FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    const timeLimit = tRows[0]?.match_time_limit;
    const placeholders = matchIds.map(() => '?').join(',');

    if (timeLimit) {
      await executor.execute(
        `UPDATE matches
         SET status = 'live',
             match_deadline = COALESCE(match_deadline, DATE_ADD(NOW(), INTERVAL ? MINUTE))
         WHERE id IN (${placeholders})
           AND player_1_id IS NOT NULL
           AND player_2_id IS NOT NULL
           AND status != 'completed'`,
        [timeLimit, ...matchIds]
      );
    } else {
      await executor.execute(
        `UPDATE matches
         SET status = 'live'
         WHERE id IN (${placeholders})
           AND player_1_id IS NOT NULL
           AND player_2_id IS NOT NULL
           AND status != 'completed'`,
        matchIds
      );
    }
  }

  static async extendDeadline(matchId, additionalMinutes) {
    const minutes = parseInt(additionalMinutes, 10);
    if (!minutes || minutes < 1) {
      throw new Error('Additional minutes must be at least 1');
    }
    await pool.execute(
      `UPDATE matches
       SET match_deadline = DATE_ADD(GREATEST(COALESCE(match_deadline, NOW()), NOW()), INTERVAL ? MINUTE),
           deadline_notified = FALSE
       WHERE id = ? AND status != 'completed'`,
      [minutes, matchId]
    );
  }

  static async forceForfeit(matchId, winnerId) {
    await pool.execute(
      `UPDATE matches
       SET winner_id = ?,
           status = 'completed',
           verification_status = 'organizer_resolved',
           is_forfeit = TRUE,
           player_1_score = NULL,
           player_2_score = NULL
       WHERE id = ?`,
      [winnerId, matchId]
    );
  }

  /** Find overdue incomplete matches that have not been notified yet, notify once. */
  static async processOverdueDeadlines() {
    // Activate ready pending matches in live tournaments (sets deadlines if configured)
    const [ready] = await pool.execute(
      `SELECT m.id
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.status = 'pending'
         AND m.player_1_id IS NOT NULL
         AND m.player_2_id IS NOT NULL
         AND t.status = 'live'`
    );
    for (const row of ready) {
      await this.activateMatch(row.id);
    }

    // Backfill deadlines for already-live matches that never got one
    await pool.execute(
      `UPDATE matches m
       JOIN tournaments t ON t.id = m.tournament_id
       SET m.match_deadline = DATE_ADD(NOW(), INTERVAL t.match_time_limit MINUTE),
           m.deadline_notified = FALSE
       WHERE m.status = 'live'
         AND m.match_deadline IS NULL
         AND t.match_time_limit IS NOT NULL
         AND t.match_time_limit > 0
         AND m.player_1_id IS NOT NULL
         AND m.player_2_id IS NOT NULL
         AND t.status = 'live'`
    );

    const [overdue] = await pool.execute(
      `SELECT m.id, m.player_1_id, m.player_2_id, m.tournament_id, m.round,
              t.created_by, t.name AS tournament_name, t.match_time_limit
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.match_deadline IS NOT NULL
         AND m.match_deadline <= NOW()
         AND m.status != 'completed'
         AND m.deadline_notified = FALSE
         AND m.player_1_id IS NOT NULL
         AND m.player_2_id IS NOT NULL`
    );

    if (overdue.length === 0) return 0;

    for (const match of overdue) {
      const title = 'Match Time Limit Reached';
      const message = `The time limit for a Round ${match.round} match in "${match.tournament_name}" has been reached and the match is still incomplete. Please play/resolve it, or wait for the organizer.`;

      const recipients = new Set(
        [match.player_1_id, match.player_2_id, match.created_by].filter(Boolean)
      );

      await Notification.createBulk(
        [...recipients].map((userId) => ({
          userId,
          type: 'match_deadline_reached',
          title,
          message,
          relatedTournamentId: match.tournament_id,
          relatedMatchId: match.id,
        }))
      );

      await pool.execute(
        'UPDATE matches SET deadline_notified = TRUE WHERE id = ?',
        [match.id]
      );
    }

    return overdue.length;
  }

  static async updatePlayers(matchId, player1Id, player2Id) {
    const query = `
      UPDATE matches 
      SET player_1_id = ?, player_2_id = ?
      WHERE id = ?
    `;
    await pool.execute(query, [player1Id, player2Id, matchId]);
  }

  static async advanceWinner(winnerId, nextMatchId) {
    const match = await this.findById(nextMatchId);
    if (!match) return;
    
    let updated = false;
    if (!match.player_1_id) {
      const query = 'UPDATE matches SET player_1_id = ? WHERE id = ?';
      await pool.execute(query, [winnerId, nextMatchId]);
      updated = true;
    } else if (!match.player_2_id) {
      const query = 'UPDATE matches SET player_2_id = ? WHERE id = ?';
      await pool.execute(query, [winnerId, nextMatchId]);
      updated = true;
    }

    // If both players are now filled, activate match (live + deadline)
    if (updated) {
      const updatedMatch = await this.findById(nextMatchId);
      if (updatedMatch.player_1_id && updatedMatch.player_2_id && updatedMatch.status === 'pending') {
        await this.activateMatch(nextMatchId);
      }
    }
  }

  static async generateBracket(tournamentId, participants) {
    console.log(`[BRACKET GENERATION] Starting bracket generation for tournament ${tournamentId} with ${participants.length} participants`);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const participantCount = shuffled.length;
      const rounds = Math.log2(participantCount);

      if (!Number.isInteger(rounds) || rounds < 1) {
        throw new Error('Participant count must be a power of 2');
      }

      // Build all match rows in memory, then bulk insert
      const matchRows = []; // { round, player1Id, player2Id, roundIndex }

      for (let i = 0; i < participantCount; i += 2) {
        matchRows.push({
          round: 1,
          player1Id: shuffled[i].user_id,
          player2Id: shuffled[i + 1]?.user_id || null,
        });
      }

      for (let round = 2; round <= rounds; round++) {
        const matchesInRound = Math.pow(2, rounds - round);
        for (let i = 0; i < matchesInRound; i++) {
          matchRows.push({
            round,
            player1Id: null,
            player2Id: null,
          });
        }
      }

      const placeholders = matchRows.map(() => '(?, ?, ?, ?)').join(', ');
      const values = [];
      matchRows.forEach((row) => {
        values.push(tournamentId, row.round, row.player1Id, row.player2Id);
      });

      const [insertResult] = await connection.execute(
        `INSERT INTO matches (tournament_id, round, player_1_id, player_2_id) VALUES ${placeholders}`,
        values
      );

      const firstId = insertResult.insertId;
      const allMatchIds = matchRows.map((_, index) => firstId + index);

      // Group IDs by round in creation order
      const idsByRound = {};
      let cursor = 0;
      for (let round = 1; round <= rounds; round++) {
        const count = Math.pow(2, rounds - round);
        idsByRound[round] = allMatchIds.slice(cursor, cursor + count);
        cursor += count;
      }

      // Bulk link previous round → next round
      const linkPairs = [];
      for (let round = 1; round < rounds; round++) {
        const previous = idsByRound[round];
        const next = idsByRound[round + 1];
        for (let i = 0; i < previous.length; i++) {
          const nextMatchId = next[Math.floor(i / 2)];
          if (nextMatchId) {
            linkPairs.push([previous[i], nextMatchId]);
          }
        }
      }

      if (linkPairs.length > 0) {
        const caseSql = linkPairs.map(() => 'WHEN ? THEN ?').join(' ');
        const inPlaceholders = linkPairs.map(() => '?').join(',');
        const caseValues = [];
        const ids = [];
        linkPairs.forEach(([matchId, nextId]) => {
          caseValues.push(matchId, nextId);
          ids.push(matchId);
        });

        await connection.execute(
          `UPDATE matches SET next_match_id = CASE id ${caseSql} END WHERE id IN (${inPlaceholders})`,
          [...caseValues, ...ids]
        );
      }

      // Activate round 1 matches (live + optional deadline from tournament time limit)
      await this.activateMatches(idsByRound[1], tournamentId, connection);

      await connection.commit();
      console.log(`[BRACKET GENERATION] Completed for tournament ${tournamentId}. Total matches: ${allMatchIds.length}`);
      return allMatchIds;
    } catch (error) {
      await connection.rollback();
      console.error(`[BRACKET GENERATION] Failed for tournament ${tournamentId}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateScreenshot(matchId, playerNumber, screenshotUrl) {
    const column = playerNumber === 1 ? 'player_1_screenshot_url' : 'player_2_screenshot_url';
    const query = `UPDATE matches SET ${column} = ? WHERE id = ?`;
    await pool.execute(query, [screenshotUrl, matchId]);
  }

  static async updateReportedScore(matchId, playerNumber, reportedScore) {
    const column = playerNumber === 1 ? 'player_1_reported_score' : 'player_2_reported_score';
    const query = `UPDATE matches SET ${column} = ? WHERE id = ?`;
    await pool.execute(query, [reportedScore, matchId]);
  }

  static async updateVerificationStatus(matchId, status) {
    const query = 'UPDATE matches SET verification_status = ? WHERE id = ?';
    await pool.execute(query, [status, matchId]);
  }

  static async verifyScores(matchId) {
    const match = await this.findById(matchId);
    
    if (!match.player_1_reported_score || !match.player_2_reported_score) {
      return { verified: false, reason: 'Both scores not submitted' };
    }

    // Check if either score is UNCLEAR
    if (match.player_1_reported_score === 'UNCLEAR' || match.player_2_reported_score === 'UNCLEAR') {
      await this.updateVerificationStatus(matchId, 'mismatch');
      
      // Send mismatch_flagged notification to tournament organizer
      const tournament = await pool.execute('SELECT * FROM tournaments WHERE id = ?', [match.tournament_id]);
      if (tournament[0]) {
        await Notification.create(
          tournament[0].created_by,
          'mismatch_flagged',
          'Match Result Mismatch',
          'A match result could not be automatically verified. Please review and resolve it.',
          match.tournament_id,
          matchId
        );
      }
      
      return { verified: false, reason: 'Unclear score detected' };
    }

    // Parse scores
    const [score1_p1, score1_p2] = match.player_1_reported_score.split('-').map(Number);
    const [score2_p1, score2_p2] = match.player_2_reported_score.split('-').map(Number);

    // Check if scores agree (player 1's reported score should match player 2's from their perspective)
    // Player 1 reports: X-Y (their score - opponent's score)
    // Player 2 reports: Y-X (their score - opponent's score)
    const scoresAgree = (score1_p1 === score2_p2) && (score1_p2 === score2_p1);

    if (scoresAgree) {
      // Determine winner
      const winnerId = score1_p1 > score1_p2 ? match.player_1_id : match.player_2_id;
      const loserId = score1_p1 > score1_p2 ? match.player_2_id : match.player_1_id;
      
      // Update match with final result
      await this.updateResult(matchId, score1_p1, score1_p2, winnerId);
      await this.updateVerificationStatus(matchId, 'auto_verified');
      
      // Send match_won notification to winner
      await Notification.create(
        winnerId,
        'match_won',
        'Match Won!',
        `Congratulations! You won your match ${score1_p1}-${score1_p2}. You have advanced to the next round.`,
        match.tournament_id,
        matchId
      );
      
      // Send match_lost notification to loser
      await Notification.create(
        loserId,
        'match_lost',
        'Match Lost',
        `You lost your match ${score1_p2}-${score1_p1}. Better luck next time!`,
        match.tournament_id,
        matchId
      );
      
      // Advance winner to next match
      if (match.next_match_id) {
        await this.advanceWinner(winnerId, match.next_match_id);
      }
      
      return { verified: true, winnerId };
    } else {
      await this.updateVerificationStatus(matchId, 'mismatch');
      
      // Send mismatch_flagged notification to tournament organizer
      const tournament = await pool.execute('SELECT * FROM tournaments WHERE id = ?', [match.tournament_id]);
      if (tournament[0]) {
        await Notification.create(
          tournament[0].created_by,
          'mismatch_flagged',
          'Match Result Mismatch',
          'A match result could not be automatically verified. Please review and resolve it.',
          match.tournament_id,
          matchId
        );
      }
      
      return { verified: false, reason: 'Scores do not match' };
    }
  }

  static async findByVerificationStatus(tournamentId, status) {
    const query = `
      SELECT m.*, 
             p1.username as player_1_username,
             p2.username as player_2_username
      FROM matches m
      LEFT JOIN users p1 ON m.player_1_id = p1.id
      LEFT JOIN users p2 ON m.player_2_id = p2.id
      WHERE m.tournament_id = ? AND m.verification_status = ?
      ORDER BY m.round ASC, m.id ASC
    `;
    const [rows] = await pool.execute(query, [tournamentId, status]);
    return rows;
  }

  static async resolveMismatch(matchId, winnerId) {
    const match = await this.findById(matchId);
    
    // Use the reported score from the winner's perspective
    let finalScore1, finalScore2;
    
    if (winnerId === match.player_1_id && match.player_1_reported_score) {
      const [s1, s2] = match.player_1_reported_score.split('-').map(Number);
      finalScore1 = s1;
      finalScore2 = s2;
    } else if (winnerId === match.player_2_id && match.player_2_reported_score) {
      const [s1, s2] = match.player_2_reported_score.split('-').map(Number);
      finalScore1 = s2; // Reverse since it's from player 2's perspective
      finalScore2 = s1;
    } else {
      // Fallback: use whichever reported score exists
      if (match.player_1_reported_score && match.player_1_reported_score !== 'UNCLEAR') {
        const [s1, s2] = match.player_1_reported_score.split('-').map(Number);
        finalScore1 = s1;
        finalScore2 = s2;
      } else if (match.player_2_reported_score && match.player_2_reported_score !== 'UNCLEAR') {
        const [s1, s2] = match.player_2_reported_score.split('-').map(Number);
        finalScore1 = s2;
        finalScore2 = s1;
      } else {
        throw new Error('No valid reported score available');
      }
    }
    
    await this.updateResult(matchId, finalScore1, finalScore2, winnerId);
    await this.updateVerificationStatus(matchId, 'organizer_resolved');
    
    if (match.next_match_id) {
      await this.advanceWinner(winnerId, match.next_match_id);
    }
    
    return { winnerId, finalScore1, finalScore2 };
  }

  /** All platform mismatches for the admin dispute queue. */
  static async findAllMismatches() {
    const query = `
      SELECT m.*,
             p1.username AS player_1_username,
             p1.profile_picture_url AS player_1_picture,
             p2.username AS player_2_username,
             p2.profile_picture_url AS player_2_picture,
             t.name AS tournament_name,
             t.created_by AS organizer_id,
             org.username AS organizer_username
      FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      JOIN users org ON org.id = t.created_by
      LEFT JOIN users p1 ON m.player_1_id = p1.id
      LEFT JOIN users p2 ON m.player_2_id = p2.id
      WHERE m.verification_status = 'mismatch'
      ORDER BY m.created_at DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }
}

module.exports = Match;
