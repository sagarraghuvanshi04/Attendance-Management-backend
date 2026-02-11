const Attendance = require("../model/attendanceModel");
const Student = require("../model/studentModel");

// ---------------- GET STUDENT ATTENDANCE ----------------
exports.getAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const attendance = await Attendance
      .find({ student: studentId })
      .sort({ date: 1 });

    // Generate all dates from registration to today
    const regDate = new Date(student.createdAt);
    const registrationDate = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate(), 0, 0, 0, 0);
    
    const todayDate = new Date();
    const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0, 0);

    const allDates = [];
    const currentDate = new Date(registrationDate);
    while (currentDate <= today) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Map attendance records by date (normalized)
    const attendanceMap = {};
    attendance.forEach(a => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      const dateKey = d.getTime();
      // Keep STAFF/ADMIN records over SYSTEM records for same date
      if (!attendanceMap[dateKey] || a.markedBy !== 'SYSTEM') {
        attendanceMap[dateKey] = a.toObject ? a.toObject() : a;
      }
    });

    // Fill missing dates with absent
    const completeAttendance = allDates.map(date => {
      const dateKey = date.getTime();
      if (attendanceMap[dateKey]) {
        return attendanceMap[dateKey];
      } else {
        return {
          student: studentId,
          date: date,
          status: "Absent",
          markedBy: "SYSTEM"
        };
      }
    });

    const totalPresent = completeAttendance.filter(a => a.status === "Present").length;
    const totalDays = completeAttendance.length;
    const attendancePercentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

    res.status(200).json({ 
      success: true,
      attendance: completeAttendance,
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
        markedBy: "STUDENT",
      });

      await attendance.save();

      return res.status(201).json({
        success: true,
        message: `Welcome ${student.name}! Entry marked at ${now.toLocaleTimeString()}`,
        type: "ENTRY",
        attendance,
      });
    }

    // If record exists but is SYSTEM marked (auto absent), update it to Present with entry time
    if (attendance.markedBy === "SYSTEM" && attendance.status === "Absent" && !attendance.entryTime) {
      attendance.entryTime = now;
      attendance.status = "Present";
      attendance.markedBy = "STUDENT";
      attendance.staff = staffId;

      await attendance.save();

      return res.status(200).json({
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

// -------- GET TODAY'S ARRIVALS (STUDENTS WHO ENTERED TODAY) --------
exports.getTodayArrivals = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const arrivals = await Attendance.find({
      date: today,
      entryTime: { $exists: true },
      status: "Present"
    })
    .populate('student', 'studentId name seat')
    .sort({ entryTime: -1 });

    const students = arrivals
      .filter(a => a.student)
      .map(a => ({
        _id: a.student._id,
        studentId: a.student.studentId,
        name: a.student.name,
        seat: a.student.seat,
        status: "Present",
        entryTime: a.entryTime,
        exitTime: a.exitTime,
        workingHours: a.workingHours || 0
      }));

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Error in getTodayArrivals:", error);
    res.status(500).json({ success: false, message: "Failed to fetch arrivals" });
  }
};

// -------- GET TODAY'S DEPARTURES (STUDENTS WHO LEFT TODAY) --------
exports.getTodayDepartures = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departures = await Attendance.find({
      date: today,
      exitTime: { $exists: true },
      status: "Present"
    })
    .populate('student', 'studentId name seat')
    .sort({ exitTime: -1 });

    const students = departures
      .filter(a => a.student)
      .map(a => ({
        _id: a.student._id,
        studentId: a.student.studentId,
        name: a.student.name,
        seat: a.student.seat,
        status: "Present",
        entryTime: a.entryTime,
        exitTime: a.exitTime,
        workingHours: a.workingHours || 0
      }));

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Error in getTodayDepartures:", error);
    res.status(500).json({ success: false, message: "Failed to fetch departures" });
  }
};

// -------- GET TODAY'S ALL STUDENTS WITH STATUS --------
exports.getTodayAllStudents = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allStudents = await Student.find({ status: "Active" })
      .select("studentId name seat")
      .lean();

    const todayAttendance = await Attendance.find({ date: today })
      .select("student status entryTime exitTime workingHours")
      .lean();

    const attendanceMap = {};
    todayAttendance.forEach(a => {
      attendanceMap[a.student.toString()] = a;
    });

    const studentsWithStatus = allStudents.map(student => {
      const att = attendanceMap[student._id.toString()];
      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        seat: student.seat,
        status: att?.status || "Not Marked",
        entryTime: att?.entryTime || null,
        exitTime: att?.exitTime || null,
        workingHours: att?.workingHours || 0
      };
    });

    res.status(200).json({ success: true, students: studentsWithStatus });
  } catch (error) {
    console.error("Error in getTodayAllStudents:", error);
    res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

// -------- GET TODAY'S PRESENT STUDENTS (ADMIN) --------
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
        markedBy: "STAFF",
      });

      await attendance.save();

      return res.status(201).json({
        success: true,
        message: `Welcome ${student.name}! Entry marked`,
        type: "ENTRY",
        student: { name: student.name, studentId: student.studentId },
      });
    }

    // If record exists but is SYSTEM marked (auto absent), update it to Present with entry time
    if (attendance.markedBy === "SYSTEM" && attendance.status === "Absent" && !attendance.entryTime) {
      attendance.entryTime = now;
      attendance.status = "Present";
      attendance.markedBy = "STAFF";
      attendance.staff = staffId;

      await attendance.save();

      return res.status(200).json({
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
    const { studentId, date, status, entryTime, exitTime } = req.body;
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

    // If existing record is SYSTEM marked absent, update it
    if (existing && existing.markedBy === "SYSTEM" && existing.status === "Absent") {
      existing.status = status;
      existing.markedBy = markedBy;
      existing.staff = req.user.id;
      existing.entryTime = entryTime ? new Date(entryTime) : new Date();
      existing.exitTime = exitTime ? new Date(exitTime) : null;

      if (existing.entryTime && existing.exitTime) {
        const diffMs = existing.exitTime - existing.entryTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        existing.workingHours = Number(diffHours.toFixed(2));
      }

      await existing.save();

      return res.status(200).json({
        success: true,
        message: `Attendance updated to ${status}`,
        attendance: existing,
      });
    }

    if (existing) {
      return res.status(400).json({ message: "Attendance already done for this date" });
    }

    const attendance = new Attendance({
      student: student._id,
      staff: req.user.id,
      date: attendanceDate,
      status,
      markedBy,
      entryTime: entryTime ? new Date(entryTime) : new Date(),
      exitTime: exitTime ? new Date(exitTime) : null,
    });

    if (attendance.entryTime && attendance.exitTime) {
      const diffMs = attendance.exitTime - attendance.entryTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      attendance.workingHours = Number(diffHours.toFixed(2));
    }

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

// -------- MANUAL EXIT (ADMIN/STAFF) --------
exports.addManualExit = async (req, res) => {
  try {
    const { studentId, date, exitTime } = req.body;

    if (!studentId || !date || !exitTime) {
      return res.status(400).json({ message: "Student ID, date, and exit time required" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      student: student._id,
      date: attendanceDate,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found for this date" });
    }

    if (!attendance.entryTime) {
      return res.status(400).json({ message: "Entry time not set" });
    }

    attendance.exitTime = new Date(exitTime);
    const diffMs = attendance.exitTime - attendance.entryTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    attendance.workingHours = Number(diffHours.toFixed(2));

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Exit time added successfully",
      attendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add exit time" });
  }
};

// -------- AUTO MARK ABSENT AT LIBRARY OPENING (6:30 AM) --------
exports.markAbsentAtNoon = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active students
    const allStudents = await Student.find({ status: "Active" });
    console.log(`📊 Total active students: ${allStudents.length}`);

    let markedCount = 0;
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
        markedCount++;
      }
    }

    console.log(`✅ Auto absent marking completed - ${markedCount} students marked absent`);
  } catch (error) {
    console.error("❌ Auto absent marking failed:", error);
  }
};

// -------- AUTO EXIT AT CLOSING TIME (11 PM) --------
exports.autoExitAtClosingTime = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const closingTime = new Date();
    closingTime.setHours(23, 0, 0, 0); // 11 PM

    // Find all students with entry but no exit
    const attendanceRecords = await Attendance.find({
      date: today,
      entryTime: { $exists: true },
      exitTime: { $exists: false },
    });

    console.log(`📊 Students with pending exit: ${attendanceRecords.length}`);

    let updatedCount = 0;
    for (const record of attendanceRecords) {
      record.exitTime = closingTime;
      const diffMs = record.exitTime - record.entryTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      record.workingHours = Number(diffHours.toFixed(2));
      await record.save();
      updatedCount++;
    }

    console.log(`✅ Auto exit at closing time completed - ${updatedCount} records updated`);
  } catch (error) {
    console.error("❌ Auto exit at closing time failed:", error);
  }
};
