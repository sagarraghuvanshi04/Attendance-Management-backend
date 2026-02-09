const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  libraryName: { type: String, default: "Success Point Digital Library" },
  email: { type: String, default: "contact@libgo.com" },
  phone: { type: String, default: "+91 9876543210" },
  website: { type: String, default: "www.libgo.com" },
  address: { type: String, default: "Near Patherwa Thana Patherwa Kushinagar Uttar Pradesh 274401" },
  
  timings: {
    weekdays: {
      open: { type: String, default: "06:00 AM" },
      close: { type: String, default: "11:00 PM" }
    },
    saturday: {
      open: { type: String, default: "06:00 AM" },
      close: { type: String, default: "10:00 PM" }
    },
    sunday: {
      open: { type: String, default: "08:00 AM" },
      close: { type: String, default: "04:00 PM" }
    }
  },
  
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Settings", settingsSchema);
