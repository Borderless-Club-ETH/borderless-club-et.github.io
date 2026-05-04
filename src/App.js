import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import CreateSATSet from './pages/CreateSATSet';
import 'katex/dist/katex.min.css';

// Layout
import Navbar from './components/Layout/Navbar';

// Pages
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import CreateQuestion from './pages/CreateQuestion'; // New
import QuestionChallenge from './pages/QuestionChallenge'; // New
import ReviewSession from './pages/ReviewSession';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUser(userDoc.exists() ? { ...currentUser, ...userDoc.data() } : currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
    <Router>
      <div 
        className="min-h-screen bg-fixed bg-cover bg-center transition-all duration-700 selection:bg-purple-200 selection:text-purple-900"
        style={{ backgroundImage: "url('/images/Gemini_Generated_Image_usnbkhusnbkhusnb.png')", fontFamily: "'Arial', sans-serif" }}
      >
        {/* Main Content Wrapper */}
        <div className="min-h-screen bg-white/70 backdrop-blur-md transition-colors duration-500">
          {user && <Navbar />}
          <div className="w-full pb-12">
            <Routes>
              <Route path="/" element={!user ? <Login /> : (user.identityConfirmed !== false ? <Navigate to="/challenge" /> : <Navigate to="/profile" />)} />
              <Route path="/create" element={<CreateSATSet />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<Navigate to="/challenge" />} />
              <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/create-question" element={user ? <CreateQuestion /> : <Navigate to="/" />} />
              <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/" />} />
              <Route path="/challenge" element={user ? (user.identityConfirmed !== false ? <QuestionChallenge /> : <Navigate to="/profile" />) : <Navigate to="/" />} />
              <Route path="/review/:resultId" element={user ? <ReviewSession /> : <Navigate to="/" />} />
              
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;