const FeeSettings = require("../model/feeSettingsModel");

// Get fee settings
exports.getFeeSettings = async (req, res) => {
  try {
    let settings = await FeeSettings.findOne();
    if (!settings) {
      settings = await FeeSettings.create({ acFee: 800, nonAcFee: 600 });
    }
    res.status(200).json({ success: true, settings });
  } catch (err) {
    console.error("Get fee settings error:", err);
    res.status(500).json({ message: "Failed to fetch fee settings" });
  }
};

// Update fee settings (ADMIN only)
exports.updateFeeSettings = async (req, res) => {
  try {
    const { acFee, nonAcFee } = req.body;

    if (!acFee || !nonAcFee) {
      return res.status(400).json({ message: "Both AC and Non-AC fees are required" });
    }

    let settings = await FeeSettings.findOne();
    if (!settings) {
      settings = await FeeSettings.create({ acFee, nonAcFee });
    } else {
      settings.acFee = acFee;
      settings.nonAcFee = nonAcFee;
      await settings.save();
    }

    res.status(200).json({ success: true, message: "Fee settings updated successfully", settings });
  } catch (err) {
    console.error("Update fee settings error:", err);
    res.status(500).json({ message: "Failed to update fee settings" });
  }
};
