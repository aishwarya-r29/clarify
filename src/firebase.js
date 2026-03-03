import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDDp2IUqg7onM_Z-PBrkX14h92TyUONsk",
  authDomain: "clarify2026.firebaseapp.com",
  projectId: "clarify2026",
  storageBucket: "clarify2026.firebasestorage.app",
  messagingSenderId: "346410878345",
  appId: "1:346410878345:web:24c9c6f9b72837494fcd58"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
