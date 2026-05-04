import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const Challenge = () => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestAssignment = async () => {
      try {
        // This looks for the newest questions posted by the coordinator
        const q = query(
          collection(db, "questions"), 
          orderBy("createdAt", "desc"), 
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (fetched.length > 0) {
          setAssignment({
            topic: fetched[0].domain,
            subtopic: fetched[0].subtopic,
            questions: fetched
          });
        }
      } catch (error) {
        console.error("Error loading assignment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestAssignment();
  }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">Loading Borderless Assignment...</div>;

  return (
    <div className="max-w-4xl mx-auto p-10">
      <h2 className="text-4xl font-black text-slate-900 mb-2">Borderless SAT Prep</h2>
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-10">Current Club Assignment</p>

      {assignment ? (
        <div className="bg-white border-2 border-slate-100 p-10 rounded-[40px] shadow-xl hover:border-blue-500 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase">
                {assignment.topic}
              </span>
              <h3 className="text-3xl font-black mt-3 text-slate-900">{assignment.subtopic}</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">20</p>
              <p className="text-[10px] font-bold text-slate-400">QUESTIONS</p>
            </div>
          </div>

          <p className="text-slate-600 mb-8 font-medium">
            This assignment was posted by the Borderless Coordinators. Complete this drill to see your accuracy score.
          </p>

          <button 
            className="w-full py-5 bg-slate-900 text-white rounded-[32px] font-black text-xl hover:bg-blue-600 transition-all shadow-lg"
            onClick={() => console.log("Start working on:", assignment.questions)}
          >
            START ASSIGNMENT
          </button>
        </div>
      ) : (
        <div className="p-10 bg-slate-50 rounded-[40px] text-center">
          <p className="font-bold text-slate-400">No active assignment. Check back later!</p>
        </div>
      )}
    </div>
  );
};

export default Challenge;
