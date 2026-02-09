const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  respondToComplaint,
} = require("../controller/complaintController");

// Student routes
router.post("/create", authMiddleware(["STUDENT"]), createComplaint);
router.get("/my-complaints", authMiddleware(["STUDENT"]), getMyComplaints);

// Staff/Admin routes
router.get("/all", authMiddleware(["STAFF", "ADMIN"]), getAllComplaints);
router.put("/respond/:complaintId", authMiddleware(["STAFF", "ADMIN"]), respondToComplaint);

module.exports = router;
