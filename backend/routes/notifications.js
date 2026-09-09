const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get user's notifications
router.get('/', auth, notificationController.getNotifications);

// Get unread count
router.get('/unread-count', auth, notificationController.getUnreadCount);

// Mark notification as read
router.post('/:id/read', auth, notificationController.markAsRead);

// Mark all as read
router.post('/mark-all-read', auth, notificationController.markAllAsRead);

module.exports = router;
