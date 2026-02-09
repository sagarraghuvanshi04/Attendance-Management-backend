const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAllBooks, addBook, updateBook, deleteBook } = require("../controller/bookController");

// Public/Student routes
router.get("/", authMiddleware(["STUDENT", "STAFF", "ADMIN"]), getAllBooks);

// Admin routes
router.post("/add", authMiddleware(["ADMIN", "STAFF"]), addBook);
router.put("/:bookId", authMiddleware(["ADMIN", "STAFF"]), updateBook);
router.delete("/:bookId", authMiddleware(["ADMIN", "STAFF"]), deleteBook);

module.exports = router;
