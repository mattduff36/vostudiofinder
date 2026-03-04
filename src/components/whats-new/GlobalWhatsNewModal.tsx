'use client';

import { useState, useEffect, useCallback } from 'react';
import { WhatsNewModal } from './WhatsNewModal';
import { useHasNewPlatformUpdates } from '@/hooks/useHasNewPlatformUpdates';

/**
 * Global What's New modal that can be triggered from anywhere via custom event.
 * Marks updates as seen when the modal opens so the notification dot clears.
 */
export function GlobalWhatsNewModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { markSeen } = useHasNewPlatformUpdates();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = useCallback(() => {
    setIsModalOpen(true);
    markSeen();
  }, [markSeen]);

  useEffect(() => {
    if (!mounted) return;

    window.addEventListener('openWhatsNewModal', handleOpen);

    return () => {
      window.removeEventListener('openWhatsNewModal', handleOpen);
    };
  }, [mounted, handleOpen]);

  if (!mounted) return null;

  return (
    <WhatsNewModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
  );
}
