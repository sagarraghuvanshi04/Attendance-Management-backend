const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    totalCopies: {
      type: Number,
      default: 1,
    },
    availableCopies: {
      type: Number,
      default: 1,
    },
    isbn: {
      type: String,
    },
    publisher: {
      type: String,
    },
    publishedYear: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
