import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, writeBatch, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { generateSATExplanation } from '../services/aiService.js';

const SAT_TAXONOMY = {
  "Reading & Writing": {
    "Craft and Structure": [
      "Words in Context (Vocabulary)",
      "Text Structure and Purpose",
      "Cross-Text Connections (Comparing Author 1 & Author 2)"
    ],
    "Information and Ideas": [
      "Central Ideas and Details",
      "Command of Evidence (Textual & Quantitative)",
      "Inferences"
    ],
    "Standard English Conventions": [
      "Boundaries (Semicolons, Colons, Dashes, Periods)",
      "Form, Structure, and Sense (Verb Tense, Pronouns, Plurals)"
    ],
    "Expression of Ideas": [
      "Transitions (Linking words like however, consequently)",
      "Rhetorical Synthesis (Using bulleted notes to meet a goal)"
    ]
  },
  Math: {
    Algebra: [
      "Linear Equations in One Variable",
      "Linear Equations in Two Variables",
      "Linear Functions",
      "Systems of Two Linear Equations",
      "Linear Inequalities"
    ],
    "Advanced Math": [
      "Equivalent Expressions",
      "Nonlinear Equations in One Variable",
      "Systems of Equations (Linear and Nonlinear)",
      "Nonlinear Functions (Quadratic & Exponential)"
    ],
    "Problem Solving and Data Analysis": [
      "Ratios, Rates, and Proportions",
      "Percentages",
      "Probability and Relative Frequency",
      "One-Variable Data (Mean, Median, Range)",
      "Two-Variable Data (Scatterplots)"
    ],
    "Geometry and Trigonometry": [
      "Area and Volume",
      "Lines, Angles, and Triangles",
      "Right Triangles and Trigonometry (SOH CAH TOA)",
      "Circles (Equations and Geometry)"
    ]
  }
};

const getDefaultDomain = (type) => Object.keys(SAT_TAXONOMY[type])[0];
const getDefaultSubtopic = (type, domain) => SAT_TAXONOMY[type][domain][0];

const CreateQuestionSet = () => {
  const [user, setUser] = useState(null);
  const [setup, setSetup] = useState(() => {
    const defaultType = "Reading & Writing";
    const defaultDomain = getDefaultDomain(defaultType);
    return {
      count: 20,
      sectionType: defaultType,
      domain: defaultDomain,
      subtopic: getDefaultSubtopic(defaultType, defaultDomain)
    };
  });
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [canPostQuestions, setCanPostQuestions] = useState(false);

  // 1. Authorization Guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const fetchUserRole = async () => {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (
            (userDocSnap.exists() && userDocSnap.data().canPostQuestions) ||
            currentUser.email === "bamlakb.woldeyohannes@gmail.com"
          ) {
            setCanPostQuestions(true);
          }
          setIsCheckingAuth(false);
        };
        fetchUserRole();
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const startSet = () => {
    const num = parseInt(setup.count, 10);
    if (isNaN(num) || num <= 0) return alert("Enter a valid number of questions.");

    const assignmentId = `assignment-${Date.now()}`;
    const newSet = Array.from({ length: num }, () => ({
      text: '',
      imageUrl: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      sectionType: setup.sectionType,
      domain: setup.domain,
      subtopic: setup.subtopic,
      assignmentId,
      aiExplanation: ''
    }));
    setQuestions(newSet);
  };

  const updateField = (field, value) => {
    const updated = [...questions];
    updated[currentIndex][field] = value;
    setQuestions(updated);
  };

  const updateOption = (letter, value) => {
    const updated = [...questions];
    updated[currentIndex].options[letter] = value;
    setQuestions(updated);
  };

  const handleGenerateAI = async () => {
    const q = questions[currentIndex];
    if (!q.text || !q.options.A || !q.options.B) {
      return alert("Please fill in the question and options first.");
    }
    
    setIsGeneratingAI(true);
    try {
      const explanation = await generateSATExplanation(q.text, q.options, q.correctAnswer, q.subtopic);
      updateField('aiExplanation', explanation);
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Check your API key.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePublishAll = async () => {
    setIsPublishing(true);
    try {
      const batch = writeBatch(db);
      questions.forEach((q) => {
        const newDocRef = doc(collection(db, "questions"));
        batch.set(newDocRef, {
          ...q,
          explanation: q.aiExplanation?.trim() || `Analysis for ${q.subtopic}: Choice ${q.correctAnswer} follows the logical requirements of the prompt.`,
          createdAt: new Date(),
          author: user.email,
          totalAttempts: 0,
          cumulativeTimeSec: 0,
          assignmentQuestionCount: questions.length
        });
      });
      await batch.commit();
      alert(`Success! ${questions.length} questions added to the Hub.`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Permission Denied. Check Firestore Rules.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isCheckingAuth) {
    return <div className="p-20 text-center font-bold">Checking authorization...</div>;
  }

  if (!user || !canPostQuestions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-3xl">🔒</div>
        <h2 className="text-2xl font-black text-slate-900">Authorized Access Only</h2>
        <p className="text-slate-500 mt-2">Only Borderless Club Coordinators can post new sets.</p>
      </div>
    );
  }

  // STEP 1: SETUP SCREEN
  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 p-10 bg-white rounded-[40px] border border-slate-100 shadow-2xl">
        <h2 className="text-3xl font-black mb-8 text-slate-900">New Set Setup</h2>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Questions per assignment</label>
            <input
              type="number"
              min="1"
              className="w-full mt-2 p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700"
              value={setup.count}
              placeholder="e.g. 15, 20, or 30"
              onChange={(e) => setSetup({ ...setup, count: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Question Type</label>
            <select 
              className="w-full mt-2 p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700"
              value={setup.sectionType}
              onChange={(e) => {
                const sectionType = e.target.value;
                const domain = getDefaultDomain(sectionType);
                setSetup({
                  ...setup,
                  sectionType,
                  domain,
                  subtopic: getDefaultSubtopic(sectionType, domain)
                });
              }}
            >
              {Object.keys(SAT_TAXONOMY).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Topic</label>
            <select
              className="w-full mt-2 p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700"
              value={setup.domain}
              onChange={(e) => {
                const domain = e.target.value;
                setSetup({
                  ...setup,
                  domain,
                  subtopic: getDefaultSubtopic(setup.sectionType, domain)
                });
              }}
            >
              {Object.keys(SAT_TAXONOMY[setup.sectionType]).map((domain) => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Subtopic</label>
            <select
              className="w-full mt-2 p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700"
              value={setup.subtopic}
              onChange={(e) => setSetup({ ...setup, subtopic: e.target.value })}
            >
              {SAT_TAXONOMY[setup.sectionType][setup.domain].map((subtopic) => (
                <option key={subtopic} value={subtopic}>{subtopic}</option>
              ))}
            </select>
          </div>
          <button onClick={startSet} className="w-full py-5 bg-purple-600 text-white rounded-[32px] font-bold text-lg hover:bg-purple-700 transition shadow-xl shadow-purple-100">
            Initialize Project
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: QUESTION INPUT LOOP
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-tighter mb-2 inline-block">
            {questions[currentIndex].sectionType}
          </span>
          <h2 className="text-3xl font-black text-slate-900">Drafting Question {currentIndex + 1}</h2>
          <p className="text-sm text-slate-500 mt-2">{questions[currentIndex].domain} - {questions[currentIndex].subtopic}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Set Progress</p>
          <p className="text-xl font-black text-slate-900">{Math.round(((currentIndex + 1) / questions.length) * 100)}%</p>
        </div>
      </div>

      {!isReviewing ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <textarea 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl h-48 outline-none text-lg"
              placeholder="Paste question body..."
              value={questions[currentIndex].text}
              onChange={(e) => updateField('text', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Type</label>
              <select
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700"
                value={questions[currentIndex].sectionType}
                onChange={(e) => {
                  const sectionType = e.target.value;
                  const domain = getDefaultDomain(sectionType);
                  const updated = [...questions];
                  updated[currentIndex] = {
                    ...updated[currentIndex],
                    sectionType,
                    domain,
                    subtopic: getDefaultSubtopic(sectionType, domain)
                  };
                  setQuestions(updated);
                }}
              >
                {Object.keys(SAT_TAXONOMY).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Topic</label>
              <select
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700"
                value={questions[currentIndex].domain}
                onChange={(e) => {
                  const domain = e.target.value;
                  const updated = [...questions];
                  updated[currentIndex] = {
                    ...updated[currentIndex],
                    domain,
                    subtopic: getDefaultSubtopic(updated[currentIndex].sectionType, domain)
                  };
                  setQuestions(updated);
                }}
              >
                {Object.keys(SAT_TAXONOMY[questions[currentIndex].sectionType]).map((domain) => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subtopic</label>
              <select
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700"
                value={questions[currentIndex].subtopic}
                onChange={(e) => updateField('subtopic', e.target.value)}
              >
                {SAT_TAXONOMY[questions[currentIndex].sectionType][questions[currentIndex].domain].map((subtopic) => (
                  <option key={subtopic} value={subtopic}>{subtopic}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Image URL</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 rounded-xl outline-none"
                placeholder="https://..." value={questions[currentIndex].imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
              />
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Correct Choice</label>
              <select 
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-purple-600"
                value={questions[currentIndex].correctAnswer}
                onChange={(e) => updateField('correctAnswer', e.target.value)}
              >
                {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>Choice {l}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AI Explanation (Mintesnot Placeholder)</label>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
              >
                {isGeneratingAI ? "Thinking..." : "Generate with ምንተስኖት"}
              </button>
            </div>
            <textarea
              className="w-full p-3 bg-slate-50 rounded-xl outline-none min-h-24"
              placeholder="Poster can review and edit AI explanation before publishing..."
              value={questions[currentIndex].aiExplanation || ''}
              onChange={(e) => updateField('aiExplanation', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map(l => (
              <div key={l} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-slate-400">{l}</span>
                <input 
                  className="w-full outline-none font-medium" placeholder={`Choice ${l} content...`}
                  value={questions[currentIndex].options[l]}
                  onChange={(e) => updateOption(l, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            {currentIndex > 0 && (
              <button onClick={() => setCurrentIndex(currentIndex - 1)} className="px-10 py-5 border-2 border-slate-200 rounded-[32px] font-bold text-slate-500 hover:bg-slate-50 transition">Back</button>
            )}
            <button 
              onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(currentIndex + 1) : setIsReviewing(true)}
              className="flex-1 py-5 bg-slate-900 text-white rounded-[32px] font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "Review Full Set"}
            </button>
          </div>
        </div>
      ) : (
        // STEP 3: FINAL REVIEW
        <div className="max-w-3xl mx-auto animate-in fade-in">
          <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl">
            <h3 className="text-3xl font-black mb-2">Final Check</h3>
            <p className="text-slate-400 mb-8 font-bold uppercase text-xs tracking-widest">Assignment ({questions.length} Questions)</p>
            
            <div className="space-y-3 mb-10 max-h-64 overflow-y-auto pr-4">
              {questions.map((q, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition">
                  <span className="text-sm opacity-50 truncate max-w-[250px]">
                    Q{i+1}: {q.text || "(Empty Text)"} - {q.sectionType} / {q.domain}
                  </span>
                  <span className="font-black text-green-400 bg-green-400/10 px-3 py-1 rounded-lg">Correct: {q.correctAnswer}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsReviewing(false)} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold hover:bg-white/20 transition">Edit Details</button>
              <button
                type="button"
                onClick={() => alert("Mintesnot AI explanation will be connected next.")}
                className="flex-1 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-700 transition"
              >
                Review AI Explanations
              </button>
              <button 
                onClick={handlePublishAll} 
                disabled={isPublishing}
                className="flex-1 py-4 bg-green-600 rounded-2xl font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {isPublishing ? "Publishing..." : "Launch Set Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuestionSet;