const Notification = require('../models/Notification');

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.findByUserId(userId);
    
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.countUnread(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.user_id !== userId) {
      return res.status(403).json({ error: 'Not your notification' });
    }
    
    await Notification.markAsRead(id, userId);
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await Notification.markAllAsRead(userId);
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
