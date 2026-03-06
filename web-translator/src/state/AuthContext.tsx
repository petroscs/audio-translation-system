import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { clearTokens, getRefreshToken, loadTokensFromStorage, setTokens } from '../api/tokens';

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = {
  state: AuthState;
  login: (usernameOrEmail: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, isLoading: true });

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const res = await authApi.login(usernameOrEmail, password);
    if (!res.ok) {
      clearTokens();
      setState({ isAuthenticated: false, isLoading: false });
      return { ok: false, error: res.error ?? 'Login failed' };
    }
    setTokens(res.data);
    setState({ isAuthenticated: true, isLoading: false });
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      await authApi.logout(refresh).catch(() => {});
    }
    clearTokens();
    setState({ isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    loadTokensFromStorage();
    const token = localStorage.getItem('accessToken');
    setState({ isAuthenticated: Boolean(token), isLoading: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout }),
    [state, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

