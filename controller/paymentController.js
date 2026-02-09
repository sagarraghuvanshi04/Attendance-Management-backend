// controller/paymentController.js
const Payment = require("../model/paymentModel");
const Student = require("../model/studentModel");
const Notification = require("../model/notificationModel");
const Staff = require("../model/staffModel");

// ---------------- GET PENDING PAYMENTS (ADMIN/STAFF) ----------------
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "Pending" })
      .populate("student", "name email studentId phone")
      .sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("Get pending payments error:", err);
    res.status(500).json({ message: "Failed to fetch pending payments" });
  }
};

// ---------------- APPROVE/REJECT PAYMENT (ADMIN/STAFF) ----------------
exports.approvePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, durationMonths, rejectionMessage } = req.body;

    const payment = await Payment.findById(paymentId).populate("student");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (action === "approve") {
      payment.status = "Paid";
      await payment.save();

      // Update student expiry date
      const student = await Student.findById(payment.student._id);
      if (student) {
        const currentExpiry = student.expiry ? new Date(student.expiry) : new Date();
        const newExpiry = new Date(currentExpiry);
        newExpiry.setMonth(newExpiry.getMonth() + (durationMonths || 1));
        
        student.expiry = newExpiry;
        student.status = "Active";
        await student.save();
      }

      res.status(200).json({ 
        success: true, 
        message: "Payment approved and plan renewed",
        payment 
      });
    } else if (action === "reject") {
      payment.status = "Failed";
      await payment.save();

      // Send rejection notification to student
      await Notification.create({
        student: payment.student._id,
        title: "Payment Rejected",
        message: rejectionMessage || "Your payment has been rejected. Please contact admin for details.",
        type: "alert",
        date: new Date()
      });

      res.status(200).json({ 
        success: true, 
        message: "Payment rejected",
        payment 
      });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Approve payment error:", err);
    res.status(500).json({ message: "Failed to process payment" });
  }
};

// ---------------- SUBMIT PAYMENT REQUEST (STUDENT) ----------------
exports.submitPaymentRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { plan, amount, transactionId, paymentProof } = req.body;

    if (!plan || !amount || !transactionId) {
      return res.status(400).json({ message: "Plan, amount, and transaction ID are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Create payment entry with Pending status
    const payment = await Payment.create({
      student: studentId,
      transactionId: transactionId,
      month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      date: new Date(),
      amount: parseInt(amount),
      method: 'UPI',
      status: 'Pending',
      paymentProof: paymentProof || null,
      description: `${plan} Plan Renewal`
    });

    // Send notification to all staff and admin
    const allStaff = await Staff.find({ isActive: true });
    const notificationPromises = allStaff.map(staff => 
      Notification.create({
        staff: staff._id,
        title: "New Payment Request",
        message: `${student.name} (${student.studentId}) has submitted a payment request of ₹${amount} for ${plan} plan. Transaction ID: ${transactionId}`,
        type: "info"
      })
    );
    await Promise.all(notificationPromises);

    res.status(201).json({ 
      success: true, 
      message: "Payment submitted successfully. Waiting for admin approval.",
      payment 
    });
  } catch (err) {
    console.error("Submit payment error:", err);
    res.status(500).json({ message: "Failed to submit payment" });
  }
};

// ---------------- CREATE PAYMENT ----------------
exports.createPayment = async (req, res) => {
  try {
    const { studentId, month, amount, method, status } = req.body;

    // Validate student
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Generate unique transaction ID
    const transactionId = `#INV-${Math.floor(Math.random() * 10000 + 1000)}`;

    const payment = await Payment.create({
      student: student._id,
      transactionId,
      month,
      date: new Date(),
      amount,
      method,
      status,
    });

    res.status(201).json({ success: true, payment });
  } catch (err) {
    console.error("Create payment error:", err);
    res.status(500).json({ message: "Failed to create payment" });
  }
};

// ---------------- GET ALL PAYMENTS (ADMIN) ----------------
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("student", "name email studentId")
      .sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("Get all payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

// ---------------- GET PAYMENTS FOR STUDENT ----------------
exports.getStudentPayments = async (req, res) => {
  try {
    const studentId = req.user.id; // from auth middleware
    const payments = await Payment.find({ student: studentId })
      .sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("Get student payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

// ---------------- UPDATE PAYMENT STATUS (ADMIN) ----------------
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["Paid", "Pending", "Failed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.status = status;
    await payment.save();

    res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error("Update payment status error:", err);
    res.status(500).json({ message: "Failed to update payment status" });
  }
};

// ---------------- DASHBOARD STATS (ADMIN) ----------------
exports.getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const totalStaff = await Staff.countDocuments({ role: { $ne: "ADMIN" } });

    // Revenue this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const revenueThisMonth = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenue = revenueThisMonth[0]?.total || 0;

    // Seats
    const totalSeats = 60; // example total seats
    const availableSeats = totalSeats - activeStudents;

    res.status(200).json({
      success: true,
      stats: { totalStudents, activeStudents, totalStaff, revenue, availableSeats },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
