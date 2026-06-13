'use client';

import { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

function AuthProviderInner({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for auth code in URL (from OAuth callback redirect)
    const authCode = searchParams.get('code');
    if (authCode) {
      // Exchange short-lived code for token
      setOauthLoading(true);
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
      // Try cookie-based auth (no localStorage token but httpOnly cookie may exist)
      tryExistingCookie();
    }
  }, [searchParams]);

  async function tryExistingCookie() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken('cookie');
        setLoading(false);
        return;
      }
    } catch {}
    setLoading(false);
  }

  async function exchangeCode(code) {
    try {
      const res = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('careerxpo_token', data.token);
        setToken(data.token);
        fetchUser(data.token, true);
        return;
      }
    } catch {}
    // Fallback: the OAuth callback already set an httpOnly cookie,
    // so try fetching the user via cookie auth
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
        // We don't have the raw token, but cookie auth works for API calls
        setToken('cookie');
        setLoading(false);
        setOauthLoading(false);
        toast.success(`Welcome, ${data.user.full_name || data.user.email || 'Student'}!`);
        return;
      }
    } catch {}
    setOauthLoading(false);
    setLoading(false);
  }

  async function fetchUser(t, isNewLogin = false) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: t && t !== 'cookie' ? { Authorization: `Bearer ${t}` } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (isNewLogin) {
          toast.success(`Welcome, ${data.user.full_name || data.user.email || 'Student'}!`);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
      setOauthLoading(false);
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
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  function updateUser(updates) {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {oauthLoading && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary-600 to-primary-900 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mb-4" />
          <p className="text-white text-lg font-medium">Signing you in...</p>
          <p className="text-primary-200 text-sm mt-1">Please wait</p>
        </div>
      )}
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
