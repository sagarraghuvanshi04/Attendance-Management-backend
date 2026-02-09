const express = require("express");
const {
  createStudent,
  loginStudent,
  updateStudent,
  getStudentProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateStudentProfile,
  getAllStudents,
  getStudentById,
  renewMembership
} = require("../controller/studentController");

const authMiddleware = require("../middleware/authMiddleware");
const { getStudentDashboard } = require("../controller/studentDashboardController");

const router = express.Router();

/* ================= AUTH ================= */
router.post("/login", loginStudent);

/* ================= PROFILE ================= */
router.get("/profile", authMiddleware(["STUDENT"]), getStudentProfile);
router.put("/update-profile", authMiddleware(["STUDENT"]), updateStudentProfile);

/* ================= DASHBOARD ================= */
router.get("/dashboard", authMiddleware(["STUDENT"]), getStudentDashboard);

/* ================= PASSWORD MANAGEMENT ================= */
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/change-password", authMiddleware(["STUDENT"]), changePassword);

/* ================= STUDENT LIST (READ ONLY) ================= */
router.get("/", authMiddleware(["ADMIN", "STAFF"]), getAllStudents);
router.get("/:studentId", authMiddleware(["ADMIN", "STAFF"]), getStudentById);

/* ================= ADMIN ONLY ================= */
router.post("/create", authMiddleware(["ADMIN"]), createStudent);
router.put("/update/:studentId", authMiddleware(["ADMIN", "STAFF"]), updateStudent);
router.post("/renew/:studentId", authMiddleware(["ADMIN", "STAFF"]), renewMembership);

module.exports = router;
