import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) { setCustomer(null); setLoading(false); return null; }
    try {
      const data = await authApi.me();
      setCustomer(data.customer);
      setAddresses(data.addresses || []);
      setStats(data.stats || null);
      return data.customer;
    } catch {
      setToken(null);
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setToken(data.token);
    setCustomer(data.customer);
    await refresh();
    return data.customer;
  }, [refresh]);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setToken(data.token);
    setCustomer(data.customer);
    await refresh();
    return data.customer;
  }, [refresh]);

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
    setAddresses([]);
    setStats(null);
  }, []);

  const value = useMemo(
    () => ({ customer, addresses, stats, loading, login, register, logout, refresh, setAddresses }),
    [customer, addresses, stats, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
