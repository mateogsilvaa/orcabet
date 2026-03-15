import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('orcabet_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/user/profile');
      setUser(res.data);
    } catch {
      localStorage.removeItem('orcabet_token');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchProfile]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('orcabet_token', res.data.token);
    setToken(res.data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, username, password) => {
    const res = await api.post('/auth/register', { email, username, password });
    localStorage.setItem('orcabet_token', res.data.token);
    setToken(res.data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('orcabet_token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const refreshBalance = async () => {
    try {
      const res = await api.get('/user/balance');
      setUser(prev => prev ? { ...prev, balance: res.data.balance } : null);
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
