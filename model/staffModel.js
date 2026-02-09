// models/staffModel.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const staffSchema = new mongoose.Schema({
  // --- Basic Identity ---
  staffId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },

  // --- Authentication ---
  password: { type: String, required: true, select: false }, // hide by default
  lastLogin: { type: Date },

  // OTP fields for password reset
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },

  // --- Role Info ---
  role: { type: String, required: true },
  shift: { type: String },
  status: { type: String, default: "On Duty", enum: ["On Duty", "On Break", "Off Duty"] },
  salary: { type: Number, default: 15000 },

  // --- Library Responsibilities ---
  assignedArea: { type: String },
  assignedSections: [{ type: String }],
  managedBooks: [{ bookId: String, title: String }],

  // --- Personal Info ---
  profilePic: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },

  // --- System Tracking ---
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

// ------------------- PRE-SAVE HOOK -------------------
// Handles password hashing and updatedAt
staffSchema.pre("save", async function () {
  this.updatedAt = Date.now();

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// ------------------- METHODS -------------------
// Compare password for login
staffSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("Staff", staffSchema);
