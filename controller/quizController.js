const { Quiz, QuizAttempt } = require("../model/quizModel");

// Get quiz results (ADMIN/STAFF)
exports.getQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const results = await QuizAttempt.find({ quiz: quizId })
      .populate("student", "name studentId email")
      .sort({ score: -1, completedAt: 1 });

    res.status(200).json({
      success: true,
      quiz: {
        title: quiz.title,
        date: quiz.date,
        totalQuestions: quiz.questions.length,
      },
      results,
      totalAttempts: results.length,
    });
  } catch (err) {
    console.error("Get quiz results error:", err);
    res.status(500).json({ message: "Failed to fetch quiz results" });
  }
};

// Get today's quiz (STUDENT)
exports.getTodayQuiz = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const quiz = await Quiz.findOne({
      date: { $gte: today, $lt: tomorrow },
      isActive: true,
    });

    if (!quiz) {
      return res.status(404).json({ message: "No quiz available for today" });
    }

    // Check if student already attempted
    const studentId = req.user.id;
    const attempt = await QuizAttempt.findOne({ quiz: quiz._id, student: studentId });

    res.status(200).json({
      success: true,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        duration: quiz.duration,
        questions: quiz.questions.map((q) => ({
          question: q.question,
          options: q.options,
        })),
      },
      attempted: !!attempt,
      score: attempt?.score,
    });
  } catch (err) {
    console.error("Get today quiz error:", err);
    res.status(500).json({ message: "Failed to fetch quiz" });
  }
};

// Submit quiz (STUDENT)
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body;
    const studentId = req.user.id;

    // Check if already attempted
    const existingAttempt = await QuizAttempt.findOne({ quiz: quizId, student: studentId });
    if (existingAttempt) {
      return res.status(400).json({ message: "You have already attempted this quiz" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Calculate score
    let score = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        score++;
      }
    });

    const attempt = await QuizAttempt.create({
      quiz: quizId,
      student: studentId,
      answers,
      score,
    });

    res.status(201).json({
      success: true,
      message: "Quiz submitted successfully",
      score,
      total: quiz.questions.length,
    });
  } catch (err) {
    console.error("Submit quiz error:", err);
    res.status(500).json({ message: "Failed to submit quiz" });
  }
};

// Get leaderboard (STUDENT)
exports.getLeaderboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const quiz = await Quiz.findOne({
      date: { $gte: today, $lt: tomorrow },
      isActive: true,
    });

    if (!quiz) {
      return res.status(404).json({ message: "No quiz available for today" });
    }

    const leaderboard = await QuizAttempt.find({ quiz: quiz._id })
      .populate("student", "name studentId")
      .sort({ score: -1, completedAt: 1 })
      .limit(10);

    res.status(200).json({ success: true, leaderboard });
  } catch (err) {
    console.error("Get leaderboard error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};

// Create quiz (ADMIN)
exports.createQuiz = async (req, res) => {
  try {
    const { title, date, questions, duration } = req.body;

    if (!title || !date || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title, date, and questions are required" });
    }

    const quiz = await Quiz.create({
      title,
      date,
      questions,
      duration: duration || 10,
    });

    res.status(201).json({ success: true, message: "Quiz created successfully", quiz });
  } catch (err) {
    console.error("Create quiz error:", err);
    res.status(500).json({ message: "Failed to create quiz" });
  }
};

// Get all quizzes (ADMIN)
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ date: -1 });
    res.status(200).json({ success: true, quizzes });
  } catch (err) {
    console.error("Get quizzes error:", err);
    res.status(500).json({ message: "Failed to fetch quizzes" });
  }
};
