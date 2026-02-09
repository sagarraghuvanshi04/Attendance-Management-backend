const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true, // 2026
    },

    role: {
      type: String,
      enum: ["STUDENT", "STAFF"],
      required: true,
    },

    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate counters for same year + role
counterSchema.index({ year: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);
