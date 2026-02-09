const Staff = require("../model/staffModel");
const Counter = require("../model/counter");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Attendance = require("../model/attendanceModel"); 
const Student = require("../model/studentModel");
const Payment = require("../model/paymentModel");

// Helper to generate random password
const generatePassword = () => Math.random().toString(36).slice(-8);

// ------------------- CREATE STAFF -------------------
exports.createStaff = async (req, res) => {
  try {
    const { name, email, role, shift, status, phone, emailMessage } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required" });
    }

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) return res.status(400).json({ message: "Staff already exists" });

    const currentYear = new Date().getFullYear();

    // Atomic counter for staffId
    const counter = await Counter.findOneAndUpdate(
      { year: currentYear, role: "STAFF" },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    const staffId = `${currentYear}SF${String(counter.count).padStart(2, "0")}`;
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const staff = await Staff.create({
      staffId,
      name,
      email,
      password: plainPassword,
      role,
      shift: shift || "Full Day",
      status: status || "On Duty",
      phone,
      salary: req.body.salary || 15000,
    });

    // Build email
    const htmlEmail = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" style="background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
              <tr>
                <td align="center" bgcolor="#4f46e5" style="padding:40px 30px;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">SUCCESS POINT</h1>
                  <p style="color:#fff;opacity:0.9;margin:5px 0 0;font-weight:500;">Digital Library & Study Zone</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 30px;">
                  <div style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:15px;">Hi ${name}, Welcome aboard!</div>
                  <p style="font-size:16px;color:#64748b;line-height:1.6;margin-bottom:25px;">
                    ${emailMessage || "Your staff account has been created. You can now access the dashboard using the credentials below."}
                  </p>

                  <table width="100%" bgcolor="#f1f5f9" style="border:2px dashed #cbd5e1;border-radius:12px;text-align:center;">
                    <tr>
                      <td style="padding:25px;">
                        <div style="font-size:12px;font-weight:800;color:#94a3b8;margin-bottom:4px;">Staff ID</div>
                        <div style="font-size:22px;font-weight:900;color:#4f46e5;font-family:monospace;margin-bottom:15px;">${staffId}</div>

                        <div style="height:1px;background:#e2e8f0;margin:15px 0;"></div>

                        <div style="font-size:12px;font-weight:800;color:#94a3b8;margin-bottom:4px;">Temporary Password</div>
                        <div style="font-size:22px;font-weight:900;color:#0f172a;font-family:monospace;">${plainPassword}</div>
                      </td>
                    </tr>
                  </table>

                  <div style="text-align:center;margin-top:30px;">
                    <a href="https://your-website.com/login" style="background-color:#4f46e5;color:#fff;text-decoration:none;font-weight:bold;padding:16px 30px;border-radius:10px;display:inline-block;">Login to Dashboard</a>
                  </div>

                  <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:25px;">
                    *Please change your password after first login.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:30px;border-top:1px solid #f1f5f9;background-color:#fafafa;">
                  <b style="color:#1e293b;font-size:14px;">Success Point Digital Library</b><br/>
                  <span style="font-size:12px;color:#94a3b8;">Near Main Gate, Digital Zone Path, 2026</span><br/>
                  <span style="font-size:12px;color:#94a3b8;">&copy; All Rights Reserved</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    await sendEmail(email, "Welcome to Success Point Library Staff", htmlEmail);

    res.status(201).json({ success: true, message: "Staff created successfully", staffId });
  } catch (error) {
    console.error("Error creating staff:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// ---------------- LOGIN STAFF ----------------
exports.loginStaff = async (req, res) => {
  try {
    let { staffId, password } = req.body;

    if (!staffId || !password)
      return res.status(400).json({ message: "Staff ID and password are required" });

    staffId = staffId.trim();
    password = password.trim();

    const staff = await Staff.findOne({ staffId }).select("+password");

    if (!staff || !staff.isActive)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: staff._id, role: "STAFF" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    staff.lastLogin = new Date();
    await staff.save();

    res.status(200).json({ success: true, token, staff });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mock / DB-based attendance logs
exports.getAttendanceLogs = async (req, res) => {
  try {
    // Later you can replace this with Attendance model
    const logs = [
      {
        id: "LOG001",
        name: "Rahul Verma",
        type: "Entry",
        time: "08:15 AM",
        seat: "A-12",
        status: "Verified"
      },
      {
        id: "LOG002",
        name: "Sneha Kapoor",
        type: "Exit",
        time: "10:30 AM",
        seat: "B-04",
        status: "Verified"
      }
    ];

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendance logs" });
  }
};



// ---------------- UPDATE STAFF ----------------
exports.updateStaff = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const updates = req.body;
    delete updates.password;
    delete updates.staffId;
    delete updates.email; 

    await Staff.findOneAndUpdate(
      { staffId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Fetch fresh data from database
    const staff = await Staff.findOne({ staffId });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    res.status(200).json({ success: true, message: "Staff updated", staff });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET PROFILE ----------------
exports.getStaffProfile = async (req, res) => {
  try {
    const staffId = req.user.id;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    res.status(200).json({ success: true, staff });
  } catch (error) {
    console.error("Get staff profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- CHANGE PASSWORD ----------------
exports.changePassword = async (req, res) => {
  try {
    const staffId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Old and new password required" });

    // password select karna zaruri hai kyunki model me select: false hai
    const staff = await Staff.findById(staffId).select("+password");
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // check old password
    const isMatch = await staff.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Old password incorrect" });

    // direct new password assign karo, pre-save hook automatically hash kar dega
    staff.password = newPassword;
    await staff.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change staff password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------- FORGOT PASSWORD (OTP) ----------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const staff = await Staff.findOne({ email });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    staff.otp = otp;
    staff.otpExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await staff.save();

    const html = `<p>Hello ${staff.name},</p>
      <p>Your OTP to reset your password is:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 15 minutes.</p>`;

    await sendEmail(staff.email, "OTP for Password Reset", html);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot staff password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- VERIFY OTP ----------------
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const staff = await Staff.findOne({ email }).select("+otp +otpExpires");
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Check if OTP exists and is valid
    if (!staff.otp || !staff.otpExpires) {
      return res.status(400).json({ message: "No OTP requested. Please request OTP first." });
    }

    if (new Date() > staff.otpExpires) {
      staff.otp = undefined;
      staff.otpExpires = undefined;
      await staff.save();
      return res.status(400).json({ message: "OTP expired, please request again" });
    }

    if (staff.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid → mark as verified (clear OTP)
    staff.otp = undefined;
    staff.otpExpires = undefined;
    await staff.save();

    // Return success → allow direct password reset
    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      email, // pass email to frontend to use for password reset
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- RESET PASSWORD AFTER OTP VERIFICATION ----------------
exports.resetPassword = async (req, res) => {
   try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: "Email and new password required" });

    // Fetch staff
    const staff = await Staff.findOne({ email }).select("+password");
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Update password via pre-save hook
    staff.password = newPassword; 
    await staff.save();         

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getDashboardActivity = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count today's entries and exits
    const todayAttendance = await Attendance.find({ 
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } 
    });
    
    const arrivals = todayAttendance.filter(a => a.entryTime).length;
    const departures = todayAttendance.filter(a => a.exitTime).length;
    const active = arrivals - departures;

    // Get total students count
    const totalStudents = await Student.countDocuments({ status: "Active" });

    // Get recent scans with student details
    const recentScans = await Attendance.find({ 
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } 
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("student", "name studentId seat shift");

    // Format scans for frontend
    const formattedScans = recentScans.map(scan => ({
      _id: scan._id,
      studentId: scan.student,
      type: scan.exitTime ? "Exit" : "Entry",
      timestamp: scan.exitTime || scan.entryTime
    }));

    res.status(200).json({
      success: true,
      stats: { active, arrivals, departures, totalStudents },
      scans: formattedScans
    });
  } catch (error) {
    console.error("Dashboard Activity Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch activity data" 
    });
  }
};

