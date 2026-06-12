'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiAcademicCap } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import Footer from '@/components/Footer';

function LoginErrorHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'oauth_denied') toast.error('Google sign-in was cancelled');
    else if (error === 'oauth_failed') toast.error('Google sign-in failed. Please try again.');
    else if (error === 'no_email') toast.error('Could not get email from Google account');
  }, [searchParams]);

  return null;
}

export default function LoginPage() {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Suspense fallback={null}><LoginErrorHandler /></Suspense>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-primary-600">
              <HiAcademicCap className="text-3xl" />
              <span className="font-bold text-2xl text-gray-900">CareerXpo 3.0</span>
            </Link>
            <p className="text-gray-500 mt-2">Faculty of Engineering, University of Ruhuna</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome</h2>
              <p className="text-sm text-gray-500">Sign in with your Google account to continue</p>
            </div>

            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition font-medium text-gray-700"
            >
              <FcGoogle className="text-xl" />
              Sign in with Google
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">OR</span>
              </div>
            </div>

            <Link
              href="/login/admin"
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Admin Login →
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Use your university Gmail account for student access.
            After signing in, complete your profile with your registration number.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
