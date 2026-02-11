const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTodayQuiz,
  submitQuiz,
  getLeaderboard,
  getMyRecords,
  createQuiz,
  getAllQuizzes,
  getQuizResults,
} = require("../controller/quizController");

// Student routes
router.get("/today", authMiddleware(["STUDENT"]), getTodayQuiz);
router.get("/leaderboard", authMiddleware(["STUDENT"]), getLeaderboard);
router.get("/my-records", authMiddleware(["STUDENT"]), getMyRecords);
router.post("/submit", authMiddleware(["STUDENT"]), submitQuiz);

// Admin/Staff routes
router.post("/create", authMiddleware(["ADMIN", "STAFF"]), createQuiz);
router.get("/all", authMiddleware(["ADMIN", "STAFF"]), getAllQuizzes);
router.get("/:quizId/results", authMiddleware(["ADMIN", "STAFF"]), getQuizResults);

module.exports = router;
