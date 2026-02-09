const mongoose = require("mongoose");

const staffAttendanceSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    type: Date,
    default: null,
  },
  checkOut: {
    type: Date,
    default: null,
  },
  workingHours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Leave", "Half Day"],
    default: "Present",
  },
  remarks: {
    type: String,
    default: "",
  },
}, { timestamps: true });

module.exports = mongoose.model("StaffAttendance", staffAttendanceSchema);
