const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controller/settingsController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware(["ADMIN"]), getSettings);
router.put("/", authMiddleware(["ADMIN"]), updateSettings);

module.exports = router;
