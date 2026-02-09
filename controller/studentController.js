const Student = require("../model/studentModel");
const Counter = require("../model/counter");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate random password
const generatePassword = () => Math.random().toString(36).slice(-8);

// ---------------- CREATE STUDENT ----------------
exports.createStudent = async (req, res) => {
  try {
    console.log("Create Student Request Body:", req.body);
    
    const {
      name,
      email,
      course,
      year,
      department,
      rollNumber,
      section,
      emailMessage,
    } = req.body;

    if (!name || !email || !course || !year) {
      return res
        .status(400)
        .json({ message: "Name, email, course, and year are required" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists" });
    }

    // Check if seat is already occupied
    if (req.body.seat) {
      const seatOccupied = await Student.findOne({ seat: req.body.seat, status: "Active" });
      if (seatOccupied) {
        return res.status(400).json({ message: `Seat ${req.body.seat} is already occupied by ${seatOccupied.name}` });
      }
    }

    const currentYear = new Date().getFullYear();
    const counter = await Counter.findOneAndUpdate(
      { year: currentYear, role: "STUDENT" },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    const studentId = `${currentYear}ST${String(counter.count).padStart(2, "0")}`;
    const plainPassword = generatePassword();

    const student = await Student.create({
      studentId,
      name,
      email,
      password: plainPassword,
      course,
      year,
      department,
      rollNumber,
      section,
      phone: req.body.phone,
      seat: req.body.seat,
      shift: req.body.shift,
      gender: req.body.gender,
      aadharLast4: req.body.aadharLast4,
      address: req.body.address,
      expiry: req.body.expiry,
      status: req.body.status || 'Active',
    });

    // Create payment entry if amount is provided
    if (req.body.amountPaid) {
      const Payment = require("../model/paymentModel");
      const transactionId = `TXN${Date.now()}`;
      await Payment.create({
        student: student._id,
        transactionId,
        month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        date: new Date(),
        amount: req.body.amountPaid,
        method: req.body.paymentMethod || 'Cash',
        status: 'Paid',
      });
    }

    // Email content
    const htmlEmail = `
      <div style="background-color: #f1f5f9; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800;">SUCCESS POINT</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Digital Library & Study Zone</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 700;">Welcome to the family, ${name}!</h2>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                ${emailMessage || "Your professional study space is ready. We've created your student account with the credentials below. Please keep this information secure."}
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <span style="display: block; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Student ID</span>
                      <span style="display: block; color: #4f46e5; font-size: 20px; font-family: 'Courier New', monospace; font-weight: 700;">${studentId}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
                      <span style="display: block; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">Temporary Password</span>
                      <span style="display: block; color: #1e293b; font-size: 20px; font-family: 'Courier New', monospace; font-weight: 700;">${plainPassword}</span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
                  Login to Student Dashboard
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px;">
                *For security reasons, please change your password immediately after your first login.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0;">Success Point Digital Library</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">Near Main Gate, Digital Zone Path, 2026</p>
              <div style="margin-top: 15px;">
                <span style="color: #cbd5e1; font-size: 12px;">&copy; 2026 Success Point. All rights reserved.</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    await sendEmail(
      email,
      "Welcome to Success Point Digital Library",
      htmlEmail
    );

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      studentId,
    });

  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- LOGIN STUDENT ----------------
exports.loginStudent = async (req, res) => {
  try {
    let { studentId, password } = req.body;
    
    console.log("Login attempt - studentId:", studentId, "password:", password);
    
    if (!studentId || !password)
      return res.status(400).json({ message: "Student ID and password are required" });

    studentId = studentId.trim();
    password = password.trim();

    const student = await Student.findOne({ studentId }).select("+password");
    
    console.log("Student found:", student ? "Yes" : "No");
    if (student) {
      console.log("Student isActive:", student.isActive);
    }
    
    if (!student)
      return res.status(401).json({ message: "Invalid credentials - Student not found" });
    
    if (!student.isActive)
      return res.status(401).json({ message: "Account is inactive. Please contact admin." });

    const isMatch = await student.comparePassword(password);
    console.log("Password match:", isMatch);
    
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials - Wrong password" });

    const token = jwt.sign(
      { id: student._id, role: "STUDENT" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    student.lastLogin = new Date();
    await student.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        course: student.course,
        year: student.year,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- UPDATE STUDENT ----------------
exports.updateStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const updates = { ...req.body };
    delete updates.password;
    delete updates.studentId;
    delete updates.email;

    // Check if seat is being updated and if it's already occupied
    if (updates.seat) {
      const currentStudent = await Student.findOne({ studentId });
      if (currentStudent && currentStudent.seat !== updates.seat) {
        const seatOccupied = await Student.findOne({ seat: updates.seat, status: "Active", studentId: { $ne: studentId } });
        if (seatOccupied) {
          return res.status(400).json({ message: `Seat ${updates.seat} is already occupied by ${seatOccupied.name}` });
        }
      }
    }

    const student = await Student.findOneAndUpdate(
      { studentId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ success: true, message: "Student updated successfully", student });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- UPDATE LOGGED-IN STUDENT PROFILE ----------------
exports.updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const updates = { ...req.body };
    delete updates.password;
    delete updates.studentId;
    delete updates.email;

    const student = await Student.findByIdAndUpdate(studentId, { $set: updates }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ success: true, message: "Profile updated successfully", student });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- GET PROFILE ----------------
exports.getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId).select("-password -otp -otpExpires");
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Calculate attendance stats
    const Attendance = require("../model/attendanceModel");
    const totalDays = await Attendance.countDocuments({ student: studentId });
    const presentDays = await Attendance.countDocuments({ student: studentId, status: "Present" });
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Add attendance stats to response
    const studentWithStats = {
      ...student.toObject(),
      attendance: {
        percentage,
        totalDays,
        presentDays,
        lateMarks: 0 // Can be calculated if you have late entry logic
      }
    };

    res.status(200).json({ success: true, student: studentWithStats });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- CHANGE PASSWORD ----------------
exports.changePassword = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Old and new password are required" });

    const student = await Student.findById(studentId).select("+password");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isMatch = await student.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Old password is wrong" });

    student.password = newPassword;
    await student.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------- FORGOT PASSWORD ----------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    student.otp = otp;
    student.otpExpires = Date.now() + 15 * 60 * 1000;
    await student.save();

    const htmlEmail = `
      <div style="background-color: #f1f5f9; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800;">SUCCESS POINT</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Digital Library & Study Zone</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Hello ${student.name}, we received a request to reset your password. Use the OTP below to proceed with resetting your password.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
                <span style="display: block; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">Your OTP Code</span>
                <span style="display: block; color: #4f46e5; font-size: 36px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 8px;">${otp}</span>
                <span style="display: block; color: #94a3b8; font-size: 13px; margin-top: 15px;">⏱ This OTP will expire in 15 minutes</span>
              </div>
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px;">
                *If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0;">Success Point Digital Library</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">Near Main Gate, Digital Zone Path, 2026</p>
              <div style="margin-top: 15px;">
                <span style="color: #cbd5e1; font-size: 12px;">&copy; 2026 Success Point. All rights reserved.</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    await sendEmail(student.email, "Password Reset OTP - Success Point", htmlEmail);

    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- VERIFY OTP ----------------
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!student.otp || !student.otpExpires || Date.now() > student.otpExpires)
      return res.status(400).json({ message: "OTP expired, please request again" });

    if (student.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    res.status(200).json({ success: true, message: "OTP verified, you can reset your password now" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- RESET PASSWORD ----------------
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: "Email, OTP, and new password are required" });

    const student = await Student.findOne({ email }).select("+password");
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!student.otp || !student.otpExpires || Date.now() > student.otpExpires)
      return res.status(400).json({ message: "OTP expired, please request again" });

    if (student.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    student.password = newPassword;
    student.otp = undefined;
    student.otpExpires = undefined;
    await student.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET ALL STUDENTS ----------------
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, students });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

// ---------------- GET STUDENT BY ID ----------------
exports.getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    let student;
    
    // Check if it's MongoDB ObjectId or studentId string
    if (studentId.match(/^[0-9a-fA-F]{24}$/)) {
      student = await Student.findById(studentId).select("-password -otp -otpExpires");
    } else {
      student = await Student.findOne({ studentId }).select("-password -otp -otpExpires");
    }
    
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ success: true, student });
  } catch (err) {
    console.error("Get student by ID error:", err);
    res.status(500).json({ message: "Error fetching student" });
  }
};

// ---------------- RENEW MEMBERSHIP ----------------
exports.renewMembership = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { durationMonths, seatType, paymentMethod } = req.body;

    if (!durationMonths) {
      return res.status(400).json({ message: "Duration is required" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Calculate new expiry date
    const currentExpiry = student.expiry ? new Date(student.expiry) : new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + parseInt(durationMonths));

    // Calculate amount
    const seatPrice = (seatType || student.seatType) === "AC" ? 800 : 600;
    const amount = seatPrice * parseInt(durationMonths);

    // Update student
    student.expiry = newExpiry;
    student.status = "Active";
    if (seatType) student.seatType = seatType;
    await student.save();

    // Create payment entry
    const Payment = require("../model/paymentModel");
    const transactionId = `TXN${Date.now()}`;
    await Payment.create({
      student: student._id,
      transactionId,
      month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      date: new Date(),
      amount,
      method: paymentMethod || 'Cash',
      status: 'Paid',
      description: `Membership Renewal - ${durationMonths} Month(s)`
    });

    res.status(200).json({
      success: true,
      message: `Membership renewed successfully until ${newExpiry.toLocaleDateString()}`,
      student,
      amount
    });
  } catch (error) {
    console.error("Renew membership error:", error);
    res.status(500).json({ message: "Failed to renew membership" });
  }
};
