const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    // --- Basic Info ---
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    // --- Authentication ---
    password: {
      type: String,
      required: true,
      select: false, // 🔒 hide password by default
    },
    lastLogin: { type: Date },

    // --- OTP-based password reset ---
    otp: String,
    otpExpires: Date,

    // --- Academic Info ---
    course: String,
    year: String,
    department: String,
    rollNumber: String,
    section: String,

    // --- Library Info ---
    seat: String,
    aadharLast4: String,
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    expiry: Date,
    libraryCardNumber: String,
    issuedBooks: [
      {
        bookId: String,
        title: String,
        issueDate: Date,
        dueDate: Date,
      },
    ],
    finesDue: { type: Number, default: 0 },

    // +++ ADD THESE NEW FIELDS +++
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Full Day"],
      default: "Full Day",
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Overdue"],
      default: "Paid",
    },
    lastPaymentDate: {
      type: Date,
      default: Date.now,
    },

    // --- Personal Info ---
    profilePic: String,
    dob: Date,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    address: String,
    guardian: {
      name: String,
      phone: String,
      relation: String,
    },

    // --- Status ---
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

studentSchema.index({ status: 1 });
studentSchema.index({ name: 1, studentId: 1, email: 1 });

// ------------------- PRE-SAVE HOOK -------------------
studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ------------------- METHODS -------------------
studentSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
