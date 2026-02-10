const Notification = require("../model/notificationModel");

// Create broadcast notification (Staff/Admin only)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const staffId = req.user.id;

    const notificationTitle = title || "Library Announcement";
    const notificationMessage = message || req.body.message;

    if (!notificationMessage) {
      return res.status(400).json({ message: "Message is required" });
    }

    const notification = await Notification.create({
      title: notificationTitle,
      message: notificationMessage,
      type: type || "announcement",
      createdBy: staffId,
      isRead: false,
    });

    res.status(201).json({
      success: true,
      message: "Notification broadcasted successfully to all students",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ message: "Failed to create notification" });
  }
};

// Get all active notifications
exports.getNotifications = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    let query = { isActive: true };
    
    // For students: show all broadcast notifications (no createdBy filter needed)
    // For staff/admin: show all notifications
    if (userRole === "STUDENT") {
      query = { isActive: true };
    }
    
    const notifications = await Notification.find(query)
      .select("_id title message type createdAt isRead createdBy")
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("createdBy", "name staffId");

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// Delete notification (Staff/Admin only)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};


// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: "notificationIds array required" });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};
