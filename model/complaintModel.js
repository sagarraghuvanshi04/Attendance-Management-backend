const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    type: {
      type: String,
      enum: ["Complaint", "Suggestion"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    response: {
      type: String,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
