import React, { useCallback, useEffect, useState } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, limit, orderBy, addDoc, serverTimestamp, doc, increment, writeBatch, runTransaction, getDoc } from 'firebase/firestore';
import { askMintesnot } from '../services/aiService.js';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import MathRenderer from '../services/MathRenderer';

// Helper to get peer average time (fallback logic)
const getPeerAverageTime = (question) => {
  if (question?.totalAttempts > 0 && typeof question.cumulativeTimeSec === 'number') {
    return Math.round(question.cumulativeTimeSec / question.totalAttempts);
  }
  if (question?.peerAverageTimeSec && typeof question.peerAverageTimeSec === 'number') return question.peerAverageTimeSec;
  
  const seed = String(question?.id || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return 35 + (seed % 61); // fallback 35s to 95s
};

const Challenge = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [assignmentMeta, setAssignmentMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [questionTimer, setQuestionTimer] = useState(0);
  const [timeByQuestion, setTimeByQuestion] = useState({});
  const [takenQuizIds, setTakenQuizIds] = useState({});
  const [activeQuizCardId, setActiveQuizCardId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuredAssignmentId, setFeaturedAssignmentId] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Listen for Auth and Fetch real test history
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const fetchHistory = async () => {
          try {
            const q = query(
              collection(db, "test_history"),
              where("userId", "==", currentUser.uid),
              orderBy("completedAt", "desc")
            );
            const snap = await getDocs(q);
            const mapping = {};
            snap.docs.forEach(doc => {
              const data = doc.data();
              if (data.quizCardId && !mapping[data.quizCardId]) mapping[data.quizCardId] = doc.id;
            });
            setTakenQuizIds(mapping);

            // New: Fetch featured assignment ID
            const settingsRef = doc(db, "settings", "adminSettings");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
              const data = settingsSnap.data();
              if (data.featuredAssignmentId) {
                setFeaturedAssignmentId(data.featuredAssignmentId);
              }
            }
          } catch (err) {
            console.error("Data fetch failed (check if index is building):", err);
          }
        };
        fetchHistory();
      }
    });
    return () => unsubscribe();
  }, []);

  const summarizeAssignment = (questions) => {
    const typeCounts = {};
    const topicCounts = {};
    const subtopicCounts = {};

    questions.forEach((q) => {
      if (q.sectionType) typeCounts[q.sectionType] = (typeCounts[q.sectionType] || 0) + 1;
      if (q.domain) topicCounts[q.domain] = (topicCounts[q.domain] || 0) + 1;
      if (q.subtopic) subtopicCounts[q.subtopic] = (subtopicCounts[q.subtopic] || 0) + 1;
    });

    setAssignmentMeta({
      typeCounts,
      topicCounts,
      subtopicCounts,
      total: questions.length
    });
  };

  const handleSelectAnswer = (questionId, option) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  useEffect(() => {
    if (!quizStarted || activeQuestions.length === 0) return undefined;
    const intervalId = setInterval(() => {
      setQuestionTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [quizStarted, activeQuestions.length, currentIndex]);

  const persistQuestionTime = () => {
    const question = activeQuestions[currentIndex];
    if (!question) return;
    setTimeByQuestion((prev) => ({
      ...prev,
      [question.id]: (prev[question.id] || 0) + questionTimer
    }));
    setQuestionTimer(0);
  };

  const handleStartQuiz = (quizCardId = null) => {
    setQuizStarted(true);
    setQuizCompleted(false);
    setActiveQuizCardId(quizCardId);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuestionTimer(0);
    setTimeByQuestion({});
    setShowCalculator(false);
  };

  const handleSubmitQuiz = async () => {
    // 1. Manually calculate final times (React state is too slow for immediate DB save)
    const currentQ = activeQuestions[currentIndex];
    const finalTimeByQuestion = {
      ...timeByQuestion,
      [currentQ.id]: (timeByQuestion[currentQ.id] || 0) + questionTimer
    };

    setIsSubmitting(true);

    try {
      const totalSeconds = Object.values(finalTimeByQuestion).reduce((sum, s) => sum + s, 0);
      const resultData = {
        userId: user?.uid,
        assignmentId: activeQuestions[0]?.assignmentId || 'manual',
        quizCardId: activeQuizCardId, // Essential for linking the "Review" button
        score,
        totalQuestions: activeQuestions.length,
        totalTimeSec: totalSeconds,
        timeByQuestion: finalTimeByQuestion,
        selectedAnswers,
        questions: activeQuestions, // Save snapshot of questions for review
        completedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "test_history"), resultData);
      
      // Update User Hybrid Stats
      const userRef = doc(db, "users", user.uid);
      await runTransaction(db, async (transaction) => {
        const uSnap = await transaction.get(userRef);
        if (!uSnap.exists()) return;
        
        const uData = uSnap.data();
        const newTotalCorrect = (uData.totalCorrect || 0) + score;
        const newTotalAttempted = (uData.totalAttempted || 0) + activeQuestions.length;
        const newAccuracy = Math.round((newTotalCorrect / newTotalAttempted) * 100);
        
        // Streak Logic
        let newStreak = uData.streakCount || 0;
        const lastDate = uData.lastActivityDate?.toDate();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (!lastDate) {
          newStreak = 1;
        } else {
          lastDate.setHours(0,0,0,0);
          const diff = (today - lastDate) / (1000 * 60 * 60 * 24);
          if (diff === 1) newStreak += 1;
          else if (diff > 1) newStreak = 1;
        }

        transaction.update(userRef, {
          totalCorrect: newTotalCorrect,
          totalAttempted: newTotalAttempted,
          averageAccuracy: newAccuracy,
          streakCount: newStreak,
          lastActivityDate: serverTimestamp()
        });
      });
      
      // Update global question stats for peer averages
      const statBatch = writeBatch(db);
      activeQuestions.forEach(q => {
        const qRef = doc(db, "questions", q.id);
        const timeSpent = finalTimeByQuestion[q.id] || 0;
        statBatch.update(qRef, {
          totalAttempts: increment(1),
          cumulativeTimeSec: increment(timeSpent)
        });
      });
      await statBatch.commit();

      // Navigation happens here
      navigate(`/review/${docRef.id}`); 
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save results. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAll = () => {
    setActiveQuestions([]);
    setAssignmentMeta(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuestionTimer(0);
    setTimeByQuestion({});
    setActiveQuizCardId(null);
    setShowCalculator(false);
  };

  const handleAskAI = async () => {
    const userMsg = window.prompt("Ask Mintesnot anything about the SAT:");
    if (!userMsg) return;
    
    const currentQ = quizStarted && activeQuestions[currentIndex];
    const context = currentQ ? `The student is currently looking at this question: ${currentQ.text}` : "";
    
    try {
      const response = await askMintesnot(userMsg, context);
      alert(`Mintesnot says: \n\n${response}`);
    } catch (err) {
      console.error(err);
      alert("Mintesnot is currently resting. Try again later.");
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const score = activeQuestions.reduce((total, question) => {
    if (selectedAnswers[question.id] === question.correctAnswer) return total + 1;
    return total;
  }, 0);

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    try {
      const questionsRef = collection(db, "questions");
      const latestQuestionQuery = query(questionsRef, orderBy("createdAt", "desc"), limit(1));
      let assignmentQuery;

      if (featuredAssignmentId) { // Prioritize featured assignment if set
        assignmentQuery = query(questionsRef, where("assignmentId", "==", featuredAssignmentId), orderBy("createdAt", "desc"));
      } else {
        const latestSnapshot = await getDocs(latestQuestionQuery);
        if (latestSnapshot.empty) {
          alert("No assignment posted yet.");
          return;
        }
        const latestQuestion = latestSnapshot.docs[0].data();
        assignmentQuery = query(questionsRef, where("assignmentId", "==", latestQuestion.assignmentId), orderBy("createdAt", "desc"), limit(30));
      }

      const assignmentSnapshot = await getDocs(assignmentQuery);
      const fetched = assignmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (fetched.length === 0) {
        alert("No questions found for the current assignment.");
        return;
      }
      setActiveQuestions(fetched);
      summarizeAssignment(fetched);

    } catch (error) {
      console.error("Error loading assignment:", error);
    } finally {
      setLoading(false);
    }
  }, [featuredAssignmentId]);

  useEffect(() => {
    if (activeQuestions.length === 0) {
      loadAssignment();
    }
  }, [activeQuestions.length, loadAssignment]);

  if (quizCompleted) {
    const percentage = Math.round((score / activeQuestions.length) * 100);
    const totalSeconds = Object.values(timeByQuestion).reduce((sum, seconds) => sum + seconds, 0);
    const averageSeconds = activeQuestions.length ? Math.round(totalSeconds / activeQuestions.length) : 0;
    const peerAverageAll = activeQuestions.length
      ? Math.round(
          activeQuestions.reduce((sum, question) => sum + getPeerAverageTime(question), 0) / activeQuestions.length
        )
      : 0;

    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[36px] p-6 sm:p-10 shadow-sm">
          <div className="text-center">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2">Challenge Complete</h2>
          <p className="text-slate-500 mb-8">Great effort. Here is your result.</p>
          <div className="inline-flex flex-col items-center justify-center rounded-3xl bg-blue-50 px-10 py-8 mb-8">
            <p className="text-5xl font-black text-blue-700">{score}/{activeQuestions.length}</p>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-2">{percentage}% Accuracy</p>
            <p className="text-xs font-semibold text-slate-600 mt-2">Your Avg Time: {averageSeconds}s per question</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">Peer Avg Time: {peerAverageAll}s per question</p>
            <p className="text-xs font-bold text-slate-500 mt-3 border-t border-blue-100 pt-2 w-full text-center">Total Time: {totalSeconds}s</p>
          </div>
          </div>

          <div className="border border-slate-100 rounded-2xl p-5 mb-8">
            <h3 className="text-lg font-black text-slate-900 mb-3">Time Analysis Per Question</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeQuestions.map((question, idx) => {
                const yourTime = timeByQuestion[question.id] || 0;
                const peerTime = getPeerAverageTime(question);
                return (
                  <div key={question.id} className="grid grid-cols-3 items-center text-sm border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-700">Q{idx + 1}</span>
                    <span className="text-blue-700 font-semibold">You: {yourTime}s</span>
                    <span className="text-slate-600">Peer Avg: {peerTime}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleStartQuiz} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-700 transition">
              Retry Assignment
            </button>
            <button onClick={handleResetAll} className="px-8 py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition">
              Back to Assignment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizStarted && activeQuestions.length > 0) {
    const currentQuestion = activeQuestions[currentIndex];
    const options = currentQuestion.options || {};
    const letters = ['A', 'B', 'C', 'D'];
    const hasAnsweredCurrent = Boolean(selectedAnswers[currentQuestion.id]);
    const isLastQuestion = currentIndex === activeQuestions.length - 1;

    return (
      <div className="w-full p-4 sm:p-8 transition-all duration-500 relative">
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Question {currentIndex + 1} of {activeQuestions.length}</h2>
            <p className="text-slate-500 text-sm mt-1">{currentQuestion.sectionType} - {currentQuestion.domain}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Answered</p>
              <p className="text-2xl font-black text-slate-900">{answeredCount}/{activeQuestions.length}</p>
            </div>

            {currentQuestion.sectionType === 'Math' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desmos Calculator</span>
                <div className="relative">
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    title="Menu"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-[100] py-2 overflow-hidden">
                      <button
                        onClick={() => { setShowCalculator(!showCalculator); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
                      >
                        <span className="text-lg">🧮</span>
                        {showCalculator ? 'Close Calculator' : 'Desmos Calculator'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex w-full gap-8 transition-all duration-500 ${showCalculator ? 'flex-col lg:flex-row items-start' : 'flex-col items-center justify-center'}`}>
          {showCalculator && (
            <div className="w-full lg:flex-1 h-[650px] bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-left duration-300">
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base">🧮</span> Graphing Calculator
                </span>
                <button onClick={() => setShowCalculator(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1">
                <iframe 
                  src="https://www.desmos.com/calculator"
                  className="w-full h-full border-none"
                  title="Desmos SAT Calculator"
                />
              </div>
            </div>
          )}

          <div className={`w-full ${showCalculator ? 'lg:flex-1' : 'max-w-5xl'}`}>
            <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-6 sm:p-10 shadow-sm">
          <div className="text-lg text-slate-800 leading-relaxed mb-8">
            <MathRenderer>{currentQuestion.text || "Question text is missing."}</MathRenderer>
          </div>

          <div className="flex flex-wrap gap-6 py-3 border-b border-slate-100 mb-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Type: {currentQuestion.sectionType}</span>
            <span>Topic: {currentQuestion.domain}</span>
            <span>Subtopic: {currentQuestion.subtopic}</span>
          </div>

          <div className="space-y-3">
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => handleSelectAnswer(currentQuestion.id, letter)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedAnswers[currentQuestion.id] === letter
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                }`}
              >
                <span className="font-black mr-3">{letter}.</span>
                <span className="inline-block align-middle">
                  <MathRenderer>{options[letter] || "(Empty option)"}</MathRenderer>
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => {
                persistQuestionTime();
                setCurrentIndex((prev) => Math.max(prev - 1, 0));
              }}
              disabled={currentIndex === 0}
              className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            {!isLastQuestion ? (
              <button
                onClick={() => {
                  persistQuestionTime();
                  setCurrentIndex((prev) => Math.min(prev + 1, activeQuestions.length - 1));
                }}
                className="ml-auto px-6 py-3 rounded-xl bg-slate-900 text-white font-bold"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={answeredCount === 0 || !hasAnsweredCurrent || isSubmitting}
                className="ml-auto px-6 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Submit Challenge"}
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
        {/* Preloader for instant usage */}
        <div style={{ position: 'fixed', left: '-5000px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          <iframe src="https://www.desmos.com/calculator" title="calculator-preload" />
        </div>
      </div>
    );
  }

  if (activeQuestions.length > 0) {
    const subtopicCards = Object.entries(assignmentMeta?.subtopicCounts || {}).map(([subtopic, count]) => {
      const representative = activeQuestions.find(q => q.subtopic === subtopic);
      return {
        id: subtopic,
        title: subtopic,
        count,
        sectionType: representative?.sectionType || 'N/A',
        domain: representative?.domain || 'N/A'
      };
    });

    return (
      <div className="w-full p-4 sm:p-10">
        <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900">Assignment/Quizzes</h2>
            <p className="text-slate-500 text-sm mt-1">See all assignments and quizzes assigned to you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {subtopicCards.map((card, idx) => (
              <div key={card.id} className="border border-rose-200 bg-rose-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 mb-2">Quiz</p>
                <p className="text-xs text-slate-500 mb-2">Due: {new Date(Date.now() + (idx + 1) * 86400000).toLocaleString()}</p>
                <p className="text-sm font-bold text-slate-800">{card.title}</p>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  <p><span className="font-semibold">Type:</span> {card.sectionType}</p>
                  <p><span className="font-semibold">Topic:</span> {card.domain}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-rose-200 text-xs text-slate-500">
                  <span>{activeQuestions.length} questions</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleStartQuiz(card.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                  >
                    {takenQuizIds[card.id] ? 'Retake Test' : 'Take Test'}
                  </button>
                  {takenQuizIds[card.id] && (
                    <button
                      type="button"
                      onClick={() => navigate(`/review/${takenQuizIds[card.id]}`)}
                      className="flex-1 px-3 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Review Test
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">See All</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-10">
      <header className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Start Challenge</h1>
        <p className="text-slate-500 font-medium">Load the latest SAT assignment.</p>
      </header>

      {loading ? (
        <div className="text-center py-20 font-bold text-slate-400 animate-pulse">Loading Assignment...</div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-5 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">📚</div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">SAT Assignment</h2>
          <p className="text-slate-500 mb-8">The challenge will display question types, total questions, topics, and subtopics before you begin.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={loadAssignment}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition"
            >
            Load Assignment
          </button>
          <button
            type="button"
            onClick={handleAskAI}
            className="ml-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition"
          >
            Ask ምንተስኖት AI
          </button>
          </div>
        </div>
      )}
      {/* Preloader for instant usage */}
      <div style={{ position: 'fixed', left: '-5000px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
        <iframe src="https://www.desmos.com/calculator" title="calculator-preload-landing" />
      </div>
    </div>
  );
};

export default Challenge;