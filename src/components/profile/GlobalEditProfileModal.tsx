'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { EditProfileModal } from './EditProfileModal';

/**
 * Global edit profile modal that can be triggered from anywhere via custom event
 * Listens for 'openEditProfileModal' custom event
 */
export function GlobalEditProfileModal() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !session?.user?.id) return;

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    window.addEventListener('openEditProfileModal', handleOpenModal);

    return () => {
      window.removeEventListener('openEditProfileModal', handleOpenModal);
    };
  }, [mounted, session?.user?.id]);

  // Don't render if not logged in or not mounted
  if (!mounted || !session?.user?.id) {
    return null;
  }

  return (
    <EditProfileModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      userId={session.user.id}
      mode="owner"
    />
  );
}
