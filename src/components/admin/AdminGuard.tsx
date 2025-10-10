'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Role } from '@/types/prisma';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Client-side admin route protection component
 * Redirects non-admin users to unauthorized page
 */
export default function AdminGuard({ 
  children, 
  fallback = null, 
  redirectTo = '/unauthorized' 
}: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      // Not authenticated, redirect to sign in
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== Role.ADMIN) {
      // Not an admin, redirect to unauthorized
      router.push(redirectTo);
      return;
    }
  }, [session, status, router, redirectTo]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback if not authenticated or not admin
  if (!session || session.user.role !== Role.ADMIN) {
    return <>{fallback}</>;
  }

  // User is authenticated and is an admin
  return <>{children}</>;
}

/**
 * Admin or Studio Owner guard component
 */
export function AdminOrStudioOwnerGuard({ 
  children, 
  fallback = null, 
  redirectTo = '/unauthorized' 
}: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      // Not authenticated, redirect to sign in
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.STUDIO_OWNER) {
      // Not an admin or studio owner, redirect to unauthorized
      router.push(redirectTo);
      return;
    }
  }, [session, status, router, redirectTo]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback if not authenticated or not admin/studio owner
  if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.STUDIO_OWNER)) {
    return <>{fallback}</>;
  }

  // User is authenticated and has required role
  return <>{children}</>;
}
