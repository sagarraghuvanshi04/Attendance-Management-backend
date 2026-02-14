const Complaint = require("../model/complaintModel");
const Notification = require("../model/notificationModel");
const Staff = require("../model/staffModel");

// Create complaint/suggestion (STUDENT)
exports.createComplaint = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { type, subject, description } = req.body;

    if (!type || !subject || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const complaint = await Complaint.create({
      student: studentId,
      type,
      subject,
      description,
    });

    // Notify all staff
    const allStaff = await Staff.find({ isActive: true });
    const notificationPromises = allStaff.map(staff => 
      Notification.create({
        staff: staff._id,
        title: `New ${type} from Student`,
        message: `${subject}`,
        type: "info"
      })
    );
    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      message: `${type} submitted successfully`,
      complaint,
    });
  } catch (err) {
    console.error("Create complaint error:", err);
    res.status(500).json({ message: "Failed to submit" });
  }
};

// Get student's complaints (STUDENT)
exports.getMyComplaints = async (req, res) => {
  try {
    const studentId = req.user.id;
    const complaints = await Complaint.find({ student: studentId })
      .populate("respondedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, complaints });
  } catch (err) {
    console.error("Get complaints error:", err);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
};

// Get all complaints (STAFF/ADMIN)
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("student", "name studentId email")
      .populate("respondedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, complaints });
  } catch (err) {
    console.error("Get all complaints error:", err);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
};

// Respond to complaint (STAFF/ADMIN)
exports.respondToComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, response } = req.body;
    const staffId = req.user.id;

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      {
        status,
        response,
        respondedBy: staffId,
        respondedAt: new Date(),
      },
      { new: true }
    ).populate("student", "name studentId");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Notify student
    await Notification.create({
      student: complaint.student._id,
      title: `${complaint.type} ${status}`,
      message: response || `Your ${complaint.type.toLowerCase()} has been ${status.toLowerCase()}`,
      type: status === "Resolved" ? "success" : "info"
    });

    res.status(200).json({
      success: true,
      message: "Response submitted successfully",
      complaint,
    });
  } catch (err) {
    console.error("Respond to complaint error:", err);
    res.status(500).json({ message: "Failed to respond" });
  }
};
