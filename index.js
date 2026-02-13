// index.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cron = require("node-cron");

const connectToDb = require("./utils/db");

// Routes
const adminRoute = require("./routes/adminRoute");
const studentRoute = require("./routes/studentRoute");
const staffRoute = require("./routes/staffRoute");
const Staff = require("./model/staffModel");
const bcrypt = require("bcryptjs");
const attendanceRoute = require("./routes/attendanceRoute");
const paymentRoute = require("./routes/paymentRoute");
const notificationRoute = require("./routes/notificationRoute");
const settingsRoute = require("./routes/settingsRoute");
const staffAttendanceRoute = require("./routes/staffAttendanceRoute");
const complaintRoute = require("./routes/complaintRoute");
const bookRoute = require("./routes/bookRoute");
const quizRoute = require("./routes/quizRoute");
const feeSettingsRoute = require("./routes/feeSettingsRoute");
const paymentReminderRoute = require("./routes/paymentReminderRoute");

dotenv.config();

const app = express();

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ------------------ ROUTES ------------------
app.use("/api/admin", adminRoute);
app.use("/api/students", studentRoute);
app.use("/api/staff", staffRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/payments",paymentRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/staff-attendance", staffAttendanceRoute);
app.use("/api/complaints", complaintRoute);
app.use("/api/books", bookRoute);
app.use("/api/quiz", quizRoute);
app.use("/api/fee-settings", feeSettingsRoute);
app.use("/api/payment-reminders", paymentReminderRoute);

// Test Route
app.get("/", (req, res) => {
  res.send("SP Digital Lab Management System Backend is Running - v2");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// Cron trigger endpoints for external services
const CRON_SECRET = process.env.CRON_SECRET || "cron-secret-key-2024";

const verifyCronSecret = (req, res, next) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  next();
};

app.get("/api/attendance/mark-absent-noon", verifyCronSecret, async (req, res) => {
  try {
    const { markAbsentAtNoon } = require("./controller/attendanceController");
    await markAbsentAtNoon();
    res.json({ status: "success", message: "Absent marked at noon" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/attendance/auto-exit", verifyCronSecret, async (req, res) => {
  try {
    const { autoExitAtClosingTime } = require("./controller/attendanceController");
    await autoExitAtClosingTime();
    res.json({ status: "success", message: "Auto exit completed" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/staff-attendance/mark-absent-noon", verifyCronSecret, async (req, res) => {
  try {
    const { markStaffAbsentAtNoon } = require("./controller/staffAttendanceController");
    await markStaffAbsentAtNoon();
    res.json({ status: "success", message: "Staff absent marked at noon" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: "File too large. Maximum size is 50MB." });
  }
  console.error("Global Error:", err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// ------------------ SERVER START ------------------
const PORT = process.env.PORT || 5000;

const createAdminIfNotExists = async () => {
  try {
    const adminStaffId = "ADMIN01";
    const existingAdmin = await Staff.findOne({ staffId: adminStaffId });

    if (!existingAdmin) {
      const admin = await Staff.create({
        staffId: adminStaffId,
        name: "Super Admin",
        email: "dkguptak9369@gmail.com",
        password: "admin123",
        role: "ADMIN",
        isActive: true,
      });
      console.log("✅ Admin created - ID:", adminStaffId, "Password: admin123");
    } else {
      console.log("✅ Admin already exists - ID:", adminStaffId);
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};


connectToDb()
  .then(async () => {
    await createAdminIfNotExists();
    
    // Setup cron job - Auto mark absent at 12 PM daily
    cron.schedule("0 12 * * *", async () => {
      const { markAbsentAtNoon } = require("./controller/attendanceController");
      await markAbsentAtNoon();
    });
    console.log("✅ Cron job scheduled: Auto absent marking at 12 PM daily");
    
    // Setup cron job - Auto exit at 6 PM daily
    cron.schedule("0 18 * * *", async () => {
      const { autoExitAtClosingTime } = require("./controller/attendanceController");
      await autoExitAtClosingTime();
    });
    console.log("✅ Cron job scheduled: Auto exit at 6 PM daily");
    
    // Setup cron job - Auto mark staff absent at 12 PM daily
    cron.schedule("0 12 * * *", async () => {
      const { markStaffAbsentAtNoon } = require("./controller/staffAttendanceController");
      await markStaffAbsentAtNoon();
    });
    console.log("✅ Cron job scheduled: Auto absent marking for staff at 12 PM daily");
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to DB:", err);
    process.exit(1);
  });
