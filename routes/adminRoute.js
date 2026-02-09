const express = require("express");
const router = express.Router();

const { loginAdmin, getDashboardStats, getReportsData } = require("../controller/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// Admin login
router.post("/login", loginAdmin);

router.get("/dashboard", authMiddleware("ADMIN"), getDashboardStats);
router.get("/reports", authMiddleware("ADMIN"), getReportsData);

// Profile routes
router.get("/profile", authMiddleware("ADMIN"), async (req, res) => {
  try {
    const Staff = require("../model/staffModel");
    const admin = await Staff.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", authMiddleware("ADMIN"), async (req, res) => {
  try {
    const Staff = require("../model/staffModel");
    const { name, email, phone, profilePic } = req.body;
    const admin = await Staff.findByIdAndUpdate(
      req.user.id,
      { name, email, phone, profilePic },
      { new: true }
    ).select("-password");
    res.json({ success: true, message: "Profile updated successfully", admin });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Search students
router.get("/students", authMiddleware("ADMIN"), async (req, res) => {
  try {
    const Student = require("../model/studentModel");
    const { search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return res.json({ success: true, students: [] });
    }

    const students = await Student.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ]
    }).limit(10).select("name studentId email _id");

    res.json({ success: true, students });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
