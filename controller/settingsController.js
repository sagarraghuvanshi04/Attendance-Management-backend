const Settings = require("../model/settingsModel");

// Get Settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
    }
    res.json({ success: true, message: "Settings updated successfully", settings });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
