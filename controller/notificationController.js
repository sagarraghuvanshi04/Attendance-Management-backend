const Notification = require("../model/notificationModel");

// Create broadcast notification (Staff/Admin only)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const staffId = req.user.id;

    // If only message is provided, use default title
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

// Get all active notifications (Students)
exports.getNotifications = async (req, res) => {
  try {
    const studentId = req.user?.id;
    
    // Get both broadcast notifications (no student field) and student-specific notifications
    const notifications = await Notification.find({ 
      isActive: true,
      $or: [
        { student: { $exists: false } },
        { student: null },
        { student: studentId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
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
