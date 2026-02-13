const StaffAttendance = require("../model/staffAttendanceModel");

// Mark staff attendance (check-in/check-out)
exports.markStaffAttendance = async (req, res) => {
  try {
    const staffId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await StaffAttendance.findOne({
      staff: staffId,
      date: today,
    });

    if (!attendance) {
      // First scan - Check In
      attendance = await StaffAttendance.create({
        staff: staffId,
        date: today,
        checkIn: new Date(),
        status: "Present",
      });
      return res.json({
        success: true,
        message: "Checked in successfully",
        type: "checkIn",
        attendance,
      });
    } else if (!attendance.checkOut) {
      // Second scan - Check Out
      attendance.checkOut = new Date();
      const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
      attendance.workingHours = parseFloat(hours.toFixed(2));
      await attendance.save();
      
      return res.json({
        success: true,
        message: `Checked out successfully. Working hours: ${attendance.workingHours} hrs`,
        type: "checkOut",
        attendance,
      });
    } else {
      return res.status(400).json({
        message: "Already checked out for today",
      });
    }
  } catch (err) {
    console.error("Staff attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's all staff attendance (Admin)
exports.getTodayAllStaffAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const Staff = require("../model/staffModel");
    const allStaff = await Staff.find({ isActive: true });

    const attendance = await StaffAttendance.find({
      date: { $gte: today, $lt: tomorrow },
    }).populate("staff", "staffId name role");

    const attendanceMap = new Map();
    attendance.forEach(a => {
      attendanceMap.set(a.staff._id.toString(), a);
    });

    const result = allStaff.map(staff => {
      const att = attendanceMap.get(staff._id.toString());
      if (att) {
        return att;
      }
      return {
        _id: staff._id,
        staff: staff,
        staffId: staff.staffId,
        name: staff.name,
        status: "Absent",
        date: today,
      };
    });

    res.json({ success: true, attendance: result });
  } catch (err) {
    console.error("Get today staff attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all staff attendance (Admin)
exports.getAllStaffAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await StaffAttendance.find({ date: { $gte: today } })
      .populate("staff", "staffId name role shift")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, attendance });
  } catch (err) {
    console.error("Get staff attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get my attendance (Staff)
exports.getMyAttendance = async (req, res) => {
  try {
    const staffId = req.user.id;
    const attendance = await StaffAttendance.find({ staff: staffId })
      .sort({ date: -1 })
      .limit(30);

    res.json({ success: true, attendance });
  } catch (err) {
    console.error("Get my attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get staff attendance by ID (Admin)
exports.getStaffAttendanceById = async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log('Fetching attendance for staff ID:', staffId);
    
    const attendance = await StaffAttendance.find({ staff: staffId })
      .sort({ date: -1 })
      .limit(100);

    console.log('Found attendance records:', attendance.length);
    res.json({ success: true, attendance });
  } catch (err) {
    console.error("Get staff attendance by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Auto mark staff absent at 12 PM
exports.markStaffAbsentAtNoon = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const Staff = require("../model/staffModel");
    const allStaff = await Staff.find({ isActive: true });
    console.log(`📊 Total active staff: ${allStaff.length}`);

    let markedCount = 0;
    for (const staff of allStaff) {
      const existing = await StaffAttendance.findOne({
        staff: staff._id,
        date: today,
      });

      if (!existing) {
        await StaffAttendance.create({
          staff: staff._id,
          date: today,
          status: "Absent",
        });
        markedCount++;
      }
    }

    console.log(`✅ Auto absent marking for staff completed - ${markedCount} staff marked absent`);
  } catch (error) {
    console.error("❌ Auto absent marking for staff failed:", error);
  }
};
