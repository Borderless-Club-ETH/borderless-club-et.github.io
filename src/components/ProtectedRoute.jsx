import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { isAuthorizedCoordinator } from '../utils/adminAuth.js';

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        let userDoc = await getDoc(userRef);
        let userData = userDoc.exists() ? userDoc.data() : null;

        if (!userData && currentUser.email) {
          const emailQuery = query(collection(db, 'users'), where('email', '==', currentUser.email.toLowerCase()));
          const emailSnap = await getDocs(emailQuery);
          if (!emailSnap.empty) {
            userData = emailSnap.docs[0].data();
          }
        }

        const hasAccess = isAuthorizedCoordinator(currentUser, userData);

        setStatus(hasAccess ? 'authorized' : 'forbidden');
      } catch (error) {
        console.error('ProtectedRoute error:', error);
        setStatus('forbidden');
      }
    };

    loadUser();
  }, []);

  if (status === 'loading') {
    return <div className="h-screen flex items-center justify-center text-slate-700">Verifying access...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />;
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-500">You need coordinator access to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
