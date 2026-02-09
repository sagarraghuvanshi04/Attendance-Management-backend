// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req || !res) {
        console.error("req or res is undefined in authMiddleware!");
        return next(new Error("Invalid request or response"));
      }

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      // Check if user role is allowed
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        console.log("Role mismatch:", { decodedRole: decoded.role, allowedRoles });
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

module.exports = authMiddleware;
