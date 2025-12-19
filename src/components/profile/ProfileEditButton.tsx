'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import EditStudioModal from '@/components/admin/EditStudioModal';

interface Studio {
  id: string;
  name: string;
  description?: string;
  studio_type: string;
  studioTypes?: Array<{ studio_type: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  address?: string;
  website_url?: string;
  phone?: string;
  users: {
    display_name: string;
    email: string;
    username?: string;
  };
  created_at: string;
  updated_at: string;
}

interface ProfileEditButtonProps {
  username: string;
}

export function ProfileEditButton({ username }: ProfileEditButtonProps) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleEditClick = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch the studio data for this username
      const response = await fetch(`/api/admin/studios/by-username/${username}`);
      if (!response.ok) throw new Error('Failed to fetch studio');
      
      const data = await response.json();
      setStudio(data.studio);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching studio:', error);
      alert('Failed to load studio data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const handleSave = () => {
    // Refresh the page to show updated data
    window.location.reload();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setStudio(null);
  };

  // Create a custom event to trigger the edit
  useEffect(() => {
    const handleEditEvent = () => {
      handleEditClick();
    };

    // Listen for hash changes (when clicking "Edit Profile" from mobile menu)
    const handleHashChange = () => {
      if (window.location.hash === '#edit') {
        // Small delay to ensure component is ready
        setTimeout(() => {
          handleEditClick();
          // Clear the hash after opening modal
          window.history.replaceState(null, '', window.location.pathname);
        }, 100);
      }
    };

    // Check if page loaded with #edit hash (with small delay)
    const checkInitialHash = () => {
      if (window.location.hash === '#edit') {
        setTimeout(() => {
          handleEditClick();
          window.history.replaceState(null, '', window.location.pathname);
        }, 100);
      }
    };

    // Check immediately and after a short delay to catch any timing issues
    checkInitialHash();
    const hashCheckTimeout = setTimeout(checkInitialHash, 500);

    window.addEventListener('profileEditClick', handleEditEvent);
    window.addEventListener('hashchange', handleHashChange);
    
    // Dispatch event to notify navbar that edit handler is available
    window.dispatchEvent(new CustomEvent('profileEditHandlerReady', { detail: { username } }));

    return () => {
      clearTimeout(hashCheckTimeout);
      window.removeEventListener('profileEditClick', handleEditEvent);
      window.removeEventListener('hashchange', handleHashChange);
      window.dispatchEvent(new Event('profileEditHandlerUnmount'));
    };
  }, [username, handleEditClick]);

  if (!mounted) return null;

  return (
    <>
      {isLoading && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8">
            <div className="flex items-center">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3">Loading studio data...</span>
            </div>
          </div>
        </div>,
        document.body
      )}
      <EditStudioModal
        studio={studio}
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={handleSave}
      />
    </>
  );
}

