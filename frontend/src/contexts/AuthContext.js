import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import api from '@/services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const res = await api.get('/user/profile');
          setUser(res.data);
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
    const res = await api.get('/user/profile');
    setUser(res.data);
    return res.data;
  };

  const register = async (email, username, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
    const res = await api.post('/auth/register', { username });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshBalance = async () => {
    try {
      const res = await api.get('/user/balance');
      setUser(prev => prev ? { ...prev, balance: res.data.balance } : null);
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
