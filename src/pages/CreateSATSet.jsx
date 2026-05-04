import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config'; 
import { collection, writeBatch, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// This ensures the buttons match the database tags.
// This array is commented out as it's not directly used in the current logic,
// but kept for reference or future guest-facing labels.
/*
const domains = [
  "Craft and Structure",
  "Information and Ideas",
  "Standard English Conventions",
  "Expression of Ideas",
  "Algebra",
  "Advanced Math",
  "Problem Solving & Data Analysis",
  "Geometry and Trigonometry"
];
*/

// This is your list of official SAT topics
const SAT_DOMAINS = {
  "Craft and Structure": ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
  "Information and Ideas": ["Central Ideas and Details", "Command of Evidence", "Inferences"],
  "Standard English Conventions": ["Boundaries", "Form, Structure, and Sense"],
  "Expression of Ideas": ["Transitions", "Rhetorical Synthesis"],
  "Algebra": ["Linear Equations", "Linear Functions", "Systems of Linear Equations", "Linear Inequalities"],
  "Advanced Math": ["Equivalent Expressions", "Nonlinear Equations", "Quadratic & Exponential Functions"],
  "Problem Solving & Data Analysis": ["Ratios and Proportions", "Percentages", "Probability", "One-Variable Data", "Two-Variable Data"],
  "Geometry and Trigonometry": ["Area and Volume", "Lines and Angles", "Right Triangles and Trig", "Circles"]
};

const CreateSATSet = () => {
  const [user, setUser] = useState(null);
  const [setup, setSetup] = useState({ count: "", domain: "Algebra", subtopic: "Linear Equations" });
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);

  // Check if you are logged in
  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const startSet = () => {
    const num = parseInt(setup.count);
    if (!num || num <= 0) return alert("Please enter how many questions you want to make.");
    
    const assignmentId = `legacy-${Date.now()}`;
    setQuestions(Array.from({ length: num }, () => ({
      text: '',
      imageUrl: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      domain: setup.domain,
      subtopic: setup.subtopic,
      sectionType: "Math", // Defaulting to Math for compatibility with Challenge page
      assignmentId
    })));
  };

  const updateField = (field, value) => {
    const updated = [...questions];
    updated[currentIndex][field] = value;
    setQuestions(updated);
  };

  const handlePublish = async () => {
    const batch = writeBatch(db);
    questions.forEach(q => {
      const ref = doc(collection(db, "questions"));
      batch.set(ref, { ...q, createdAt: new Date(), author: user.email });
    });
    await batch.commit();
    alert("Borderless SAT Set Published!");
    window.location.reload();
  };

  // 🔒 Security Check: Only you (or your email) can see this page
  if (!user || user.email !== "bamlakb.woldeyohannes@gmail.com") {
    return <div className="p-20 text-center font-bold">Access Denied. Please log in as an administrator.</div>;
  }

  // SCREEN 1: Setup
  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 p-10 bg-white rounded-[40px] shadow-2xl border border-slate-100">
        <h2 className="text-2xl font-black mb-6">Create SAT Set</h2>
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400">HOW MANY QUESTIONS?</label>
          <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="e.g. 10" value={setup.count} onChange={(e) => setSetup({...setup, count: e.target.value})} />
          
          <label className="text-xs font-bold text-slate-400">CHOOSE DOMAIN</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={setup.domain} onChange={(e) => setSetup({...setup, domain: e.target.value, subtopic: SAT_DOMAINS[e.target.value][0]})}>
            {Object.keys(SAT_DOMAINS).map(d => <option key={d}>{d}</option>)}
          </select>

          <label className="text-xs font-bold text-slate-400">CHOOSE SUBTOPIC</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl" value={setup.subtopic} onChange={(e) => setSetup({...setup, subtopic: e.target.value})}>
            {SAT_DOMAINS[setup.domain].map(s => <option key={s}>{s}</option>)}
          </select>

          <button onClick={startSet} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mt-4">Start Drafting</button>
        </div>
      </div>
    );
  }

  // SCREEN 2: Input Questions
  return (
    <div className="max-w-4xl mx-auto p-6">
       <div className="mb-8">
         <h2 className="text-3xl font-black">Question {currentIndex + 1} of {questions.length}</h2>
         <p className="text-blue-600 font-bold">{setup.subtopic}</p>
       </div>

       <div className="space-y-6">
         <textarea className="w-full p-6 bg-white border border-slate-200 rounded-[32px] h-40 outline-none shadow-sm" placeholder="Paste SAT Question here..." value={questions[currentIndex].text} onChange={(e) => updateField('text', e.target.value)} />
         
         <div className="grid grid-cols-2 gap-4">
           {['A', 'B', 'C', 'D'].map(l => (
             <div key={l} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-3">
               <span className="font-black text-slate-300">{l}</span>
               <input className="w-full outline-none" placeholder="Answer..." value={questions[currentIndex].options[l]} onChange={(e) => {
                 const newOpts = {...questions[currentIndex].options, [l]: e.target.value};
                 updateField('options', newOpts);
               }} />
             </div>
           ))}
         </div>

         <div className="flex gap-4">
           <select className="p-4 bg-white border rounded-2xl font-bold text-blue-600" value={questions[currentIndex].correctAnswer} onChange={(e) => updateField('correctAnswer', e.target.value)}>
             {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>Correct: {l}</option>)}
           </select>
           
           <button onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} className="px-6 py-4 border rounded-2xl font-bold">Back</button>
           
           <button onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(currentIndex + 1) : setIsReviewing(true)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold">
             {currentIndex < questions.length - 1 ? "Next Question" : "Final Review"}
           </button>
         </div>
       </div>

       {isReviewing && (
         <div className="fixed inset-0 bg-white p-10 z-50 overflow-y-auto">
            <h3 className="text-3xl font-black mb-6 text-slate-900">Final Review</h3>
            <div className="space-y-4 mb-10">
              {questions.map((q, i) => (
                <div key={i} className="p-4 border rounded-2xl flex justify-between">
                  <span className="truncate max-w-md">Q{i+1}: {q.text}</span>
                  <span className="font-bold text-blue-600">Correct: {q.correctAnswer}</span>
                </div>
              ))}
            </div>
            <button onClick={handlePublish} className="w-full py-5 bg-green-600 text-white rounded-[32px] font-bold text-xl">Publish to Borderless SAT Hub</button>
         </div>
       )}
    </div>
  );
};

export default CreateSATSet;