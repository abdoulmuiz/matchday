const pool = require('../config/database');

class Tournament {
  static generateTournamentCode() {
    // Generate a 6-character alphanumeric code (uppercase letters and numbers)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async generateUniqueTournamentCode() {
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!isUnique && attempts < maxAttempts) {
      code = this.generateTournamentCode();
      // Check if code exists only among active tournaments (open or live)
      const existing = await this.findByCodeAmongActive(code);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique tournament code after multiple attempts');
    }

    return code;
  }

  static async findByCodeAmongActive(code) {
    const query = `
      SELECT * FROM tournaments 
      WHERE tournament_code = ? AND status IN ('open', 'live')
    `;
    const [rows] = await pool.execute(query, [code]);
    return rows[0];
  }

  static async findByCode(code) {
    const query = `
      SELECT * FROM tournaments 
      WHERE tournament_code = ?
      ORDER BY 
        CASE WHEN status IN ('open', 'live') THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [code]);
    return rows[0];
  }

  static async create(name, description, playerLimit, createdBy, matchTimeLimit = null, type = 'open', pin = null) {
    const tournamentCode = await this.generateUniqueTournamentCode();
    const query = `
      INSERT INTO tournaments (name, description, player_limit, created_by, match_time_limit, type, pin, tournament_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [name, description, playerLimit, createdBy, matchTimeLimit, type, pin, tournamentCode]);
    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM tournaments WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findAll(limit = null, userId = null) {
    let query = `
      SELECT t.*, 
             COALESCE(pc.participant_count, 0) as participant_count,
             u.username as creator_username
      FROM tournaments t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS participant_count
        FROM tournament_participants
        GROUP BY tournament_id
      ) pc ON pc.tournament_id = t.id
      ORDER BY t.created_at DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit, 10)}`;
    }
    
    const [rows] = await pool.execute(query);
    return this.attachParticipationFlags(rows, userId);
  }

  static async findByStatus(status, limit = null, userId = null) {
    let query = `
      SELECT t.*, 
             COALESCE(pc.participant_count, 0) as participant_count,
             u.username as creator_username
      FROM tournaments t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS participant_count
        FROM tournament_participants
        GROUP BY tournament_id
      ) pc ON pc.tournament_id = t.id
      WHERE t.status = ?
      ORDER BY t.created_at DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit, 10)}`;
    }
    
    const [rows] = await pool.execute(query, [status]);
    return this.attachParticipationFlags(rows, userId);
  }

  static async attachParticipationFlags(rows, userId) {
    if (!userId || rows.length === 0) {
      return rows;
    }

    const tournamentIds = rows.map(r => r.id);
    const participationQuery = `
      SELECT tournament_id
      FROM tournament_participants
      WHERE tournament_id IN (${tournamentIds.map(() => '?').join(',')}) AND user_id = ?
    `;
    const [participationRows] = await pool.execute(participationQuery, [...tournamentIds, userId]);
    
    const participationMap = {};
    participationRows.forEach(row => {
      participationMap[row.tournament_id] = true;
    });
    
    return rows.map(row => ({
      ...row,
      is_participant: !!participationMap[row.id]
    }));
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE tournaments SET status = ? WHERE id = ?';
    await pool.execute(query, [status, id]);
  }

  static async getParticipants(tournamentId) {
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

  /** Batch-load participants for many tournaments in one query (avoids N+1). */
  static async getParticipantsForTournaments(tournamentIds) {
    if (!tournamentIds || tournamentIds.length === 0) {
      return {};
    }

    const query = `
      SELECT tp.*, u.username, u.profile_picture_url
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id IN (${tournamentIds.map(() => '?').join(',')})
      ORDER BY tp.joined_at ASC
    `;
    const [rows] = await pool.execute(query, tournamentIds);
    const grouped = {};
    tournamentIds.forEach(id => { grouped[id] = []; });
    rows.forEach(row => {
      if (!grouped[row.tournament_id]) grouped[row.tournament_id] = [];
      grouped[row.tournament_id].push(row);
    });
    return grouped;
  }

  static async getParticipantCount(tournamentId) {
    const query = 'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?';
    const [rows] = await pool.execute(query, [tournamentId]);
    return rows[0].count;
  }

  static async isUserParticipant(tournamentId, userId) {
    const query = `
      SELECT 1 FROM tournament_participants 
      WHERE tournament_id = ? AND user_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [tournamentId, userId]);
    return rows.length > 0;
  }

  static async removeParticipant(tournamentId, userId) {
    const query = `
      DELETE FROM tournament_participants 
      WHERE tournament_id = ? AND user_id = ?
    `;
    await pool.execute(query, [tournamentId, userId]);
  }

  static async updatePin(tournamentId, pin) {
    const query = 'UPDATE tournaments SET pin = ? WHERE id = ?';
    await pool.execute(query, [pin, tournamentId]);
  }

  static async search(searchTerm, userId = null) {
    const query = `
      SELECT t.*, 
             COALESCE(pc.participant_count, 0) as participant_count,
             u.username as creator_username
      FROM tournaments t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS participant_count
        FROM tournament_participants
        GROUP BY tournament_id
      ) pc ON pc.tournament_id = t.id
      WHERE t.name LIKE ? 
         OR CAST(t.id AS CHAR) LIKE ? 
         OR u.username LIKE ?
         OR t.tournament_code LIKE ?
      ORDER BY 
        CASE WHEN t.status IN ('open', 'live') THEN 0 ELSE 1 END,
        t.created_at DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    const [rows] = await pool.execute(query, [searchPattern, searchPattern, searchPattern, searchPattern]);
    return this.attachParticipationFlags(rows, userId);
  }

  /** Platform-wide tournament list for admins with optional status/type filters. */
  static async findForAdmin({ status = null, type = null, limit = 100, offset = 0 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const clauses = [];
    const params = [];

    if (status) {
      clauses.push('t.status = ?');
      params.push(status);
    }
    if (type) {
      clauses.push('t.type = ?');
      params.push(type);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT t.*,
              COALESCE(pc.participant_count, 0) AS participant_count,
              u.username AS creator_username,
              u.email AS creator_email
       FROM tournaments t
       JOIN users u ON t.created_by = u.id
       LEFT JOIN (
         SELECT tournament_id, COUNT(*) AS participant_count
         FROM tournament_participants
         GROUP BY tournament_id
       ) pc ON pc.tournament_id = t.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM tournaments t ${where}`,
      params
    );

    return { tournaments: rows, total: Number(countRows[0].total) };
  }
}

module.exports = Tournament;
