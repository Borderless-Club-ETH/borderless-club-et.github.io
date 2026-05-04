import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADJECTIVES = ["Swift", "Astral", "Bold", "Quantum", "Elite", "Stellar", "Radiant", "Cyber", "Vivid", "Atomic"];
const SUBJECTS = ["Scholar", "Voyager", "Coder", "Zenith", "Pioneer", "Mind", "Architect", "Ace", "Legend", "Oracle"];

const generateHandle = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const sub = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  return `${adj}${sub}`;
};

const Profile = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    targetScore: '1600'
  });
  const [loading, setLoading] = useState(true);
  const [identityConfirmed, setIdentityConfirmed] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            displayName: data.displayName || '',
            targetScore: data.targetScore || '1600'
          });
          setIdentityConfirmed(data.identityConfirmed !== false);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    try {
      await setDoc(doc(db, "users", user.uid), { ...formData, identityConfirmed: true }, { merge: true });
      setIdentityConfirmed(true);
      alert("Profile updated! Your name will now show on the Leaderboard.");
    } catch (err) {
      alert("Error updating profile.");
    }
  };

  const handleSpin = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setFormData(prev => ({ ...prev, displayName: generateHandle() }));
      setIsSpinning(false);
    }, 400);
  };

  if (loading) return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white/80 backdrop-blur-2xl p-6 sm:p-12 rounded-[32px] sm:rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {identityConfirmed ? 'Scholar Profile' : 'Choose Your Identity'}
          </h1>
          <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">
            {identityConfirmed ? 'Update your club credentials' : 'Pick a gaming handle for the leaderboard'}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Full Name</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className={`flex-1 p-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none font-bold ${isSpinning ? 'animate-pulse' : ''}`}
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                placeholder="e.g. Bamlak Woldeyohannes"
                required
              />
              <button 
                type="button"
                onClick={handleSpin}
                className="px-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors text-xl shadow-sm"
                title="Spin for a new name"
              >
                🎰
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl active:scale-[0.98]">
            {identityConfirmed ? 'Update Identity' : 'Confirm Identity'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;