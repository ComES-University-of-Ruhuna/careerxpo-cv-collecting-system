'use client';

import Link from 'next/link';
import { HiAcademicCap, HiUserGroup, HiBriefcase, HiCurrencyDollar } from 'react-icons/hi';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex flex-col">
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <HiAcademicCap className="text-3xl" />
            <span className="font-bold text-2xl">CareerXpo 3.0</span>
          </div>
          <div className="flex gap-3">
            {loading ? null : user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/student'} className="px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                Go to Dashboard
              </Link>
            ) : (
              <a href="/api/auth/google" className="px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                Sign in with Google
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Career Fair CV Collection & Bidding System
          </h1>
          <p className="text-lg md:text-xl text-primary-100 mb-8">
            Faculty of Engineering, University of Ruhuna. Sign in with Google, upload your CV, and bid on your dream companies with credits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {loading ? null : user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/student'} className="px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition text-lg">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <a href="/api/auth/google" className="px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition text-lg">
                  Sign in with Google
                </a>
                <Link href="/login" className="px-8 py-3 border-2 border-white/50 text-white/80 rounded-lg font-semibold hover:bg-white/10 transition text-lg">
                  Admin Login
                </Link>
              </>
            )}
            <Link href="/guest" className="px-8 py-3 bg-white/10 backdrop-blur border-2 border-white text-white rounded-lg font-semibold hover:bg-white/20 transition text-lg">
              Post a Job Vacancy
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-primary-200">
          <div className="flex items-center gap-3">
            <HiUserGroup className="text-2xl" />
            <div>
              <p className="font-semibold text-white">Sign In</p>
              <p className="text-sm">Use your Google account to get started</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HiBriefcase className="text-2xl" />
            <div>
              <p className="font-semibold text-white">Browse Companies</p>
              <p className="text-sm">Explore job openings and company profiles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HiCurrencyDollar className="text-2xl" />
            <div>
              <p className="font-semibold text-white">Bid with Credits</p>
              <p className="text-sm">Strategically allocate credits to apply</p>
            </div>
          </div>
        </div>
      </footer>
      <div className="bg-primary-900/50 py-6 text-center text-sm text-primary-200 space-y-1">
        <p>Organized by <span className="font-semibold text-white">IEEE Student Branch, University of Ruhuna</span></p>
        <p className="text-xs text-primary-300">In collaboration with EIES, CEES, ComES, MMESS &amp; SSMENA</p>
        <p className="text-xs">Platform powered by <span className="font-semibold text-primary-100">Computer Engineering Society (ComES)</span></p>
      </div>
    </div>
  );
}
