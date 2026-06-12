'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Registration is now handled via Google OAuth
    router.replace('/login');
  }, [router]);

  return null;
}
