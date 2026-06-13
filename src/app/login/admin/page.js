'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiAcademicCap, HiShieldCheck } from 'react-icons/hi';
import { useAuth } from '@/components/AuthProvider';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/student');
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_no: username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      if (data.user.role !== 'admin') {
        toast.error('This login is for administrators only. Students should use Google sign-in.');
        return;
      }

      localStorage.setItem('careerxpo_token', data.token);
      toast.success('Admin login successful!');
      router.push('/admin');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-600">
            <HiAcademicCap className="text-3xl" />
            <span className="font-bold text-2xl text-gray-900">CareerXpo 3.0</span>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-2">
            <HiShieldCheck className="text-red-500" />
            <p className="text-gray-500">Admin Login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin username"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Admin Sign In'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-primary-600 font-medium hover:underline">← Back to Student Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
