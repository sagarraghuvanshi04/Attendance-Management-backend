const mongoose = require("mongoose");

const feeSettingsSchema = new mongoose.Schema(
  {
    acFee: {
      type: Number,
      required: true,
      default: 800,
    },
    nonAcFee: {
      type: Number,
      required: true,
      default: 600,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeeSettings", feeSettingsSchema);
