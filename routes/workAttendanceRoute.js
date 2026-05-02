const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  punchIn, punchOut, getMyAttendance, getTodayStatus,
  requestOT, getPendingOT, handleOT,
  validateAttendance, getTeamAttendance,
  getAllAttendance, getAllUsers, updateUser, deleteUser,
  getDailyReport,
} = require("../controller/workAttendanceController");

const ALL = ["EMPLOYEE", "MANAGER", "ADMIN"];
const MGR_ADMIN = ["MANAGER", "ADMIN"];

// Employee
router.post("/punch-in", auth(ALL), punchIn);
router.post("/punch-out", auth(ALL), punchOut);
router.get("/my", auth(ALL), getMyAttendance);
router.get("/today", auth(ALL), getTodayStatus);
router.post("/ot-request", auth(ALL), requestOT);

// Manager + Admin
router.get("/team", auth(MGR_ADMIN), getTeamAttendance);
router.get("/ot-pending", auth(MGR_ADMIN), getPendingOT);
router.put("/ot/:id", auth(MGR_ADMIN), handleOT);
router.put("/validate/:id", auth(MGR_ADMIN), validateAttendance);

// Admin only
router.get("/all", auth(["ADMIN"]), getAllAttendance);
router.get("/users", auth(["ADMIN"]), getAllUsers);
router.put("/users/:id", auth(["ADMIN"]), updateUser);
router.delete("/users/:id", auth(["ADMIN"]), deleteUser);

// Reports (role-filtered inside controller)
router.get("/report/daily", auth(ALL), getDailyReport);

module.exports = router;
