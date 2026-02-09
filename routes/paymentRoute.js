const express = require("express");
const router = express.Router();
const {
  createPayment,
  getStudentPayments,
  getAllPayments,
  updatePaymentStatus,
  submitPaymentRequest,
  getPendingPayments,
  approvePayment,
} = require("../controller/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// Admin and Staff routes
router.get("/", authMiddleware(["ADMIN", "STAFF"]), getAllPayments);
router.get("/pending", authMiddleware(["ADMIN", "STAFF"]), getPendingPayments);
router.post("/approve/:paymentId", authMiddleware(["ADMIN", "STAFF"]), approvePayment);

// Admin only routes
router.post("/create", authMiddleware(["ADMIN"]), createPayment);
router.patch("/:paymentId/status", authMiddleware(["ADMIN"]), updatePaymentStatus);

// Student routes
router.get("/student", authMiddleware(["STUDENT"]), getStudentPayments);
router.post("/submit-payment", authMiddleware(["STUDENT"]), submitPaymentRequest);
router.get("/student/:studentId", authMiddleware(["STAFF", "ADMIN"]), async (req, res) => {
  try {
    const Payment = require("../model/paymentModel");
    const payments = await Payment.find({ student: req.params.studentId }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
