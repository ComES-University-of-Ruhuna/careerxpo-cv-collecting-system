'use client';

import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HiHome, HiOfficeBuilding, HiUser } from 'react-icons/hi';

const studentLinks = [
  { href: '/student', label: 'Dashboard', icon: <HiHome /> },
  { href: '/student/companies', label: 'Companies & Bid', icon: <HiOfficeBuilding /> },
  { href: '/student/profile', label: 'My Profile', icon: <HiUser /> },
];

function StudentGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user || user.role !== 'student') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={studentLinks} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

export default function StudentLayout({ children }) {
  return (
    <AuthProvider>
      <StudentGuard>{children}</StudentGuard>
    </AuthProvider>
  );
}
