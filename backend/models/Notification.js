const pool = require('../config/database');

class Notification {
  static async create(userId, type, title, message, relatedTournamentId = null, relatedMatchId = null) {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, related_tournament_id, related_match_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [userId, type, title, message, relatedTournamentId, relatedMatchId]);
    return result.insertId;
  }

  /** Insert many notifications in one query. */
  static async createBulk(notifications) {
    if (!notifications || notifications.length === 0) return;

    const placeholders = notifications.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = [];
    notifications.forEach((n) => {
      values.push(
        n.userId,
        n.type,
        n.title,
        n.message,
        n.relatedTournamentId ?? null,
        n.relatedMatchId ?? null
      );
    });

    const query = `
      INSERT INTO notifications (user_id, type, title, message, related_tournament_id, related_match_id)
      VALUES ${placeholders}
    `;
    await pool.execute(query, values);
  }

  static async findByUserId(userId, limit = 50) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const [rows] = await pool.execute(query, [userId, limit]);
    return rows;
  }

  static async findUnreadByUserId(userId) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? AND is_read = FALSE 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  static async countUnread(userId) {
    const query = `
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = FALSE
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows[0].count;
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = ? AND user_id = ?
    `;
    await pool.execute(query, [id, userId]);
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = ?
    `;
    await pool.execute(query, [userId]);
  }

  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }
}

module.exports = Notification;
