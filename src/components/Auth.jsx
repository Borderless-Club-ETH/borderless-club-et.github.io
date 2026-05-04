import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="p-8 bg-white shadow-xl rounded-2xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">
          {isLogin ? 'Welcome Back' : 'Join Borderless'}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" placeholder="Email" 
            className="w-full p-3 border rounded-lg"
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full p-3 border rounded-lg"
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 text-sm text-blue-500 hover:underline w-full text-center"
        >
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default Auth;