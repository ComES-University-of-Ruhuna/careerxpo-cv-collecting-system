'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';
import { HiLogout, HiShieldCheck } from 'react-icons/hi';
import logo from '@/assets/logo-light.png';

export default function Navbar() {
  const { user, logout } = useAuth();

  const isSubAdmin =
    user?.role === 'student' && Array.isArray(user?.admin_permissions) && user.admin_permissions.length > 0;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src={logo} alt="CareerXpo 3.0" height={28} className="h-7 w-auto" priority />
            <span className="text-xs text-gray-500 hidden lg:inline">Faculty of Engineering, University of Ruhuna</span>
          </Link>

          {user && (
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {isSubAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-xs sm:text-sm text-primary-700 bg-primary-50 border border-primary-200 px-2 py-1 rounded-md hover:bg-primary-100 transition shrink-0"
                  title="Open admin panel"
                >
                  <HiShieldCheck />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Link>
              )}
              <div className="flex items-center gap-2 min-w-0">
                {user.avatar && (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                )}
                <span className="text-sm text-gray-600 truncate hidden sm:inline">
                  {user.full_name || user.email || user.registration_no}
                </span>
                {user.role === 'student' && (
                  <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                    {user.remaining_credits} credits
                  </span>
                )}
                {user.role === 'admin' && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full shrink-0">Admin</span>
                )}
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 transition flex items-center gap-1 text-sm shrink-0"
                aria-label="Logout"
              >
                <HiLogout />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
