import React, { useState } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const ScoreInputForm = () => {
  const [baseScore, setBaseScore] = useState('');
  const [userTime, setUserTime] = useState('');
  const [peerTime, setPeerTime] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    // Simple calculation for Projected Score (can be adjusted)
    const projected = Math.round(parseInt(baseScore) * 1.05);

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        latestBaseScore: parseInt(baseScore),
        latestProjectedScore: projected,
        userTime: parseInt(userTime),
        peerTime: parseInt(peerTime),
        lastUpdated: new Date(),
        // THIS SAVES THE HISTORY FOR THE CHART
        scoreHistory: arrayUnion({
          score: parseInt(baseScore),
          date: new Date().toLocaleDateString(),
          timestamp: Date.now()
        })
      }, { merge: true });

      alert("Cloud sync successful!");
      setBaseScore('');
      setUserTime('');
      setPeerTime('');
    } catch (err) {
      console.error("Error saving score:", err);
      alert("Failed to save. Check Firestore rules.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Base Score</label>
        <input 
          type="number" value={baseScore} onChange={(e) => setBaseScore(e.target.value)}
          className="w-full p-2 border rounded-lg" placeholder="e.g. 1100" required 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Your Time</label>
          <input 
            type="number" value={userTime} onChange={(e) => setUserTime(e.target.value)}
            className="w-full p-2 border rounded-lg" placeholder="min" required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Peer Time</label>
          <input 
            type="number" value={peerTime} onChange={(e) => setPeerTime(e.target.value)}
            className="w-full p-2 border rounded-lg" placeholder="min" required 
          />
        </div>
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">
        Update My Stats
      </button>
    </form>
  );
};

export default ScoreInputForm;