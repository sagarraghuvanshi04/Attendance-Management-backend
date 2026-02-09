const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getFeeSettings, updateFeeSettings } = require("../controller/feeSettingsController");

router.get("/", authMiddleware(["ADMIN", "STAFF", "STUDENT"]), getFeeSettings);
router.put("/", authMiddleware(["ADMIN"]), updateFeeSettings);

module.exports = router;
