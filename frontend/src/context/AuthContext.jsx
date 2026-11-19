import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, patch, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await get('/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    setUnauthorizedHandler(() => setUser(null));
  }, [refresh]);

  const value = useMemo(() => ({
    user,
    loading,
    refresh,
    setUser,
    async login(email, password) {
      const data = await post('/auth/login', { email, password });
      setUser(data.user);
      return data.user;
    },
    async register(fields) {
      const data = await post('/auth/register', fields);
      setUser(data.user);
      return data.user;
    },
    async logout() {
      try { await post('/auth/logout'); } catch { /* ignore */ }
      setUser(null);
    },
    async updateProfile(fields) {
      const data = await patch('/me', fields);
      setUser(data.user);
      return data.user;
    },
  }), [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
