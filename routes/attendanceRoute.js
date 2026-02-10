const express = require("express");
const router = express.Router();

const {
  getAttendance,
  markAttendance,
  getTodayStats,
  markAttendanceByStaff,
  getTodayPresentStudents,
  getStudentMonthlyAttendance,
  addManualAttendance,
} = require("../controller/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");

// ---------------- STUDENT ----------------
router.get("/my-attendance", authMiddleware(["STUDENT"]), getAttendance);
router.post("/scan", authMiddleware(["STUDENT"]), markAttendance);

// ---------------- STAFF/ADMIN ----------------
router.post("/staff-scan", authMiddleware(["STAFF", "ADMIN"]), markAttendanceByStaff);
router.get("/today-stats", authMiddleware(["STAFF", "ADMIN"]), getTodayStats);
router.get("/today-present", authMiddleware(["STAFF", "ADMIN"]), getTodayPresentStudents);
router.get("/student-monthly/:studentId", authMiddleware(["STAFF", "ADMIN"]), getStudentMonthlyAttendance);
router.get("/all", authMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const Attendance = require("../model/attendanceModel");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.find({ date: { $gte: today } })
      .populate('student', 'studentId name seat')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ success: true, attendance });
  } catch (err) {
    console.error("Get all attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/live", authMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const Attendance = require("../model/attendanceModel");
    const Student = require("../model/studentModel");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const liveAttendance = await Attendance.find({
      date: today,
      entryTime: { $exists: true },
      exitTime: { $exists: false },
    }).populate('student', 'studentId name seat');

    const liveStudents = liveAttendance.map(a => ({
      studentId: a.student?.studentId,
      name: a.student?.name,
      seat: a.student?.seat,
      entryTime: a.entryTime,
    })).filter(s => s.seat);

    res.json({ success: true, liveStudents });
  } catch (err) {
    console.error("Live students error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Manual attendance endpoint
router.post("/manual-add", authMiddleware(["ADMIN", "STAFF"]), addManualAttendance);
router.get("/student/:studentId", authMiddleware(["STAFF", "ADMIN"]), async (req, res) => {
  try {
    const Attendance = require("../model/attendanceModel");
    console.log('Fetching attendance for student:', req.params.studentId);
    
    // Search by student ObjectId reference
    const attendance = await Attendance.find({ student: req.params.studentId })
      .sort({ date: -1 })
      .limit(30);
    
    console.log('Found attendance records:', attendance.length);
    res.json({ success: true, attendance });
  } catch (err) {
    console.error('Get student attendance error:', err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
