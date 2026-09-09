const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for forgot password
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: { error: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup
router.post('/signup', authController.signup);

// Check username availability
router.get('/check-username/:username', authController.checkUsername);

// Verify email
router.get('/verify-email', authController.verifyEmail);

// Login
router.post('/login', loginLimiter, authController.login);

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

// Get current user
router.get('/me', auth, authController.me);

module.exports = router;
