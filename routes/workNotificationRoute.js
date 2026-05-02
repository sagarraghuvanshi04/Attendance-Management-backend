const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getNotifications, markRead, markAllRead } = require("../controller/workNotificationController");

const ALL = ["EMPLOYEE", "MANAGER", "ADMIN"];

router.get("/", auth(ALL), getNotifications);
router.put("/read-all", auth(ALL), markAllRead);
router.put("/:id/read", auth(ALL), markRead);

module.exports = router;
