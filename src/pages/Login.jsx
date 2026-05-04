import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ADJECTIVES = ["Swift", "Astral", "Bold", "Quantum", "Elite", "Stellar", "Radiant", "Cyber", "Vivid", "Atomic"];
const SUBJECTS = ["Scholar", "Voyager", "Coder", "Zenith", "Pioneer", "Mind", "Architect", "Ace", "Legend", "Oracle"];

const generateHandle = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const sub = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  return `${adj}${sub}`;
};

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCred;
      if (isRegistering) {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize user document with searchable email
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: email.toLowerCase().trim(),
          canPostQuestions: false,
          latestBaseScore: 0
        });
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
        // Ensure email exists for older accounts
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        if (!userDoc.exists() || !userDoc.data().email) {
          await setDoc(doc(db, "users", userCred.user.uid), {
            email: userCred.user.email.toLowerCase()
          }, { merge: true });
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const userCred = await signInWithPopup(auth, provider);
      // Ensure Google users have a searchable document in Firestore
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: userCred.user.email.toLowerCase(),
          displayName: userCred.user.displayName || generateHandle(),
          photoURL: userCred.user.photoURL,
          canPostQuestions: false,
          identityConfirmed: false,
          // Hybrid Scoring Fields
          totalCorrect: 0,
          totalAttempted: 0,
          averageAccuracy: 0,
          streakCount: 0,
          lastActivityDate: null
        });
      } else {
        // Update existing docs with Google info if missing
        await setDoc(doc(db, "users", userCred.user.uid), {
          displayName: userCred.user.displayName,
          photoURL: userCred.user.photoURL
        }, { merge: true });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white w-full max-w-md transition-all">
        <div className="text-center mb-8">
          <img src="/images/borderless-logo.png" alt="Borderless logo" className="w-20 h-20 mx-auto mb-6 rounded-3xl object-cover shadow-2xl rotate-3" />
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">BORDERLESS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">CLUB</span></h1>
          <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">
            {isRegistering ? 'Create your club account' : 'Welcome back, Scholar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full p-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full p-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl active:scale-[0.98]">
            {isRegistering ? 'Join the Club' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-400 uppercase">OR</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="mt-6 w-full bg-white border-2 border-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-3"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5" 
          />
          Continue with Google
        </button>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 font-medium text-sm hover:underline"
          >
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;