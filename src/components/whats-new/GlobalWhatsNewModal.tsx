'use client';

import { useState, useEffect } from 'react';
import { WhatsNewModal } from './WhatsNewModal';

/**
 * Global What's New modal that can be triggered from anywhere via custom event
 * Listens for 'openWhatsNewModal' custom event
 */
export function GlobalWhatsNewModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    window.addEventListener('openWhatsNewModal', handleOpenModal);

    return () => {
      window.removeEventListener('openWhatsNewModal', handleOpenModal);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <WhatsNewModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
  );
}
