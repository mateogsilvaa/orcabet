import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getOrCreateUserProfile, getUserBalance } from '@/services/firebaseService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getOrCreateUserProfile(firebaseUser);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = auth.currentUser;
    const profile = firebaseUser ? await getOrCreateUserProfile(firebaseUser) : null;
    setUser(profile);
    return profile;
  };

  const register = async (email, username, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = auth.currentUser;
    const profile = firebaseUser ? await getOrCreateUserProfile(firebaseUser, { username }) : null;
    setUser(profile);
    return { user: profile };
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshBalance = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const balance = await getUserBalance(firebaseUser.uid);
      setUser(prev => prev ? { ...prev, balance } : null);
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
