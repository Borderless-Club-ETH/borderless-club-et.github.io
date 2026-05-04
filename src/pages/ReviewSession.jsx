import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { generateInstantExplanation } from '../services/aiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MathRenderer from '../services/MathRenderer';

// Helper to get peer average time (matches QuestionChallenge logic)
const getPeerAverageTime = (q) => {
  if (q?.totalAttempts > 0 && typeof q.cumulativeTimeSec === 'number') {
    return Math.round(q.cumulativeTimeSec / q.totalAttempts);
  }
  const seed = String(q?.id || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return 35 + (seed % 61);
};

const ReviewSession = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDetailView, setIsDetailView] = useState(false);
  const [explanations, setExplanations] = useState({});
  const [loadingAI, setLoadingAI] = useState({});
  const [voted, setVoted] = useState({});

  useEffect(() => {
    const fetchResult = async () => {
      const docSnap = await getDoc(doc(db, "test_history", resultId));
      if (docSnap.exists()) {
        const resultData = docSnap.data();
        
        // Fetch fresh question stats to show LIVE peer averages
        const freshQuestions = await Promise.all(
          resultData.questions.map(async (q) => {
            const qSnap = await getDoc(doc(db, "questions", q.id));
            return qSnap.exists() ? { ...q, ...qSnap.data() } : q;
          })
        );
        setData({ ...resultData, questions: freshQuestions });
      }
      setLoading(false);
    };
    fetchResult();
  }, [resultId]);

  const fetchExplanation = async (index, q) => {
    if (explanations[index]) return;
    setLoadingAI(prev => ({ ...prev, [index]: true }));
    const text = await generateInstantExplanation(q.text, q.options, q.correctAnswer, data.selectedAnswers[q.id]);
    setExplanations(prev => ({ ...prev, [index]: text }));
    setLoadingAI(prev => ({ ...prev, [index]: false }));
  };

  const handleVote = async (questionId, type) => {
    if (voted[questionId]) return;
    try {
      const qRef = doc(db, "questions", questionId);
      await updateDoc(qRef, {
        [type === 'class' ? 'votesInClass' : 'votesVideo']: increment(1)
      });
      setVoted(prev => ({ ...prev, [questionId]: true }));
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  // Automation: Only trigger AI if a pre-generated explanation is somehow missing
  useEffect(() => {
    if (data && isDetailView) {
      data.questions.forEach((q, index) => {
        if (!q.explanation && !explanations[index]) {
          fetchExplanation(index, q);
        }
      });
    }
  }, [data, isDetailView]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">Loading Analytics...</div>;
  if (!data) return <div className="p-20 text-center">Result not found.</div>;

  const masteryScore = Math.round((data.score / data.totalQuestions) * 100);
  const timeTrained = Math.round(data.totalTimeSec / 60);

  const timingData = data.questions.map((q, i) => ({
    name: `Q${i + 1}`,
    'Your Time': data.timeByQuestion[q.id] || 0,
    'Peer Average': getPeerAverageTime(q),
  }));

  // Analytics Landing View
  if (!isDetailView) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter text-center">Mastery Report</h1>
        <p className="text-center text-slate-500 font-medium mb-8 sm:mb-12">Performance insights for your latest session.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[40px] border border-white shadow-xl shadow-blue-500/5 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Time Trained</p>
            <p className="text-4xl font-black text-slate-900">{timeTrained}<span className="text-blue-500 text-lg ml-1">min</span></p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[40px] border border-white shadow-xl shadow-emerald-500/5 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Test Score</p>
            <p className="text-4xl font-black text-slate-900">{data.score}<span className="text-emerald-500 text-lg">/{data.totalQuestions}</span></p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[40px] border border-white shadow-xl shadow-purple-500/5 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Test Mastery</p>
            <p className="text-4xl font-black text-slate-900">{masteryScore}<span className="text-purple-500 text-lg">%</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[32px] sm:rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between mb-10 overflow-hidden relative">
          <div>
            <h2 className="text-xl sm:text-2xl font-black mb-2">Review Test With Mintesnot</h2>
            <p className="text-slate-400 text-sm max-w-md">Our AI tutor has analyzed your mistakes and is ready to explain the logic behind every choice.</p>
            <button 
              onClick={() => setIsDetailView(true)}
              className="mt-6 w-full md:w-auto px-8 py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black hover:bg-emerald-400 transition"
            >
              Review Your Test Now
            </button>
          </div>
          <div className="text-8xl opacity-20 absolute -right-4 -bottom-4">ምን</div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-10">
          <h3 className="font-black text-slate-900 mb-6">Timing Analysis vs Peers (Seconds)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timingData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
                <Bar dataKey="Your Time" fill="#3b82f6" radius={[20, 20, 0, 0]} barSize={12} />
                <Bar dataKey="Peer Average" fill="#cbd5e1" radius={[20, 20, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 mb-6">Performance Timeline</h3>
          <div className="flex flex-wrap gap-4">
            {data.questions.map((q, i) => {
              const isCorrect = data.selectedAnswers[q.id] === q.correctAnswer;
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isCorrect ? '✓' : '✕'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Q{i+1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Question-by-Question Review Interface
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setIsDetailView(false)} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition">← Back to Analytics</button>
        <h2 className="text-xl font-black text-slate-900">Review Mode</h2>
      </div>

      <div className="space-y-12">
        {data.questions.map((q, i) => {
          const selected = data.selectedAnswers[q.id];
          const isCorrect = selected === q.correctAnswer;
          const timeSpent = data.timeByQuestion[q.id] || 0;
          const peerTime = getPeerAverageTime(q);

          return (
            <div key={i} className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-6">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">Question {i+1}</span>
                <div className="flex flex-wrap gap-4">
                  <span className="text-xs font-bold text-slate-400">{timeSpent}s spent <span className="opacity-50 font-normal ml-1">(Peer Avg: {peerTime}s)</span></span>
                  <span className={`text-xs font-black uppercase ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                  </span>
                </div>
              </div>

              <div className="text-lg text-slate-800 leading-relaxed mb-8">
                <MathRenderer>{q.text}</MathRenderer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {['A', 'B', 'C', 'D'].map(l => {
                  const isCorrectChoice = q.correctAnswer === l;
                  const isStudentChoice = selected === l;
                  
                  let borderColor = 'border-slate-100';
                  let bgColor = 'bg-white';
                  let textColor = 'text-slate-700';

                  if (isCorrectChoice) {
                    borderColor = 'border-emerald-500';
                    bgColor = 'bg-emerald-50';
                    textColor = 'text-emerald-900';
                  } else if (isStudentChoice && !isCorrect) {
                    borderColor = 'border-rose-500';
                    bgColor = 'bg-rose-50';
                    textColor = 'text-rose-900';
                  }

                  return (
                    <div key={l} className={`p-4 rounded-2xl border-2 ${borderColor} ${bgColor} ${textColor} relative`}>
                      <span className="font-black mr-3">{l}.</span>
                      <span className="text-sm font-medium inline-block align-middle">
                        <MathRenderer>{q.options[l]}</MathRenderer>
                      </span>
                      {isStudentChoice && <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded-full font-black">YOUR PICK</span>}
                    </div>
                  );
                })}
              </div>

              {/* Automated Mintesnot AI Explanation */}
              <div className="mt-8 pt-8 border-t border-slate-50 bg-slate-50/50 -mx-8 px-8 rounded-b-[32px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-[10px] text-white font-black">M</div>
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-tighter">Mintesnot's Analysis</h4>
                </div>
                
                {!q.explanation && !explanations[i] ? (
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                     <span className="text-xs font-bold text-slate-400 italic tracking-tight">Mintesnot is analyzing...</span>
                   </div>
                ) : (
                  <div className="text-sm text-slate-600 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <MathRenderer>{q.explanation || explanations[i]}</MathRenderer>
                  </div>
                )}
              </div>

              {/* Human Explanation Request Section */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-blue-50 rounded-2xl bg-blue-50/30">
                <p className="text-xs font-bold text-slate-500">Explanation still unclear?</p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    disabled={voted[q.id]}
                    onClick={() => handleVote(q.id, 'class')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      voted[q.id] ? 'bg-slate-200 text-slate-400' : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    {voted[q.id] ? 'Requested ✓' : 'Explain in Class'}
                  </button>
                  <button
                    disabled={voted[q.id]}
                    onClick={() => handleVote(q.id, 'video')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      voted[q.id] ? 'bg-slate-200 text-slate-400' : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-500 hover:text-white'
                    }`}
                  >
                    {voted[q.id] ? 'Requested ✓' : 'Make a Video'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 text-center">
        <button 
          onClick={() => navigate('/challenge')}
          className="px-10 py-5 bg-slate-900 text-white rounded-[32px] font-black transition shadow-xl hover:scale-[1.02]"
        >
          Finish Review
        </button>
      </div>
    </div>
  );
};

export default ReviewSession;