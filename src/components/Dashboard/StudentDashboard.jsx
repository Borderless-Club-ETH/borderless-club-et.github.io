import React, { useState, useEffect } from 'react';
import AnalyticsChart from './AnalyticsChart';
import ScoreInputForm from './ScoreInputForm';
import { db, auth } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

const StudentDashboard = () => {
  const [stats, setStats] = useState({
    latestBaseScore: 0,
    latestProjected: 0,
    scoreHistory: []
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          latestBaseScore: data.latestBaseScore || 0,
          latestProjected: data.latestProjectedScore || 0,
          scoreHistory: data.scoreHistory || []
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm font-medium">Latest SAT Score</p>
            <h3 className="text-3xl font-bold text-slate-900">{stats.latestBaseScore}</h3>
          </div>
          <div className="bg-blue-600 p-6 rounded-2xl shadow-sm text-white">
            <p className="text-blue-100 text-sm font-medium">Projected Score</p>
            <h3 className="text-3xl font-bold">{stats.latestProjected}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4">Score Progress</h3>
          {/* We pass the history data into the chart! */}
          <AnalyticsChart data={stats.scoreHistory} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
        <h3 className="text-lg font-bold mb-4">Log New Practice</h3>
        <ScoreInputForm />
      </div>
    </div>
  );
};

export default StudentDashboard;