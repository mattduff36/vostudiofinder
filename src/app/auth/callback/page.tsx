'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session?.user?.email === 'admin@mpdee.co.uk') {
      // Admin user should go to /admin
      router.push('/admin');
    } else if (session) {
      // Other authenticated users go to /dashboard
      router.push('/dashboard');
    } else {
      // Not authenticated, go to sign in
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}
