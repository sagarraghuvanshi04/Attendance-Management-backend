const Book = require("../model/bookModel");

// Get all books (STUDENT/STAFF/ADMIN)
exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, books });
  } catch (err) {
    console.error("Get books error:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

// Add book (ADMIN)
exports.addBook = async (req, res) => {
  try {
    const { title, author, category, description, coverImage, totalCopies, isbn, publisher, publishedYear } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ message: "Title, author, and category are required" });
    }

    const book = await Book.create({
      title,
      author,
      category,
      description,
      coverImage,
      totalCopies: totalCopies || 1,
      availableCopies: totalCopies || 1,
      isbn,
      publisher,
      publishedYear,
    });

    res.status(201).json({ success: true, message: "Book added successfully", book });
  } catch (err) {
    console.error("Add book error:", err);
    res.status(500).json({ message: "Failed to add book" });
  }
};

// Update book (ADMIN)
exports.updateBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const updates = req.body;

    const book = await Book.findByIdAndUpdate(bookId, updates, { new: true });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json({ success: true, message: "Book updated successfully", book });
  } catch (err) {
    console.error("Update book error:", err);
    res.status(500).json({ message: "Failed to update book" });
  }
};

// Delete book (ADMIN)
exports.deleteBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findByIdAndUpdate(bookId, { isActive: false }, { new: true });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json({ success: true, message: "Book deleted successfully" });
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};
