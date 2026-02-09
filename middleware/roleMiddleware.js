module.exports = function(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user.role?.toUpperCase(); 
    const allowed = allowedRoles.map(r => r.toUpperCase()); 

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};
