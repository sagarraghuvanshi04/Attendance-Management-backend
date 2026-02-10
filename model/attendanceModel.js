const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    staff: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    entryTime: {
      type: Date,
      default: null,
    },

    exitTime: {
      type: Date,
      default: null,
    },

    workingHours: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      default: "Present",
    },

    markedBy: {
      type: String,
      enum: ["SYSTEM", "ADMIN", "STAFF"],
      default: "SYSTEM",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1 });
attendanceSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
