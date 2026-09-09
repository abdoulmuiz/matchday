const pool = require('../config/database');
const crypto = require('crypto');

class PasswordResetToken {
  static async generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(userId) {
    const token = await this.generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.execute(query, [userId, token, expiresAt]);
    return token;
  }

  static async findByToken(token) {
    const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND expires_at > NOW() AND used = false
    `;
    const [rows] = await pool.execute(query, [token]);
    return rows[0];
  }

  static async markAsUsed(tokenId) {
    const query = 'UPDATE password_reset_tokens SET used = true WHERE id = ?';
    await pool.execute(query, [tokenId]);
  }

  static async invalidateUserTokens(userId) {
    const query = 'UPDATE password_reset_tokens SET used = true WHERE user_id = ?';
    await pool.execute(query, [userId]);
  }
}

module.exports = PasswordResetToken;
