const mongoose = require("mongoose");

const workAttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },

  punchIn: { type: Date, default: null },
  punchOut: { type: Date, default: null },
  workingHours: { type: Number, default: 0 },
  shiftStatus: { type: String, enum: ["Completed", "Incomplete", "Absent"], default: "Absent" },

  punchInSelfie: { type: String, default: null },
  punchOutSelfie: { type: String, default: null },
  punchInFaceDescriptor: {
    type: [Number],
    validate: {
      validator: (v) => !v || v.length === 0 || v.length === 128,
      message: "Face descriptor must be exactly 128 values",
    },
  },

  punchInLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  punchOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },

  // Validation by Manager/Admin
  validationStatus: { type: String, enum: ["Pending", "Valid", "Invalid"], default: "Pending" },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  validationRemarks: { type: String, default: "" },

  // Overtime
  otRequested: { type: Boolean, default: false },
  otHours: { type: Number, default: 0 },
  otStatus: { type: String, enum: ["None", "Pending", "Approved", "Rejected"], default: "None" },
  otApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  otRemarks: { type: String, default: "" },
}, { timestamps: true });

workAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WorkAttendance", workAttendanceSchema);
