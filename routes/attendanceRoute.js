const express = require("express");
const router = express.Router();

const {
  getAttendance,
  markAttendance,
  getTodayStats,
  markAttendanceByStaff,
  getTodayPresentStudents,
  getTodayAllStudents,
  getTodayArrivals,
  getTodayDepartures,
  getStudentMonthlyAttendance,
  addManualAttendance,
  addManualExit,
} = require("../controller/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");

// ---------------- STUDENT ----------------
router.get("/my-attendance", authMiddleware(["STUDENT"]), getAttendance);
router.post("/scan", authMiddleware(["STUDENT"]), markAttendance);

// ---------------- STAFF/ADMIN ----------------
router.post("/staff-scan", authMiddleware(["STAFF", "ADMIN"]), markAttendanceByStaff);
router.get("/today-stats", authMiddleware(["STAFF", "ADMIN"]), getTodayStats);
router.get("/today-present", authMiddleware(["STAFF", "ADMIN"]), getTodayPresentStudents);
router.get("/today-all", authMiddleware(["STAFF", "ADMIN"]), getTodayAllStudents);
router.get("/today-arrivals", authMiddleware(["STAFF", "ADMIN"]), getTodayArrivals);
router.get("/today-departures", authMiddleware(["STAFF", "ADMIN"]), getTodayDepartures);
router.get("/live-students", authMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const Attendance = require("../model/attendanceModel");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const liveStudents = await Attendance.find({
      date: today,
      entryTime: { $exists: true },
      exitTime: { $exists: false },
      status: "Present"
    })
    .populate('student', 'studentId name seat')
    .sort({ entryTime: -1 });

    const students = liveStudents
      .filter(a => a.student)
      .map(a => ({
        _id: a.student._id,
        studentId: a.student.studentId,
        name: a.student.name,
        seat: a.student.seat,
        status: "Present",
        entryTime: a.entryTime,
        exitTime: null,
        workingHours: 0
      }));

    res.status(200).json({ success: true, liveStudents: students });
  } catch (err) {
    console.error("Live students error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
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

// Manual exit endpoint
router.post("/manual-exit", authMiddleware(["ADMIN", "STAFF"]), addManualExit);

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
