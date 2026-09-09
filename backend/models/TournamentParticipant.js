const pool = require('../config/database');

class TournamentParticipant {
  static async join(tournamentId, userId) {
    const query = `
      INSERT INTO tournament_participants (tournament_id, user_id)
      VALUES (?, ?)
    `;
    const [result] = await pool.execute(query, [tournamentId, userId]);
    return result.insertId;
  }

  static async leave(tournamentId, userId) {
    const query = `
      DELETE FROM tournament_participants 
      WHERE tournament_id = ? AND user_id = ?
    `;
    await pool.execute(query, [tournamentId, userId]);
  }

  static async findByTournament(tournamentId) {
    const query = `
      SELECT tp.*, u.username, u.profile_picture_url
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.joined_at ASC
    `;
    const [rows] = await pool.execute(query, [tournamentId]);
    return rows;
  }

  static async findByUser(userId) {
    const query = `
      SELECT tp.*, t.name as tournament_name, t.status as tournament_status
      FROM tournament_participants tp
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE tp.user_id = ?
      ORDER BY tp.joined_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }
}

module.exports = TournamentParticipant;
