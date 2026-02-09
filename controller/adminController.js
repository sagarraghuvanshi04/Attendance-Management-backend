// backend/controller/adminController.js

const Staff = require("../model/staffModel");
const Student = require("../model/studentModel");
const Payment = require("../model/paymentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ----------------- ADMIN LOGIN -----------------
exports.loginAdmin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ message: "AdminId and password required" });
    }

    // Include password because schema hides it
    const admin = await Staff.findOne({
      staffId: adminId,
      role: "ADMIN",
      isActive: true,
    }).select("+password");

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        staffId: admin.staffId,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------- REPORTS DATA -----------------
exports.getReportsData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate;
    let dataPoints;

    if (timeRange === "Last 30 Days") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      dataPoints = 4; // 4 weeks
    } else {
      // Last 6 Months
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 6);
      dataPoints = 6;
    }

    // Generate chart data
    const chartData = [];
    for (let i = 0; i < dataPoints; i++) {
      let periodStart, periodEnd, label;

      if (timeRange === "Last 30 Days") {
        periodStart = new Date(startDate);
        periodStart.setDate(periodStart.getDate() + (i * 7));
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        label = `Week ${i + 1}`;
      } else {
        periodStart = new Date(startDate);
        periodStart.setMonth(periodStart.getMonth() + i);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        label = periodStart.toLocaleDateString('en-US', { month: 'short' });
      }

      const revenue = await Payment.aggregate([
        { $match: { createdAt: { $gte: periodStart, $lt: periodEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const students = await Student.countDocuments({
        createdAt: { $lte: periodEnd },
      });

      chartData.push({
        month: label,
        revenue: revenue[0]?.total || 0,
        students,
      });
    }

    // Plan distribution
    const fullDay = await Student.countDocuments({ shift: "Full Day (8 AM - 8 PM)" });
    const morning = await Student.countDocuments({ shift: "Morning (8 AM - 2 PM)" });
    const evening = await Student.countDocuments({ shift: "Evening (2 PM - 8 PM)" });
    const total = fullDay + morning + evening || 1;

    const planData = [
      { name: "Full Day", value: Math.round((fullDay / total) * 100), color: "#4F46E5" },
      { name: "Morning", value: Math.round((morning / total) * 100), color: "#10B981" },
      { name: "Evening", value: Math.round((evening / total) * 100), color: "#F59E0B" },
    ];

    // KPI calculations
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const currentRevenue = await Payment.aggregate([
      { $match: { createdAt: { $gte: currentMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const lastRevenue = await Payment.aggregate([
      { $match: { createdAt: { $gte: lastMonth, $lt: currentMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const currentRev = currentRevenue[0]?.total || 0;
    const lastRev = lastRevenue[0]?.total || 1;
    const revenueGrowth = (((currentRev - lastRev) / lastRev) * 100).toFixed(1);

    const currentStudents = await Student.countDocuments();
    const lastMonthStudents = await Student.countDocuments({ createdAt: { $lt: currentMonth } });
    const growthRate = lastMonthStudents > 0 ? (((currentStudents - lastMonthStudents) / lastMonthStudents) * 100).toFixed(1) : 0;

    const activeStudents = await Student.countDocuments({ status: "Active" });
    const retention = currentStudents > 0 ? ((activeStudents / currentStudents) * 100).toFixed(0) : 0;

    res.status(200).json({
      success: true,
      chartData,
      planData,
      kpis: {
        monthlyRevenue: currentRev,
        revenueGrowth: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}%`,
        growthRate: `${growthRate}%`,
        growthRateChange: `+${(growthRate / 5).toFixed(1)}%`,
        retention: `${retention}%`,
        retentionChange: "+2.1%",
      },
    });
  } catch (error) {
    console.error("Reports data error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------- DASHBOARD STATS -----------------
exports.getDashboardStats = async (req, res) => {
  try {
    const Attendance = require("../model/attendanceModel");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total students
    const totalStudents = await Student.countDocuments();

    // Active students (currently in library)
    const activeStudents = await Attendance.countDocuments({
      date: today,
      entryTime: { $exists: true },
      exitTime: { $exists: false },
    });

    // Total staff (excluding admin)
    const totalStaff = await Staff.countDocuments({ role: { $ne: "ADMIN" }, isActive: true });

    // Revenue for current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const revenueThisMonth = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenue = revenueThisMonth[0]?.total || 0;

    // Today's revenue
    const todayRevenue = await Payment.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todayRevenueAmount = todayRevenue[0]?.total || 0;

    // Today's attendance count
    const todayAttendance = await Attendance.countDocuments({ date: today });

    // Available seats
    const totalSeats = 60;
    
    // Occupied seats list
    const occupiedSeats = await Student.find({ status: "Active" })
      .select('seat')
      .lean();
    const occupiedSeatNumbers = occupiedSeats.map(s => s.seat).filter(Boolean);
    console.log("Total Active Students:", await Student.countDocuments({ status: "Active" }));
    console.log("Occupied Seats Array:", occupiedSeatNumbers);
    
    const availableSeats = totalSeats - occupiedSeatNumbers.length;
    console.log("Available Seats Calculation:", availableSeats);

    // Recent students (last 5)
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentId name email createdAt isActive');

    // Recent payments (last 5)
    const recentPayments = await Payment.find()
      .populate('student', 'studentId name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('amount method createdAt');

    // Recent attendance (last 10)
    const recentAttendance = await Attendance.find()
      .populate('student', 'studentId name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('student entryTime exitTime date workingHours');

    // Last 7 days revenue chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRevenue = await Payment.aggregate([
        { $match: { createdAt: { $gte: date, $lt: nextDate } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue[0]?.total || 0,
      });
    }

    // Last 7 days attendance chart data
    const last7DaysAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dayAttendance = await Attendance.countDocuments({ date });

      last7DaysAttendance.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayAttendance,
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        totalStaff,
        revenue,
        availableSeats,
        todayRevenue: todayRevenueAmount,
        todayAttendance,
        totalSeats,
        occupiedSeats: occupiedSeatNumbers,
      },
      recentStudents,
      recentPayments,
      recentAttendance,
      charts: {
        revenueChart: last7Days,
        attendanceChart: last7DaysAttendance,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
