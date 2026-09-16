require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const app = express();

// Render / reverse proxies — needed for correct client IPs in rate limiting
app.set('trust proxy', 1);

/**
 * CORS: ALLOWED_ORIGINS is a comma-separated list of frontend origins
 * (e.g. https://your-app.vercel.app,http://localhost:3000).
 * Falls back to FRONTEND_URL, then reflects any origin in development only.
 */
function buildAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) often send no Origin
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            '[CORS] No ALLOWED_ORIGINS/FRONTEND_URL set — blocking browser origin:',
            origin
          );
          return callback(new Error('CORS not configured'));
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads are stored on Cloudinary — no local /uploads static serving

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EF MatchDay API is running' });
});

const PORT = process.env.PORT || 5000;
const Match = require('./models/Match');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EF MatchDay server running on port ${PORT}`);
  console.log(`[CORS] Allowed origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(dev: any)'}`);

  const runDeadlineCheck = async () => {
    try {
      const count = await Match.processOverdueDeadlines();
      if (count > 0) {
        console.log(`[DEADLINES] Notified ${count} overdue match(es)`);
      }
    } catch (err) {
      console.error('[DEADLINES] Check failed:', err.message);
    }
  };

  runDeadlineCheck();
  setInterval(runDeadlineCheck, 60 * 1000);
});
