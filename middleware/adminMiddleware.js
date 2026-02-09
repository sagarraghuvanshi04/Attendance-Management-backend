// middleware/adminMiddleware.js
const Staff = require("../model/staffModel");

const adminOnly = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.user.id);
    if (!staff || staff.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = adminOnly;
