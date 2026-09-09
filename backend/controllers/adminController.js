const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const pool = require('../config/database');

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  emailVerified: Boolean(user.email_verified),
  inGameId: user.in_game_id,
  profilePictureUrl: user.profile_picture_url,
  country: user.country,
  city: user.city,
  platform: user.platform,
  profileCompleted: Boolean(user.profile_completed),
  isAdmin: Boolean(user.is_admin),
  isSuspended: Boolean(user.is_suspended),
  userCode: user.user_code,
  createdAt: user.created_at,
});

const getAnalytics = async (req, res) => {
  try {
    const analytics = await User.getPlatformAnalytics();
    res.json({ analytics });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { q, limit, offset } = req.query;
    const result = await User.search(q, limit, offset);
    res.json({
      users: result.users.map(serializeUser),
      total: Number(result.total),
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activity = await User.getActivitySummary(user.id);
    res.json({
      user: serializeUser(user),
      activity,
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const setUserSuspended = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;
    const adminId = req.user.userId;

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ error: 'suspended must be a boolean' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === adminId) {
      return res.status(400).json({ error: 'You cannot suspend your own account' });
    }

    if (user.is_admin) {
      return res.status(400).json({ error: 'Cannot suspend an admin account' });
    }

    await User.setSuspended(user.id, suspended);
    const updated = await User.findById(user.id);

    res.json({
      message: suspended ? 'User suspended' : 'User restored',
      user: serializeUser(updated),
    });
  } catch (error) {
    console.error('Admin suspend user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const listTournaments = async (req, res) => {
  try {
    const { status, type, limit, offset } = req.query;
    const result = await Tournament.findForAdmin({
      status: status || null,
      type: type || null,
      limit,
      offset,
    });
    res.json(result);
  } catch (error) {
    console.error('Admin list tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participants = await Tournament.getParticipants(id);
    await pool.execute('DELETE FROM tournaments WHERE id = ?', [id]);

    if (participants.length > 0) {
      const notificationMessage = reason
        ? `"${tournament.name}" has been deleted by platform admin. Reason: ${reason}`
        : `"${tournament.name}" has been deleted by platform admin.`;

      await Notification.createBulk(
        participants.map((participant) => ({
          userId: participant.user_id,
          type: 'tournament_joined',
          title: 'Tournament Deleted',
          message: notificationMessage,
          relatedTournamentId: null,
          relatedMatchId: null,
        }))
      );
    }

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Admin delete tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const listMismatches = async (req, res) => {
  try {
    const mismatches = await Match.findAllMismatches();
    res.json({ mismatches });
  } catch (error) {
    console.error('Admin list mismatches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBranding = async (req, res) => {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const branding = await SiteSettings.getBranding();
    res.json({ branding });
  } catch (error) {
    console.error('Admin get branding error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const SiteSettings = require('../models/SiteSettings');

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;
    const previous = await SiteSettings.get('logo_url');

    if (previous && previous.startsWith('/uploads/branding/logo-')) {
      const oldPath = path.join(__dirname, '..', previous);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    await SiteSettings.set('logo_url', logoUrl);
    res.json({
      message: 'Logo updated',
      branding: await SiteSettings.getBranding(),
    });
  } catch (error) {
    console.error('Admin upload logo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetLogo = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const SiteSettings = require('../models/SiteSettings');

    const previous = await SiteSettings.get('logo_url');
    if (previous && previous.startsWith('/uploads/branding/logo-')) {
      const oldPath = path.join(__dirname, '..', previous);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    await SiteSettings.set('logo_url', null);
    res.json({
      message: 'Logo reset to default',
      branding: await SiteSettings.getBranding(),
    });
  } catch (error) {
    console.error('Admin reset logo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadFavicon = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const SiteSettings = require('../models/SiteSettings');

    if (!req.file) {
      return res.status(400).json({ error: 'No favicon file provided' });
    }

    const faviconUrl = `/uploads/branding/${req.file.filename}`;
    const previous = await SiteSettings.get('favicon_url');

    if (previous && previous.startsWith('/uploads/branding/favicon-')) {
      const oldPath = path.join(__dirname, '..', previous);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    await SiteSettings.set('favicon_url', faviconUrl);
    res.json({
      message: 'Favicon updated',
      branding: await SiteSettings.getBranding(),
    });
  } catch (error) {
    console.error('Admin upload favicon error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetFavicon = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const SiteSettings = require('../models/SiteSettings');

    const previous = await SiteSettings.get('favicon_url');
    if (previous && previous.startsWith('/uploads/branding/favicon-')) {
      const oldPath = path.join(__dirname, '..', previous);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    await SiteSettings.set('favicon_url', null);
    res.json({
      message: 'Favicon removed',
      branding: await SiteSettings.getBranding(),
    });
  } catch (error) {
    console.error('Admin reset favicon error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAnalytics,
  listUsers,
  getUser,
  setUserSuspended,
  listTournaments,
  deleteTournament,
  listMismatches,
  getBranding,
  uploadLogo,
  resetLogo,
  uploadFavicon,
  resetFavicon,
};
