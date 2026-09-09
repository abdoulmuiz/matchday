const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  emailVerified: user.email_verified,
  inGameId: user.in_game_id,
  profilePictureUrl: user.profile_picture_url,
  country: user.country,
  city: user.city,
  platform: user.platform,
  profileCompleted: user.profile_completed,
  userCode: user.user_code,
  isAdmin: Boolean(user.is_admin),
});

// Get profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { in_game_id, profile_picture_url, country, city, platform } = req.body;

    if (!in_game_id || in_game_id.trim() === '') {
      return res.status(400).json({ error: 'In-game ID is required' });
    }

    const validPlatforms = ['PS', 'Xbox', 'PC', 'Mobile'];
    if (platform && !validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const existing = await User.findById(req.user.userId);
    const pictureUrl =
      profile_picture_url !== undefined && profile_picture_url !== ''
        ? profile_picture_url
        : existing?.profile_picture_url || null;

    await User.updateProfile(req.user.userId, {
      in_game_id: in_game_id.trim(),
      profile_picture_url: pictureUrl,
      country,
      city,
      platform,
    });

    const updatedUser = await User.findById(req.user.userId);

    res.json({
      message: 'Profile updated successfully',
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Upload profile picture (real file upload)
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const profilePictureUrl = `/uploads/avatars/${req.file.filename}`;

    // Remove previous local avatar if we own it
    const existing = await User.findById(req.user.userId);
    if (existing?.profile_picture_url?.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', existing.profile_picture_url);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    await User.updateProfilePicture(req.user.userId, profilePictureUrl);

    res.json({
      message: 'Profile picture updated',
      profilePictureUrl,
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
};
