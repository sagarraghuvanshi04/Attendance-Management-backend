const WorkNotification = require("../model/workNotificationModel");

// Helper — called internally from other controllers
exports.createNotification = async ({ recipient, type, title, message, relatedRecord }) => {
  try {
    await WorkNotification.create({ recipient, type, title, message, relatedRecord });
  } catch (err) {
    // Non-critical — don't throw
    console.error("Notification create error:", err.message);
  }
};

// GET /work/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await WorkNotification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await WorkNotification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /work/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await WorkNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /work/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await WorkNotification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
