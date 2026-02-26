'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { EditProfileModal } from './EditProfileModal';
import { UserEditProfileFloatingButton } from './UserEditProfileFloatingButton';
import { AdminMessageUserModal } from './AdminMessageUserModal';

interface UserEditProfileButtonProps {
  username: string;
}

export function UserEditProfileButton({ username }: UserEditProfileButtonProps) {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if current user is the owner of this profile
  const isOwner = session?.user?.username?.toLowerCase() === username.toLowerCase();
  
  // Check if user is admin
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN';

  // Show button ONLY for admins (not for owners)
  const showButton = isAdmin;

  // Determine edit mode
  const editMode = isOwner ? 'owner' : 'admin';

  // Handle hash-based opening (from redirect or mobile menu)
  useEffect(() => {
    if (!showButton || !mounted) return;

    const checkHash = () => {
      if (window.location.hash === '#edit-profile' || window.location.hash === '#edit') {
        setIsModalOpen(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    checkHash();

    window.addEventListener('hashchange', checkHash);

    return () => {
      window.removeEventListener('hashchange', checkHash);
    };
  }, [showButton, mounted]);

  if (!mounted || !showButton || !session?.user?.id) {
    return null;
  }

  return (
    <>
      <UserEditProfileFloatingButton
        onClick={() => setIsModalOpen(true)}
        onMessageClick={() => setIsMessageModalOpen(true)}
      />
      
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={session.user.id}
        mode={editMode}
        targetUsername={username}
      />

      <AdminMessageUserModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        username={username}
      />
    </>
  );
}
