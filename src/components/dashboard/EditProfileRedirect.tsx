'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that opens the Edit Profile Modal and redirects to dashboard
 * Used when /dashboard/edit-profile is accessed on desktop
 */
export function EditProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Dispatch event to open the modal
    // Note: openProfileSection in sessionStorage will be consumed by ProfileEditForm
    window.dispatchEvent(new CustomEvent('openEditProfileModal'));
    
    // Redirect to dashboard after a brief delay to ensure modal opens
    const redirectTimer = setTimeout(() => {
      router.replace('/dashboard');
    }, 100);

    return () => {
      clearTimeout(redirectTimer);
      // Don't clear the sessionStorage here - let ProfileEditForm consume it
    };
  }, [router]);

  // Show a brief loading state while redirecting
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700">Opening profile editor...</span>
        </div>
      </div>
    </div>
  );
}
