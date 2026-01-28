'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { EditProfileModal } from './EditProfileModal';
import { UserEditProfileFloatingButton } from './UserEditProfileFloatingButton';

interface UserEditProfileButtonProps {
  username: string;
}

export function UserEditProfileButton({ username }: UserEditProfileButtonProps) {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if current user is the owner of this profile
  const isOwner = session?.user?.username?.toLowerCase() === username.toLowerCase();
  
  // Check if user is admin
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN';

  // Show button for owners or admins
  const showButton = isOwner || isAdmin;

  // Determine edit mode
  const editMode = isOwner ? 'owner' : 'admin';

  // Handle hash-based opening (from redirect or mobile menu)
  useEffect(() => {
    if (!showButton || !mounted) return;

    const checkHash = () => {
      // Support both #edit-profile (owner) and #edit (admin legacy)
      if (window.location.hash === '#edit-profile' || window.location.hash === '#edit') {
        setIsModalOpen(true);
        // Clear hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    // Check on mount
    checkHash();

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);

    return () => {
      window.removeEventListener('hashchange', checkHash);
    };
  }, [showButton, mounted]);

  // Don't render anything if not owner/admin or not mounted
  if (!mounted || !showButton || !session?.user?.id) {
    return null;
  }

  return (
    <>
      {/* Show floating button for all users who can edit (both owners and admins) */}
      <UserEditProfileFloatingButton onClick={() => setIsModalOpen(true)} />
      
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={session.user.id}
        mode={editMode}
        targetUsername={username}
      />
    </>
  );
}
