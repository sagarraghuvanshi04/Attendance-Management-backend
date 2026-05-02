const WorkAttendance = require("../model/workAttendanceModel");
const User = require("../model/userModel");
const logger = require("../utils/logger");
const { createNotification } = require("./workNotificationController");

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---- PUNCH IN ----
exports.punchIn = async (req, res) => {
  try {
    const { selfie, latitude, longitude, address } = req.body;
    if (!selfie) return res.status(400).json({ message: "Selfie is required" });

    const today = todayStart();
    const existing = await WorkAttendance.findOne({ employee: req.user.id, date: today });
    if (existing && existing.punchIn) return res.status(400).json({ message: "Already punched in today" });

    const now = new Date();
    let record = existing || new WorkAttendance({ employee: req.user.id, date: today });
    record.punchIn = now;
    record.punchInSelfie = selfie;
    record.punchInLocation = { latitude, longitude, address };
    record.shiftStatus = "Incomplete";
    record.validationStatus = "Pending";
    await record.save();
    logger.info(`Punch IN: user=${req.user.id} at ${now.toISOString()}`);
    res.status(201).json({ success: true, message: "Punched in successfully", record });
  } catch (err) {
    logger.error(`punchIn error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

// ---- PUNCH OUT ----
exports.punchOut = async (req, res) => {
  try {
    const { selfie, latitude, longitude, address } = req.body;
    if (!selfie) return res.status(400).json({ message: "Selfie is required" });

    const today = todayStart();
    const record = await WorkAttendance.findOne({ employee: req.user.id, date: today });
    if (!record || !record.punchIn) return res.status(400).json({ message: "Punch in first" });
    if (record.punchOut) return res.status(400).json({ message: "Already punched out today" });

    const now = new Date();
    record.punchOut = now;
    record.punchOutSelfie = selfie;
    record.punchOutLocation = { latitude, longitude, address };

    const diffHours = (now - record.punchIn) / (1000 * 60 * 60);
    record.workingHours = parseFloat(diffHours.toFixed(2));
    record.shiftStatus = diffHours >= 8 ? "Completed" : "Incomplete";
    await record.save();
    logger.info(`Punch OUT: user=${req.user.id} hours=${record.workingHours}`);
    res.json({ success: true, message: "Punched out successfully", record });
  } catch (err) {
    logger.error(`punchOut error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

// ---- GET MY ATTENDANCE ----
exports.getMyAttendance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { employee: req.user.id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const records = await WorkAttendance.find(filter).sort({ date: -1 }).limit(60);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- GET TODAY STATUS ----
exports.getTodayStatus = async (req, res) => {
  try {
    const today = todayStart();
    const record = await WorkAttendance.findOne({ employee: req.user.id, date: today });
    res.json({ success: true, record: record || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- REQUEST OVERTIME ----
exports.requestOT = async (req, res) => {
  try {
    const { otHours, otRemarks } = req.body;
    const today = todayStart();
    const record = await WorkAttendance.findOne({ employee: req.user.id, date: today });
    if (!record || !record.punchIn) return res.status(400).json({ message: "No attendance record for today" });
    if (record.otStatus === "Pending" || record.otStatus === "Approved") {
      return res.status(400).json({ message: "OT request already submitted" });
    }
    record.otRequested = true;
    record.otHours = otHours || 0;
    record.otStatus = "Pending";
    record.otRemarks = otRemarks || "";
    await record.save();

    // Notify manager if assigned
    const employee = await User.findById(req.user.id).select("name managerId");
    if (employee?.managerId) {
      await createNotification({
        recipient: employee.managerId,
        type: "OT_REQUEST",
        title: "New OT Request",
        message: `${employee.name} has requested ${otHours}h overtime for today.${ otRemarks ? ` Reason: ${otRemarks}` : ""}`,
        relatedRecord: record._id,
      });
    }

    res.json({ success: true, message: "OT request submitted", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- MANAGER: GET TEAM ATTENDANCE ----
exports.getTeamAttendance = async (req, res) => {
  try {
    const { from, to, date } = req.query;
    const teamMembers = await User.find({ managerId: req.user.id }).select("_id name email department");
    const ids = teamMembers.map(u => u._id);

    const filter = { employee: { $in: ids } };
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      filter.date = d;
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await WorkAttendance.find(filter)
      .populate("employee", "name email department")
      .sort({ date: -1 });

    res.json({ success: true, records, team: teamMembers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- MANAGER/ADMIN: GET PENDING OT REQUESTS ----
exports.getPendingOT = async (req, res) => {
  try {
    let filter = { otStatus: "Pending" };
    if (req.user.role === "MANAGER") {
      const team = await User.find({ managerId: req.user.id }).select("_id");
      filter.employee = { $in: team.map(u => u._id) };
    }
    const records = await WorkAttendance.find(filter)
      .populate("employee", "name email department")
      .sort({ date: -1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- MANAGER/ADMIN: APPROVE/REJECT OT ----
exports.handleOT = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const record = await WorkAttendance.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.otStatus = action;
    record.otApprovedBy = req.user.id;
    record.otRemarks = remarks || "";
    await record.save();

    // Fire notification to employee
    await createNotification({
      recipient: record.employee,
      type: action === "Approved" ? "OT_APPROVED" : "OT_REJECTED",
      title: `Overtime ${action}`,
      message: `Your overtime request for ${new Date(record.date).toLocaleDateString()} has been ${action.toLowerCase()}.${ remarks ? ` Remarks: ${remarks}` : ""}`,
      relatedRecord: record._id,
    });

    res.json({ success: true, message: `OT ${action}`, record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- MANAGER/ADMIN: VALIDATE ATTENDANCE ----
exports.validateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { validationStatus, validationRemarks } = req.body;
    const record = await WorkAttendance.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.validationStatus = validationStatus;
    record.validatedBy = req.user.id;
    record.validationRemarks = validationRemarks || "";
    await record.save();
    res.json({ success: true, message: "Attendance validated", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- ADMIN: GET ALL ATTENDANCE ----
exports.getAllAttendance = async (req, res) => {
  try {
    const { from, to, userId, date } = req.query;
    const filter = {};
    if (userId) filter.employee = userId;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      filter.date = d;
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const records = await WorkAttendance.find(filter)
      .populate("employee", "name email role department")
      .populate("validatedBy", "name")
      .sort({ date: -1 })
      .limit(200);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- ADMIN: GET ALL USERS ----
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("managerId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- ADMIN: UPDATE USER ----
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.password;
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- ADMIN: DELETE USER ----
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- REPORT: DAILY ATTENDANCE ----
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    let filter = { date: reportDate };

    if (req.user.role === "EMPLOYEE") {
      filter.employee = req.user.id;
    } else if (req.user.role === "MANAGER") {
      const team = await User.find({ managerId: req.user.id }).select("_id");
      filter.employee = { $in: team.map(u => u._id) };
    }

    const records = await WorkAttendance.find(filter)
      .populate("employee", "name email department role")
      .populate("validatedBy", "name");

    res.json({ success: true, date: reportDate, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
