import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA6mN8aSdPR2y7gxvyc3pePY400LdCzt40",
  authDomain: "gen-lang-client-0268052290.firebaseapp.com",
  projectId: "gen-lang-client-0268052290",
  storageBucket: "gen-lang-client-0268052290.firebasestorage.app",
  messagingSenderId: "445445483531",
  appId: "1:445445483531:web:122cd94abb982a970eab0e",
  firestoreDatabaseId: "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
