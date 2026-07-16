import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { apiFetch } from './api';
import { GOOGLE_CLIENT_IDS } from './constants';
import { clearToken, loadToken, saveToken } from './storage';

// Required for expo-auth-session redirect flow — must run at module scope.
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    scopes: ['openid', 'profile', 'email'],
    // We only need the ID token for backend verification.
    responseType: 'id_token',
  });

  const fetchMe = useCallback(async (t) => {
    try {
      const data = await apiFetch('/api/auth/me', { token: t });
      setUser(data?.user || null);
      return data?.user || null;
    } catch (err) {
      // Token was rejected — clear it so the app returns to the login screen.
      if (err?.status === 401 || err?.status === 403) {
        await clearToken();
        setToken(null);
        setUser(null);
      }
      return null;
    }
  }, []);

  // Bootstrap: load any stored token on cold start and hydrate the user.
  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (stored) {
        setToken(stored);
        await fetchMe(stored);
      }
      setLoading(false);
    })();
  }, [fetchMe]);

  // Handle the Google auth response — exchange the ID token for our JWT.
  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      if (response.type === 'error') {
        console.warn('Google sign-in error', response.error);
      }
      setSigningIn(false);
      return;
    }

    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      setSigningIn(false);
      return;
    }

    (async () => {
      try {
        const data = await apiFetch('/api/auth/mobile/google', {
          method: 'POST',
          body: { id_token: idToken },
        });
        if (data?.token) {
          await saveToken(data.token);
          setToken(data.token);
          setUser(data.user || null);
          // Refetch to ensure we have the latest profile shape.
          await fetchMe(data.token);
        }
      } catch (err) {
        console.error('Failed to complete Google sign-in', err);
        throw err;
      } finally {
        setSigningIn(false);
      }
    })();
  }, [response, fetchMe]);

  const signInWithGoogle = useCallback(async () => {
    if (!request) return { success: false, error: 'Google Sign-In not ready yet.' };
    setSigningIn(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') {
        setSigningIn(false);
        return { success: false, error: result?.type === 'cancel' ? 'Sign-in was cancelled.' : 'Sign-in did not complete.' };
      }
      return { success: true };
    } catch (err) {
      setSigningIn(false);
      return { success: false, error: err?.message || 'Sign-in failed.' };
    }
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return null;
    return fetchMe(token);
  }, [token, fetchMe]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = {
    token,
    user,
    loading,
    signingIn,
    canSignIn: !!request,
    signInWithGoogle,
    signOut,
    refresh,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
