'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HiUserGroup, HiBriefcase, HiCurrencyDollar, HiShieldCheck, HiDocumentText, HiAcademicCap } from 'react-icons/hi';
import { useAuth } from '@/components/AuthProvider';
import logo from '@/assets/logo-light.png';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex flex-col">
      {/* Navbar */}
      <nav className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image src={logo} alt="CareerXpo 3.0" height={40} className="h-10 w-auto" priority />
          </Link>
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

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="text-center max-w-3xl">
          <Image src={logo} alt="CareerXpo 3.0" width={280} className="mx-auto mb-8 w-56 md:w-72" priority />
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Career Fair CV Collection &amp; Bidding System
          </h1>
          <p className="text-base md:text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Faculty of Engineering, University of Ruhuna. Sign in with Google, upload your CV, and bid on your dream companies with credits.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {loading ? null : user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/student'} className="px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition text-lg">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <a href="/api/auth/google" className="px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition text-base md:text-lg shadow-lg">
                  Sign in with Google
                </a>
                <Link href="/login" className="px-8 py-3 border-2 border-white/40 text-white rounded-lg font-semibold hover:bg-white/10 transition text-base md:text-lg">
                  Admin Login
                </Link>
              </>
            )}
            <Link href="/guest" className="px-8 py-3 bg-white/10 backdrop-blur border-2 border-white text-white rounded-lg font-semibold hover:bg-white/20 transition text-base md:text-lg">
              Post a Job Vacancy
            </Link>
          </div>
        </div>
      </main>

      {/* About & Features Section */}
      <section className="bg-white/10 backdrop-blur-sm py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">About CareerXpo 3.0</h2>
          <p className="text-primary-100 text-center max-w-3xl mx-auto mb-10 text-sm md:text-base">
            CareerXpo 3.0 is the official career fair platform developed by the Computer Engineering Society (ComES)
            for the Faculty of Engineering, University of Ruhuna. It enables students to connect with
            participating companies during the career fair by submitting their CVs and expressing interest in job positions
            through a credit-based bidding system.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiUserGroup className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">Google Sign-In</h3>
              <p className="text-sm text-primary-200">Sign in securely with your university Google account. We use your email and name to create your student profile.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiDocumentText className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">CV Upload</h3>
              <p className="text-sm text-primary-200">Upload your CV in PDF format. CVs are securely stored on Google Drive and shared only with companies you bid on.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiBriefcase className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">Browse Companies</h3>
              <p className="text-sm text-primary-200">Explore participating companies, their open positions, and job descriptions filtered by your department.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiCurrencyDollar className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">Credit Bidding</h3>
              <p className="text-sm text-primary-200">Strategically spend your allocated credits to bid on positions. Each bid submits your CV to the respective company.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiShieldCheck className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">Data Privacy</h3>
              <p className="text-sm text-primary-200">Your data is only shared with companies you choose to bid on. We do not sell or share your data with third parties.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/15 transition">
              <HiAcademicCap className="text-3xl text-white mb-3" />
              <h3 className="font-semibold text-white mb-1">University Exclusive</h3>
              <p className="text-sm text-primary-200">Available only to students of the Faculty of Engineering, University of Ruhuna with a valid university Google account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Use Your Data Section */}
      <section className="bg-primary-900/60 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-white mb-4">How We Use Your Data</h2>
          <p className="text-primary-200 text-sm mb-4">
            When you sign in with Google, CareerXpo accesses your <strong className="text-white">email address</strong> and <strong className="text-white">profile name</strong> to create your account.
            Your uploaded CV is stored on Google Drive and is shared <strong className="text-white">only with companies you explicitly bid on</strong>.
            We use your email to send bid confirmation notifications. We do not access any other Google account data.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/privacy" className="text-sm text-white underline hover:text-primary-200">Privacy Policy</Link>
            <span className="text-primary-400">·</span>
            <Link href="/terms" className="text-sm text-white underline hover:text-primary-200">Terms of Service</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900/50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center mb-6">
            <Image src={logo} alt="CareerXpo 3.0" height={32} className="h-8 w-auto opacity-80" />
          </div>
          <div className="text-center text-sm text-primary-200 space-y-1">
            <p>Organized by <span className="font-semibold text-white">IEEE Student Branch, University of Ruhuna</span></p>
            <p className="text-xs text-primary-300">In collaboration with EIES, CEES, ComES, MMESS &amp; SSMENA</p>
            <p className="text-xs">Platform powered by <span className="font-semibold text-primary-100">Computer Engineering Society (ComES)</span></p>
            <p className="text-xs mt-3 pt-3 border-t border-primary-700/50">
              <Link href="/privacy" className="text-primary-200 hover:text-white hover:underline">Privacy Policy</Link>
              {' · '}
              <Link href="/terms" className="text-primary-200 hover:text-white hover:underline">Terms of Service</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
