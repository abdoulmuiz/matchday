const pool = require('../config/database');

class SiteSettings {
  static async get(key) {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM site_settings WHERE setting_key = ?',
      [key]
    );
    return rows[0]?.setting_value ?? null;
  }

  static async set(key, value) {
    await pool.execute(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value]
    );
  }

  static async getBranding() {
    const logoUrl = await this.get('logo_url');
    const faviconUrl = await this.get('favicon_url');
    return {
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
    };
  }
}

module.exports = SiteSettings;
