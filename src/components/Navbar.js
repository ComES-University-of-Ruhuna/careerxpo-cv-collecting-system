'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { HiAcademicCap, HiLogout } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <HiAcademicCap className="text-primary-600 text-2xl" />
            <span className="font-bold text-xl text-gray-900">CareerXpo 3.0</span>
            <span className="text-xs text-gray-500 hidden sm:inline">Faculty of Engineering, University of Ruhuna</span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.avatar && (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                )}
                <span className="text-sm text-gray-600">
                  {user.full_name || user.email || user.registration_no}
                  {user.role === 'student' && (
                    <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                      {user.remaining_credits} credits
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 transition flex items-center gap-1 text-sm"
              >
                <HiLogout />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
