const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTodayQuiz,
  submitQuiz,
  getLeaderboard,
  createQuiz,
  getAllQuizzes,
} = require("../controller/quizController");

// Student routes
router.get("/today", authMiddleware(["STUDENT"]), getTodayQuiz);
router.post("/submit", authMiddleware(["STUDENT"]), submitQuiz);
router.get("/leaderboard", authMiddleware(["STUDENT"]), getLeaderboard);

// Admin routes
router.post("/create", authMiddleware(["ADMIN", "STAFF"]), createQuiz);
router.get("/all", authMiddleware(["ADMIN", "STAFF"]), getAllQuizzes);

module.exports = router;
