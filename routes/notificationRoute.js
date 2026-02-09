const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  deleteNotification,
} = require("../controller/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Students - Get all notifications (must be first)
router.get("/", authMiddleware(["STUDENT", "STAFF", "ADMIN"]), getNotifications);

// Staff/Admin - Broadcast to all students
router.post("/broadcast", authMiddleware(["STAFF", "ADMIN"]), createNotification);

// Staff/Admin - Create notification
router.post("/create", authMiddleware(["STAFF", "ADMIN"]), createNotification);

// Staff/Admin - Delete notification
router.delete("/:id", authMiddleware(["STAFF", "ADMIN"]), deleteNotification);

module.exports = router;
