const Attendance = require("../model/attendanceModel");
const Student = require("../model/studentModel");

// ---------------- GET STUDENT ATTENDANCE ----------------
exports.getAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attendance = await Attendance
      .find({ student: studentId })
      .sort({ date: -1 });

    const totalPresent = attendance.filter(a => a.status === "Present").length;
    const totalDays = attendance.length;
    const attendancePercentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

    res.status(200).json({ 
      success: true,
      attendance,
      stats: {
        totalPresent,
        totalDays,
        attendancePercentage
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
};

// ---------------- GET TODAY STATS (FOR STAFF) ----------------
exports.getTodayStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Attendance.countDocuments({ date: today });

    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// ---------------- MARK ATTENDANCE ----------------
exports.markAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;  
    const { staffId } = req.body;   

    if (!staffId) {
      return res.status(400).json({ message: "Invalid QR code" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      student: studentId,
      date: today,
    });

    // FIRST SCAN → ENTRY
    if (!attendance) {
      attendance = new Attendance({
        student: studentId,
        staff: staffId,
        date: today,
        entryTime: now,
        status: "Present",
      });

      await attendance.save();

      return res.status(201).json({
        success: true,
        message: `Welcome ${student.name}! Entry marked at ${now.toLocaleTimeString()}`,
        type: "ENTRY",
        attendance,
      });
    }

    // SECOND SCAN → EXIT
    if (attendance.entryTime && !attendance.exitTime) {
      attendance.exitTime = now;

      const diffMs = attendance.exitTime - attendance.entryTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      attendance.workingHours = Number(diffHours.toFixed(2));

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: `Goodbye ${student.name}! Exit marked. Total hours: ${attendance.workingHours}`,
        type: "EXIT",
        attendance,
      });
    }

    // THIRD SCAN → BLOCK
    return res.status(400).json({
      message: "Attendance already completed for today",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Attendance marking failed" });
  }
};

// ---------------- GET TODAY'S PRESENT STUDENTS (ADMIN) ----------------
exports.getTodayPresentStudents = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const presentStudents = await Attendance.find({
      date: today,
      status: "Present"
    })
    .populate('student', 'studentId name email seat')
    .sort({ entryTime: -1 });

    const students = presentStudents
      .filter(a => a.student)
      .map(a => ({
        _id: a.student._id,
        studentId: a.student.studentId,
        name: a.student.name,
        email: a.student.email,
        seat: a.student.seat,
        entryTime: a.entryTime
      }));

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Error in getTodayPresentStudents:", error);
    res.status(500).json({ success: false, message: "Failed to fetch present students" });
  }
};

// ---------------- GET STUDENT MONTHLY ATTENDANCE (ADMIN) ----------------
exports.getStudentMonthlyAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, parseInt(month) + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const totalPresent = attendance.filter(a => a.status === "Present").length;
    const totalAbsent = attendance.filter(a => a.status === "Absent").length;

    res.status(200).json({
      success: true,
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        seat: student.seat
      },
      attendance,
      stats: {
        totalPresent,
        totalAbsent,
        totalDays: attendance.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch student attendance" });
  }
};

// ---------------- MARK ATTENDANCE BY STAFF ----------------
exports.markAttendanceByStaff = async (req, res) => {
  try {
    const staffId = req.user.id;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID required" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      student: student._id,
      date: today,
    });

    // FIRST SCAN → ENTRY
    if (!attendance) {
      attendance = new Attendance({
        student: student._id,
        staff: staffId,
        date: today,
        entryTime: now,
        status: "Present",
      });

      await attendance.save();

      return res.status(201).json({
        success: true,
        message: `Welcome ${student.name}! Entry marked`,
        type: "ENTRY",
        student: { name: student.name, studentId: student.studentId },
      });
    }

    // SECOND SCAN → EXIT
    if (attendance.entryTime && !attendance.exitTime) {
      attendance.exitTime = now;

      const diffMs = attendance.exitTime - attendance.entryTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      attendance.workingHours = Number(diffHours.toFixed(2));

      await attendance.save();

      return res.status(200).json({
        success: true,
        message: `Goodbye ${student.name}! Exit marked. Hours: ${attendance.workingHours}`,
        type: "EXIT",
        student: { name: student.name, studentId: student.studentId },
      });
    }

    // THIRD SCAN → BLOCK
    return res.status(400).json({
      message: "Attendance already completed for today",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Attendance marking failed" });
  }
};

// -------- MANUAL ATTENDANCE ADD (ADMIN/STAFF) --------
exports.addManualAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    const markedBy = req.user.role;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: "Student ID, date, and status required" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      student: student._id,
      date: attendanceDate,
    });

    if (existing) {
      return res.status(400).json({ message: "Attendance already exists for this date" });
    }

    const attendance = new Attendance({
      student: student._id,
      staff: req.user.id,
      date: attendanceDate,
      status,
      markedBy,
      entryTime: new Date(),
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: `Attendance marked as ${status}`,
      attendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add attendance" });
  }
};

// -------- AUTO MARK ABSENT AT 12 PM --------
exports.markAbsentAtNoon = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allStudents = await Student.find({ status: "Active" });

    for (const student of allStudents) {
      const existing = await Attendance.findOne({
        student: student._id,
        date: today,
      });

      if (!existing) {
        await Attendance.create({
          student: student._id,
          staff: "SYSTEM",
          date: today,
          status: "Absent",
          markedBy: "SYSTEM",
        });
      }
    }

    console.log("✅ Auto absent marking completed");
  } catch (error) {
    console.error("❌ Auto absent marking failed:", error);
  }
};
