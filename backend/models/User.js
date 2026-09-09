const pool = require('../config/database');

class User {
  static generateUserCode() {
    // Generate a random 11-digit number (10000000000 to 99999999999)
    const min = 10000000000;
    const max = 99999999999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  static async generateUniqueUserCode() {
    let userCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      userCode = this.generateUserCode();
      const existing = await this.findByUserCode(userCode);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique user code after multiple attempts');
    }

    return userCode;
  }

  static async findByUserCode(userCode) {
    const query = 'SELECT * FROM users WHERE user_code = ?';
    const [rows] = await pool.execute(query, [userCode]);
    return rows[0];
  }

  static async create(email, passwordHash, username) {
    const userCode = await this.generateUniqueUserCode();
    const query = `
      INSERT INTO users (email, password_hash, username, email_verified, user_code)
      VALUES (?, ?, ?, false, ?)
    `;
    const [result] = await pool.execute(query, [email, passwordHash, username, userCode]);
    return result.insertId;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = ?';
    const [rows] = await pool.execute(query, [username]);
    return rows[0];
  }

  /** Single lookup for login (email OR username). */
  static async findByEmailOrUsername(identifier) {
    const query = 'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1';
    const [rows] = await pool.execute(query, [identifier, identifier]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async markAsVerified(userId) {
    const query = 'UPDATE users SET email_verified = true WHERE id = ?';
    await pool.execute(query, [userId]);
  }

  static async updatePassword(userId, passwordHash) {
    const query = 'UPDATE users SET password_hash = ? WHERE id = ?';
    await pool.execute(query, [passwordHash, userId]);
  }

  static async updateProfile(userId, profileData) {
    const { in_game_id, profile_picture_url, country, city, platform } = profileData;
    const query = `
      UPDATE users 
      SET in_game_id = ?, 
          profile_picture_url = ?, 
          country = ?, 
          city = ?, 
          platform = ?, 
          profile_completed = true
      WHERE id = ?
    `;
    await pool.execute(query, [
      in_game_id,
      profile_picture_url || null,
      country || null,
      city || null,
      platform || null,
      userId
    ]);
  }

  static async updateProfilePicture(userId, profilePictureUrl) {
    const query = 'UPDATE users SET profile_picture_url = ? WHERE id = ?';
    await pool.execute(query, [profilePictureUrl, userId]);
  }

  static async setSuspended(userId, suspended) {
    await pool.execute('UPDATE users SET is_suspended = ? WHERE id = ?', [
      suspended ? 1 : 0,
      userId,
    ]);
  }

  /** Search users by username, email, or 11-digit user_code. */
  static async search(query, limit = 50, offset = 0) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const q = (query || '').trim();

    if (!q) {
      const [rows] = await pool.execute(
        `SELECT id, email, username, email_verified, in_game_id, profile_picture_url,
                country, city, platform, profile_completed, is_admin, is_suspended,
                user_code, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT ${lim} OFFSET ${off}`
      );
      const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM users');
      return { users: rows, total: countRows[0].total };
    }

    const like = `%${q}%`;
    const [rows] = await pool.execute(
      `SELECT id, email, username, email_verified, in_game_id, profile_picture_url,
              country, city, platform, profile_completed, is_admin, is_suspended,
              user_code, created_at
       FROM users
       WHERE username LIKE ? OR email LIKE ? OR user_code = ? OR CAST(id AS CHAR) = ?
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      [like, like, q, q]
    );
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users
       WHERE username LIKE ? OR email LIKE ? OR user_code = ? OR CAST(id AS CHAR) = ?`,
      [like, like, q, q]
    );
    return { users: rows, total: countRows[0].total };
  }

  static async getActivitySummary(userId) {
    const [created] = await pool.execute(
      `SELECT id, name, status, type, player_limit, created_at, tournament_code
       FROM tournaments
       WHERE created_by = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const [joined] = await pool.execute(
      `SELECT t.id, t.name, t.status, t.type, t.player_limit, t.created_at, t.tournament_code,
              tp.joined_at
       FROM tournament_participants tp
       JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.user_id = ?
       ORDER BY tp.joined_at DESC
       LIMIT 50`,
      [userId]
    );

    const [matches] = await pool.execute(
      `SELECT m.id, m.tournament_id, m.round, m.status, m.verification_status, m.is_forfeit,
              m.player_1_id, m.player_2_id, m.player_1_score, m.player_2_score, m.winner_id,
              m.created_at, t.name AS tournament_name,
              p1.username AS player_1_username, p2.username AS player_2_username,
              w.username AS winner_username
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       LEFT JOIN users p1 ON m.player_1_id = p1.id
       LEFT JOIN users p2 ON m.player_2_id = p2.id
       LEFT JOIN users w ON m.winner_id = w.id
       WHERE m.player_1_id = ? OR m.player_2_id = ?
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [userId, userId]
    );

    return {
      tournamentsCreated: created,
      tournamentsJoined: joined,
      matchHistory: matches,
    };
  }

  static async getPlatformAnalytics() {
    const [userCount] = await pool.execute('SELECT COUNT(*) AS total FROM users');
    const [tournamentByStatus] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM tournaments
       GROUP BY status`
    );
    const [tournamentTotal] = await pool.execute('SELECT COUNT(*) AS total FROM tournaments');
    const [signups] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY day ASC`
    );
    const [mismatchCount] = await pool.execute(
      `SELECT COUNT(*) AS total FROM matches WHERE verification_status = 'mismatch'`
    );
    const [suspendedCount] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE is_suspended = TRUE`
    );

    const statusMap = { open: 0, live: 0, completed: 0, closed: 0 };
    tournamentByStatus.forEach((row) => {
      statusMap[row.status] = Number(row.count);
    });

    // Fill missing days in last 30 for a continuous chart
    const signupByDay = {};
    signups.forEach((row) => {
      const key = String(row.day).slice(0, 10);
      signupByDay[key] = Number(row.count);
    });

    const signupSeries = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      signupSeries.push({ day: key, count: signupByDay[key] || 0 });
    }

    return {
      totalUsers: Number(userCount[0].total),
      totalTournaments: Number(tournamentTotal[0].total),
      tournamentsByStatus: statusMap,
      signupsLast30Days: signupSeries,
      openMismatches: Number(mismatchCount[0].total),
      suspendedUsers: Number(suspendedCount[0].total),
    };
  }
}

module.exports = User;
