'use client';

import { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const AuthContext = createContext(null);

function AuthProviderInner({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for auth code in URL (from OAuth callback redirect)
    const authCode = searchParams.get('code');
    if (authCode) {
      // Exchange short-lived code for token
      exchangeCode(authCode);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Legacy: support token param for backward compatibility
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('careerxpo_token', urlToken);
      setToken(urlToken);
      fetchUser(urlToken);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const stored = localStorage.getItem('careerxpo_token');
    if (stored) {
      setToken(stored);
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  async function exchangeCode(code) {
    try {
      const res = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('careerxpo_token', data.token);
        setToken(data.token);
        fetchUser(data.token);
        return;
      }
    } catch {}
    // Fallback: the OAuth callback already set an httpOnly cookie,
    // so try fetching the user via cookie auth
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
        // We don't have the raw token, but cookie auth works for API calls
        setToken('cookie');
        setLoading(false);
        return;
      }
    } catch {}
    setLoading(false);
  }

  async function fetchUser(t) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  function login(userData, tokenValue) {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem('careerxpo_token', tokenValue);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('careerxpo_token');
    fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function updateUser(updates) {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  return (
    <Suspense fallback={null}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Suspense>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
