const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Signup
const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validate input
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check password requirements
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least 1 number' });
    }

    // Check if user already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = await User.create(email, passwordHash, username);

    // Generate verification token
    const verificationToken = await VerificationToken.create(userId);
    const verificationLink = `${frontendUrl()}/verify-email?token=${verificationToken}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Verification link:', verificationLink);
    }

    try {
      await sendVerificationEmail(email, username, verificationLink);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      // Keep account; still return success so user can retry / we can resend later
      return res.status(201).json({
        message:
          'Account created, but we could not send the verification email. Please try again later or contact support.',
        userId,
        emailSent: false,
      });
    }

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      userId,
      emailSent: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// Check username availability
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    res.json({ available: !user });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('=== VERIFICATION REQUEST START ===');
    console.log('Token received from query:', token);
    console.log('Token length:', token ? token.length : 'null');
    console.log('Token type:', typeof token);

    if (!token) {
      console.log('ERROR: Token is null/undefined');
      return res.status(400).json({ error: 'Token required' });
    }

    console.log('Searching for token in database...');
    const tokenRecord = await VerificationToken.findByTokenIncludingUsed(token);
    console.log('Token record found:', tokenRecord ? 'YES' : 'NO');
    
    if (!tokenRecord) {
      console.log('ERROR: Token not found in database or expired');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    console.log('Token record details:', {
      id: tokenRecord.id,
      user_id: tokenRecord.user_id,
      token_in_db: tokenRecord.token,
      token_matches: tokenRecord.token === token,
      expires_at: tokenRecord.expires_at,
      used: tokenRecord.used
    });

    // Check if user is already verified (idempotent)
    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      console.log('ERROR: User not found');
      return res.status(400).json({ error: 'User not found' });
    }
    
    if (user.email_verified) {
      console.log('User already verified, returning success (idempotent)');
      console.log('=== VERIFICATION SUCCESS (ALREADY VERIFIED) ===');
      return res.json({ message: 'Email verified successfully' });
    }

    console.log('Marking user as verified, user_id:', tokenRecord.user_id);
    await User.markAsVerified(tokenRecord.user_id);
    
    // Mark token as used to prevent reuse
    if (!tokenRecord.used) {
      console.log('Marking token as used, token_id:', tokenRecord.id);
      await VerificationToken.markAsUsed(tokenRecord.id);
    }

    console.log('=== VERIFICATION SUCCESS ===');
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('=== VERIFICATION ERROR ===');
    console.error('Error details:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email or username and password required' });
    }

    // Try to find user by email first, then by username
    let user = await User.findByEmailOrUsername(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'This account has been suspended' });
    }

    const token = generateToken(user.id);

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        profileCompleted: user.profile_completed,
        isAdmin: Boolean(user.is_admin),
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    // Invalidate existing tokens
    await PasswordResetToken.invalidateUserTokens(user.id);

    // Generate new reset token
    const resetToken = await PasswordResetToken.create(user.id);
    const resetLink = `${frontendUrl()}/reset-password?token=${resetToken}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Password reset link:', resetLink);
    }

    try {
      await sendPasswordResetEmail(user.email, user.username, resetLink);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError.message);
      // Same response — don't leak whether the email exists or send failed
    }

    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    // Validate password requirements
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least 1 number' });
    }

    const tokenRecord = await PasswordResetToken.findByToken(token);
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(tokenRecord.user_id, passwordHash);
    await PasswordResetToken.markAsUsed(tokenRecord.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'This account has been suspended' });
    }

    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        emailVerified: user.email_verified,
        profileCompleted: user.profile_completed,
        isAdmin: Boolean(user.is_admin),
      } 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  signup,
  checkUsername,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  me
};
