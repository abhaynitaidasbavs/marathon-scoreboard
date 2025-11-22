import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Replace with your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAiN1H1VBhxZlUZwLOMDewgU3uJ2Xfd5ZY",
  authDomain: "marathon-scoreboard.firebaseapp.com",
  projectId: "marathon-scoreboard",
  storageBucket: "marathon-scoreboard.firebasestorage.app",
  messagingSenderId: "262815758528",
  appId: "1:262815758528:web:2989a673a54c7272bc9525"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Auth functions
export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore functions for teams
export const getTeams = (callback) => {
  const q = query(collection(db, 'teams'));
  return onSnapshot(q, (snapshot) => {
    const teams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(teams);
  });
};

export const addTeam = async (teamData) => {
  return await addDoc(collection(db, 'teams'), {
    ...teamData,
    lastUpdated: new Date().toISOString()
  });
};

export const updateTeam = async (teamId, teamData) => {
  const teamRef = doc(db, 'teams', teamId);
  return await updateDoc(teamRef, {
    ...teamData,
    lastUpdated: new Date().toISOString()
  });
};

export const deleteTeam = async (teamId) => {
  const teamRef = doc(db, 'teams', teamId);
  return await deleteDoc(teamRef);
};

// Firestore functions for leaders
export const getLeaders = async () => {
  const snapshot = await getDocs(collection(db, 'leaders'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLeader = async (leaderName) => {
  return await addDoc(collection(db, 'leaders'), {
    name: leaderName,
    createdAt: new Date().toISOString()
  });
};

export const deleteLeader = async (leaderId) => {
  const leaderRef = doc(db, 'leaders', leaderId);
  return await deleteDoc(leaderRef);
};