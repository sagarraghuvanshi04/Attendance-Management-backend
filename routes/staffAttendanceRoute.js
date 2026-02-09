const express = require("express");
const router = express.Router();
const {
  markStaffAttendance,
  getAllStaffAttendance,
  getMyAttendance,
  getStaffAttendanceById,
} = require("../controller/staffAttendanceController");
const authMiddleware = require("../middleware/authMiddleware");

// Staff - Mark attendance (check-in/check-out)
router.post("/mark", authMiddleware(["STAFF", "ADMIN"]), markStaffAttendance);

// Staff - Get my attendance
router.get("/my", authMiddleware(["STAFF", "ADMIN"]), getMyAttendance);

// Admin - Get all staff attendance
router.get("/all", authMiddleware(["ADMIN"]), getAllStaffAttendance);

// Admin - Get staff attendance by ID
router.get("/staff/:staffId", authMiddleware(["ADMIN"]), getStaffAttendanceById);

module.exports = router;
