import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCP107n9uSjrJej5ApK5ZWZxTQuF_w2tyc",
  authDomain: "login-database-b748d.firebaseapp.com",
  projectId: "login-database-b748d",
  storageBucket: "login-database-b748d.firebasestorage.app",
  messagingSenderId: "14956216855",
  appId: "1:14956216855:web:7dd386e40347c08cefd252",
  measurementId: "G-ZF4VM52JZ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };