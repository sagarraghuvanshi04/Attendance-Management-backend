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
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (page - 1) * limit;
    const students = await Student.find()
      .select("name studentId email seat status shift course year expiry aadharLast4")
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();
    
    res.json({ success: true, students, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", authMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const Staff = require("../model/staffModel");
    const { search } = req.query;
    
    let query = { role: { $ne: "ADMIN" } };
    if (search) {
      query = {
        role: { $ne: "ADMIN" },
        $or: [
          { name: { $regex: search, $options: "i" } },
          { staffId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      };
    }
    
    const staff = await Staff.find(query)
      .select("name staffId email role shift")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, staff });
  } catch (err) {
    console.error("Staff search error:", err);
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
