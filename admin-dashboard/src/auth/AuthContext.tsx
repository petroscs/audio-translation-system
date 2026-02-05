import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setTokens, clearTokens, getAccessToken, getRefreshToken, onRefreshComplete } from '../api/client';
import * as authApi from '../api/auth';

type AuthState = { isAuthenticated: boolean; isLoading: boolean };

const AuthContext = createContext<{
  state: AuthState;
  login: (usernameOrEmail: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, isLoading: true });

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const res = await authApi.login(usernameOrEmail, password);
    if (!res.ok) {
      return { ok: false, error: res.error ?? 'Login failed' };
    }
    if (res.data) {
      setTokens(
        res.data.accessToken,
        res.data.refreshToken,
        new Date(res.data.expiresAt).getTime()
      );
      setState({ isAuthenticated: true, isLoading: false });
      return { ok: true };
    }
    return { ok: false, error: 'No token received' };
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
    const token = getAccessToken();
    if (token) {
      setState((s) => ({ ...s, isAuthenticated: true }));
    }
    setState((s) => ({ ...s, isLoading: false }));

    const unsub = onRefreshComplete((success) => {
      setState((s) => ({ ...s, isAuthenticated: success }));
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
