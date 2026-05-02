const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["EMPLOYEE", "MANAGER", "ADMIN"], default: "EMPLOYEE" },
  department: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
