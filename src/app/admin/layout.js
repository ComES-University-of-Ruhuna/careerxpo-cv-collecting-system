'use client';

import { useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HiHome, HiOfficeBuilding, HiBriefcase, HiChartBar, HiUserGroup, HiClipboardList, HiInbox } from 'react-icons/hi';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: <HiHome /> },
  { href: '/admin/companies', label: 'Companies', icon: <HiOfficeBuilding /> },
  { href: '/admin/jobs', label: 'Job Vacancies', icon: <HiBriefcase /> },
  { href: '/admin/guest-posts', label: 'Guest Posts', icon: <HiInbox /> },
  { href: '/admin/students', label: 'Students', icon: <HiUserGroup /> },
  { href: '/admin/logs', label: 'Activity Logs', icon: <HiClipboardList /> },
];

function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
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

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={adminLinks} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>{children}</AdminGuard>
  );
}
