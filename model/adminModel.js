// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const adminSchema = new mongoose.Schema({
//   adminId: {
//     type: String,
//     unique: true,
//     required: true
//   },
//   name: String,
//   email: String,
//   password: {
//     type: String,
//     select: false
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   }
// }, { timestamps: true });

// adminSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// adminSchema.methods.comparePassword = function (password) {
//   return bcrypt.compare(password, this.password);
// };

// module.exports = mongoose.model("Admin", adminSchema);
