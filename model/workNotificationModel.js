const mongoose = require("mongoose");

const workNotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["OT_APPROVED", "OT_REJECTED", "OT_REQUEST", "MISSED_PUNCH", "VALIDATION_UPDATE"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedRecord: { type: mongoose.Schema.Types.ObjectId, ref: "WorkAttendance" },
}, { timestamps: true });

workNotificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("WorkNotification", workNotificationSchema);
