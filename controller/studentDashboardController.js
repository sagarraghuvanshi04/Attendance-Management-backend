const Students = require("../model/studentModel");
const Attendance = require("../model/attendanceModel");
const Notification = require("../model/notificationModel");

exports.getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Students.findById(userId).select(
      "name studentId course year shift expiry status seat paymentStatus"
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate days left
    const expiryDate = student.expiry ? new Date(student.expiry) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : 0;

    const [todayAttendance, totalPresent, totalDays, notifications] = await Promise.all([
      Attendance.findOne({ student: student._id, date: today }),
      Attendance.countDocuments({ student: student._id, status: "Present" }),
      Attendance.countDocuments({ student: student._id }),
      Notification.find().sort({ createdAt: -1 }).limit(3)
    ]);

    const attendancePercentage = totalDays === 0 ? 0 : Math.round((totalPresent / totalDays) * 100);

    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    };

    res.status(200).json({
      success: true,
      student: {
        name: student.name,
        studentId: student.studentId,
        course: student.course,
        year: student.year,
        shift: student.shift || "Full Day",
        seat: student.seat || "N/A",
        expiryDate: formatDate(student.expiry),
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        paymentStatus: student.paymentStatus || "Paid",
        status: student.status,
        announcements: notifications.map(n => ({
          title: n.title,
          date: formatDate(n.createdAt),
          type: n.type || 'info'
        })),
        rules: [
          "Maintain complete silence in study areas",
          "Mobile phones must be on silent mode",
          "No food or drinks in reading zones",
          "Keep your seat clean and organized",
          "Return borrowed books on time"
        ]
      },
      todayAttendance: {
        present: todayAttendance ? true : false,
        entryTime: todayAttendance?.entryTime || null,
        exitTime: todayAttendance?.exitTime || null
      },
      stats: {
        totalDays,
        totalPresent,
        attendancePercentage,
      },
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load dashboard", 
      error: error.message 
    });
  }
};