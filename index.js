const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

dotenv.config();

const connectToDb = require("./utils/db");
const logger = require("./utils/logger");

const userAuthRoute = require("./routes/userAuthRoute");
const workAttendanceRoute = require("./routes/workAttendanceRoute");
const workNotificationRoute = require("./routes/workNotificationRoute");

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(morgan("combined", {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Routes ──────────────────────────────────────────────
app.use("/api/work/auth", userAuthRoute);
app.use("/api/work/attendance", workAttendanceRoute);
app.use("/api/work/notifications", workNotificationRoute);

app.get("/", (req, res) => res.json({ message: "Attendance Management System API is running" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ── 404 ─────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});

// ── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "File too large. Max 50MB." });
  }
  logger.error(err.stack || err.message);
  res.status(500).json({ message: "Something went wrong!" });
});

// ── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  try {
    const User = require("./model/userModel");
    const exists = await User.findOne({ role: "ADMIN" });
    if (!exists) {
      await User.create({
        name: "Super Admin",
        email: "admin@company.com",
        password: "admin123",
        role: "ADMIN",
        department: "Management",
      });
      logger.info("✅ Default admin created — admin@company.com / admin123");
    } else {
      logger.info("✅ Admin already exists");
    }
  } catch (err) {
    logger.error("Seed admin error: " + err.message);
  }
};

connectToDb().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}).catch((err) => {
  logger.error("DB connection failed: " + err.message);
  process.exit(1);
});
