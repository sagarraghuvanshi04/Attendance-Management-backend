const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  transactionId: { type: String, required: true },
  month: { type: String, required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["Paid", "Pending", "Failed"], default: "Pending" },
  method: { type: String, enum: ["Cash", "UPI", "Online"], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
