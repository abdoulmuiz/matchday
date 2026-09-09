require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EF MatchDay API is running' });
});

const PORT = process.env.PORT || 5000;
const Match = require('./models/Match');

app.listen(PORT, () => {
  console.log(`EF MatchDay server running on port ${PORT}`);

  // Check overdue match deadlines every 60s (also runs opportunistically on match fetches)
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
