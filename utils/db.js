const mongoose = require("mongoose");

const connectToDb = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri, { dbName: "managment" });
    console.log(`MongoDB connected → db: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectToDb;
