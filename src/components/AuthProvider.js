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

    // NOTE: We intentionally do NOT accept a raw ?token= URL parameter here.
    // Doing so would allow a session-fixation attack: an attacker could craft
    // a link containing their own JWT and trick a victim into loading it,
    // silently binding the victim's browser to the attacker's account.
    // Real sessions arrive via the OAuth `?code=` handshake above or via the
    // httpOnly cookie set by the callback / login endpoints.

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
    // Primary path: the OAuth callback set an httpOnly cookie before redirecting,
    // so cookie auth always works. Exchange is best-effort to also get a token
    // for localStorage (used by Bearer-auth API calls).
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
        await fetchUser(data.token, true);
        return;
      }
    } catch {}

    // Fallback: use cookie auth via /api/auth/me
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
        setToken('cookie');
        toast.success(`Welcome, ${data.user.full_name || data.user.email || 'Student'}!`);
        setLoading(false);
        setOauthLoading(false);
        return;
      }
    } catch {}

    // Both failed — sign-in didn't complete. Send back to login.
    setOauthLoading(false);
    setLoading(false);
    toast.error('Sign-in failed. Please try again.');
    router.replace('/login');
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
        clearAuth();
      }
    } catch {
      clearAuth();
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

  function clearAuth() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('careerxpo_token');
  }

  async function logout() {
    clearAuth();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
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
