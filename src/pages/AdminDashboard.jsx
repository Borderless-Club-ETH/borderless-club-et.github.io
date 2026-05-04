import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

const AdminDashboard = () => {
  const [votedQuestions, setVotedQuestions] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [featuredAssignmentId, setFeaturedAssignmentId] = useState('');
  const [currentFeaturedAssignment, setCurrentFeaturedAssignment] = useState('None');

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch questions that need human explanations
      const q = query(collection(db, "questions"), where("totalAttempts", ">", 0));
      const snap = await getDocs(q);
      const filtered = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(q => (q.votesInClass || 0) > 0 || (q.votesVideo || 0) > 0)
        .sort((a, b) => ((b.votesInClass || 0) + (b.votesVideo || 0)) - ((a.votesInClass || 0) + (a.votesVideo || 0)));
      
      setVotedQuestions(filtered);

      // 2. Fetch current coordinators
      const uQ = query(collection(db, "users"), where("canPostQuestions", "==", true));
      const uSnap = await getDocs(uQ);
      setCoordinators(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // New: Fetch featured assignment ID
      const settingsRef = doc(db, "settings", "adminSettings");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setCurrentFeaturedAssignment(data.featuredAssignmentId || 'None');
        setFeaturedAssignmentId(data.featuredAssignmentId || ''); // Pre-fill input
      }
    };

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const checkAuth = async () => {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          const data = docSnap.exists() ? docSnap.data() : null;
          if ((data && data.canPostQuestions) || currentUser.email === "bamlakb.woldeyohannes@gmail.com") {
            setIsAdmin(true);
            await fetchData();
          }
          setLoading(false);
        };
        checkAuth();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleResetVotes = async (questionId) => {
    try {
      await updateDoc(doc(db, "questions", questionId), {
        votesInClass: 0,
        votesVideo: 0
      });
      setVotedQuestions(prev => prev.filter(q => q.id !== questionId));
      alert("Votes cleared for this question.");
    } catch (err) {
      alert("Action failed. Check permissions.");
    }
  };

  const handleRevokeAccess = async (uid, email) => {
    if (email === "bamlakb.woldeyohannes@gmail.com") return alert("You cannot revoke your own access.");
    if (!window.confirm(`Revoke Coordinator access for ${email}?`)) return;
    
    try {
      await updateDoc(doc(db, "users", uid), { canPostQuestions: false });
      setCoordinators(prev => prev.filter(c => c.id !== uid));
      alert("Access revoked.");
      window.location.reload();
    } catch (err) {
      alert("Failed to revoke access.");
    }
  };

  const handleAuthorizeEmail = async (e) => {
    e.preventDefault();
    const emailToSearch = newAdminEmail.toLowerCase().trim();
    if (!emailToSearch) return;
    
    if (coordinators.some(c => c.email.toLowerCase() === emailToSearch)) {
      alert("This scholar is already authorized.");
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", emailToSearch));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("No user found with that email. They must sign up for the website first!");
      } else {
        const userDocId = snap.docs[0].id;
        await updateDoc(doc(db, "users", userDocId), {
          canPostQuestions: true,
          email: emailToSearch // Ensure email is present
        });
        alert(`Successfully authorized ${emailToSearch} as a Coordinator.`);
        window.location.reload();
      }
      setNewAdminEmail('');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFeaturedAssignment = async (e) => {
    e.preventDefault();
    if (!featuredAssignmentId.trim()) {
      alert("Please enter a valid assignment ID.");
      return;
    }

    setLoading(true);
    try {
      const settingsRef = doc(db, "settings", "adminSettings");
      await setDoc(settingsRef, { featuredAssignmentId: featuredAssignmentId.trim() }, { merge: true });
      setCurrentFeaturedAssignment(featuredAssignmentId.trim());
      alert(`Featured assignment set to: ${featuredAssignmentId.trim()}.`);
    } catch (err) {
      alert("Error setting featured assignment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black">Loading Coordinator Panel...</div>;

  if (!isAdmin) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-black text-slate-900">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view this hub.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-10">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Coordinator Hub</h1>
        <p className="text-slate-500 font-medium">Manage explanations and club permissions.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Voting Results */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800">Pending Requests</h2>
          {votedQuestions.length === 0 ? (
            <div className="p-10 bg-slate-50 rounded-[32px] text-center text-slate-400 font-bold">No students have requested human help yet!</div>
          ) : (
            votedQuestions.map(q => (
              <div key={q.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
                <div className="flex gap-4 mb-4">
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-center min-w-[80px]">
                    <p className="text-[10px] font-black uppercase">In Class</p>
                    <p className="text-xl font-black">{q.votesInClass || 0}</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-center min-w-[80px]">
                    <p className="text-[10px] font-black uppercase">Video</p>
                    <p className="text-xl font-black">{q.votesVideo || 0}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.subtopic}</span>
                    <p className="text-xs text-slate-400 mt-1">ID: {q.id.slice(0,8)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 italic">\"{q.text}\"</p>
                <button 
                  onClick={() => handleResetVotes(q.id)}
                  className="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                >
                  Dismiss & Clear Votes
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: Authorization Management */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 bg-white rounded-full p-0.5 shadow-md" />
              <h2 className="text-xl font-black tracking-tight">Authorize Google Account</h2>
            </div>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Authorize a Gmail address to grant Coordinator access. The scholar must have signed up for the club first.
            </p>
            <form onSubmit={handleAuthorizeEmail} className="space-y-4">
              <input 
                type="email" 
                placeholder="scholar@gmail.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500"
              />
              <button className="w-full py-4 bg-emerald-500 text-slate-900 font-black rounded-2xl hover:bg-emerald-400 transition transform active:scale-95">
                Authorize Gmail
              </button>
            </form>
          </div>

          {/* New: Featured Assignment Management */}
          <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-black tracking-tight">Set Featured Assignment</h2>
            </div>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Define a custom ID for the main assignment displayed on the Challenge page. Current: <strong>{currentFeaturedAssignment}</strong>
            </p>
            <form onSubmit={handleSetFeaturedAssignment} className="space-y-4">
              <input 
                type="text" 
                placeholder="e.g. 'Week1Quiz', 'FinalReview'"
                value={featuredAssignmentId}
                onChange={(e) => setFeaturedAssignmentId(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500"
              />
              <button type="submit" className="w-full py-4 bg-blue-500 text-slate-900 font-black rounded-2xl hover:bg-blue-400 transition transform active:scale-95">
                Set Featured Assignment
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-100 p-10 rounded-[48px] shadow-sm">
            <h3 className="font-black text-slate-900 mb-6 text-xs uppercase tracking-widest opacity-40">Authorized Club Staff</h3>
            <div className="space-y-4">
              {coordinators.map(c => (
                <div key={c.id} className="flex flex-col group p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {c.photoURL ? <img src={c.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">{c.email.charAt(0)}</div>}
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 tracking-tight">{c.displayName || "Borderless Scholar"}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{c.email}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRevokeAccess(c.id, c.email)} className="opacity-0 group-hover:opacity-100 p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm">
            <h3 className="font-black text-slate-900 mb-2 text-sm">Quick Action</h3>
            <p className="text-xs text-slate-500 mb-4">View global test completion stats.</p>
            <button className="text-xs font-bold text-blue-600 hover:underline">Download CSV Report →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;