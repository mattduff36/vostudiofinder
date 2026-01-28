'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that opens the Edit Profile Modal and returns to previous page
 * Used when /dashboard/edit-profile is accessed on desktop
 */
export function EditProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Dispatch event to open the modal
    // Note: openProfileSection in sessionStorage will be consumed by ProfileEditForm
    window.dispatchEvent(new CustomEvent('openEditProfileModal'));
    
    // Return to previous page (the page user was on before clicking edit profile)
    // This keeps the user on their original page with modal as overlay
    router.back();
  }, [router]);

  // Show a brief loading state while processing
  // This component will unmount quickly as we navigate back
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
