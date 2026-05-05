import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { isAuthorizedCoordinator } from '../../utils/adminAuth.js';

const Navbar = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setIsAdmin(isAuthorizedCoordinator(user, docSnap.data()));
          } else if (user.email) {
            const emailQuery = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              setIsAdmin(isAuthorizedCoordinator(user, emailSnap.docs[0].data()));
            } else {
              setIsAdmin(false);
            }
          } else {
            setIsAdmin(false);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  return (
    <nav className="bg-slate-900/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4 sticky top-0 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="w-full flex flex-wrap gap-4 justify-between items-center">
        <Link to="/challenge" className="text-lg sm:text-xl font-bold text-white transition-transform hover:scale-105 active:scale-95">
          <span className="inline-flex items-center gap-3 tracking-tighter">
            <img src="/images/borderless-logo.png" alt="Borderless logo" className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-md" />
            <span>BORDERLESS <span className="opacity-70 font-light text-blue-200">SATPREP</span></span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <Link to="/challenge" className="bg-gradient-to-br from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform active:scale-95">
            🚀 Start Challenge
          </Link>
          <Link to="/leaderboard" className="text-white/80 hover:text-white font-bold text-sm transition">Leaderboard</Link>
          {isAdmin && (
            <>
              <Link to="/create-question" className="text-white/80 hover:text-white font-bold text-sm transition">Post Question</Link>
              <Link to="/admin" className="text-emerald-400 hover:text-emerald-300 font-black text-sm transition">Admin</Link>
            </>
          )}
          <Link to="/profile" className="text-white/80 hover:text-white font-bold text-sm transition">Profile</Link>
          <button onClick={handleLogout} className="ml-4 text-xs font-black text-rose-300 hover:text-rose-100 uppercase tracking-widest border border-rose-300/30 px-3 py-1 rounded-lg transition">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;