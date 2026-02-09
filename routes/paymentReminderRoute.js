const express = require("express");
const router = express.Router();
const {
  sendPaymentReminder,
  sendBulkPaymentReminders,
  getExpiringStudents
} = require("../controller/paymentReminderController");
const authMiddleware = require("../middleware/authMiddleware");

// Get students with upcoming expiry
router.get("/expiring-students", authMiddleware(["ADMIN", "STAFF"]), getExpiringStudents);

// Send payment reminder to single student
router.post("/send/:studentId", authMiddleware(["ADMIN", "STAFF"]), sendPaymentReminder);

// Send bulk payment reminders
router.post("/send-bulk", authMiddleware(["ADMIN"]), sendBulkPaymentReminders);

module.exports = router;
