const mysql = require('mysql2/promise');

const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

const poolConfig = {
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  // InfinityFree / some hosts close idle connections aggressively
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Set DB_SSL=true if your host requires TLS (common on managed MySQL providers)
if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
