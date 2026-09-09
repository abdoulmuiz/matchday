const pool = require('../config/database');
const crypto = require('crypto');

class VerificationToken {
  static async generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(userId) {
    const token = await this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const query = `
      INSERT INTO verification_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.execute(query, [userId, token, expiresAt]);
    return token;
  }

  static async findByToken(token) {
    const query = `
      SELECT * FROM verification_tokens 
      WHERE token = ? AND expires_at > NOW() AND used = false
    `;
    const [rows] = await pool.execute(query, [token]);
    return rows[0];
  }

  static async findByTokenIncludingUsed(token) {
    const query = `
      SELECT * FROM verification_tokens 
      WHERE token = ?
    `;
    const [rows] = await pool.execute(query, [token]);
    return rows[0];
  }

  static async markAsUsed(tokenId) {
    const query = 'UPDATE verification_tokens SET used = true WHERE id = ?';
    await pool.execute(query, [tokenId]);
  }
}

module.exports = VerificationToken;
