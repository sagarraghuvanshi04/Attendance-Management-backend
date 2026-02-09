const express = require("express");
const {
  createStaff,
  loginStaff,
  updateStaff,
  getStaffProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getDashboardActivity,
  getAttendanceLogs
} = require("../controller/staffController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ---------- PUBLIC ----------
router.post("/login", loginStaff);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// ---------- PROTECTED ----------
router.get("/profile", authMiddleware(["STAFF", "ADMIN"]), getStaffProfile);

router.get("/activity", authMiddleware(["STAFF", "ADMIN"]), getDashboardActivity);

router.get("/attendance", authMiddleware(["STAFF", "ADMIN"]), getAttendanceLogs);

router.get("/students", authMiddleware(["STAFF", "ADMIN"]), async (req, res) => {
  try {
    const Student = require("../model/studentModel");
    const { search } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      };
    }
    
    const students = await Student.find(query).select("name studentId email seat").limit(10);
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", authMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const Staff = require("../model/staffModel");
    const staff = await Staff.find({ role: { $ne: "ADMIN" } }).select("-password -otp -otpExpires").sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:staffId", authMiddleware(["ADMIN", "STAFF"]), async (req, res) => {
  try {
    const Staff = require("../model/staffModel");
    const staff = await Staff.findOne({ staffId: req.params.staffId }).select("-password -otp -otpExpires");
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/change-password", authMiddleware(["STAFF", "ADMIN"]), changePassword);

router.put("/update/:staffId", authMiddleware(["ADMIN", "STAFF"]), updateStaff);

router.post("/create", authMiddleware(["ADMIN"]), createStaff);

module.exports = router;
