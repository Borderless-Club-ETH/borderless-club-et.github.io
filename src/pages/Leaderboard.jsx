import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [activePath, setActivePath] = useState('mastery'); // mastery, grind, consistency

  useEffect(() => {
    const fetchLeaders = async () => {
      let sortField = "averageAccuracy";
      if (activePath === 'grind') sortField = "totalCorrect";
      if (activePath === 'consistency') sortField = "streakCount";

      const q = query(
        collection(db, "users"), 
        where(sortField, ">", 0),
        orderBy(sortField, "desc"), 
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeaders(data);
    };

    fetchLeaders();
  }, [activePath]);

  const getDivision = (rank) => {
    if (rank <= 5) return { name: "Elite Scholar", color: "text-amber-500", bg: "bg-amber-50" };
    if (rank <= 20) return { name: "Pro Voyager", color: "text-blue-500", bg: "bg-blue-50" };
    return { name: "Initiate Coder", color: "text-slate-400", bg: "bg-slate-50" };
  };

  return (
    <div className="p-4 sm:p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter text-center">Hall of Scholars</h1>
      <p className="text-center text-slate-500 font-medium mb-12 uppercase text-xs tracking-widest">Global SAT Mastery Rankings</p>
      
      {/* Path Selector */}
      <div className="flex justify-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
        {[
          { id: 'mastery', label: '🎯 Mastery', desc: 'Accuracy' },
          { id: 'grind', label: '🧗 Grind', desc: 'Total Correct' },
          { id: 'consistency', label: '🔥 Streak', desc: 'Daily Action' }
        ].map(path => (
          <button
            key={path.id}
            onClick={() => setActivePath(path.id)}
            className={`px-6 py-3 rounded-xl transition-all flex flex-col items-center ${activePath === path.id ? 'bg-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <span className="text-xs font-black uppercase tracking-tight">{path.label}</span>
            <span className="text-[10px] font-medium opacity-60">{path.desc}</span>
          </button>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-2xl rounded-[24px] sm:rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-70">Rank</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-70">Scholar</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest opacity-70 text-right">
                {activePath === 'mastery' ? 'Accuracy' : activePath === 'grind' ? 'Total Correct' : 'Streak'}
              </th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((user, index) => {
              const division = getDivision(index + 1);
              return (
              <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/10 transition-colors group">
                <td className="p-6">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-white" />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 uppercase">{user.email?.charAt(0)}</div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 tracking-tight">{user.displayName || "Borderless Scholar"}</span>
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${division.color}`}>{division.name}</span>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {activePath === 'mastery' ? `${user.averageAccuracy || 0}%` : activePath === 'grind' ? user.totalCorrect || 0 : `${user.streakCount || 0} days`}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;