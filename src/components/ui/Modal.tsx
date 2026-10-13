'use client';

import { ManagedOverlay } from '@/components/ui/ManagedOverlay';

interface ModalProps {
  isOpen: boolean;
  onClose?: (() => void) | undefined;
  children: React.ReactNode;
  preventBackdropClose?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '4xl';
  title?: string;
  level?: 'dialog' | 'confirmation';
}
export function Modal({ isOpen, onClose, children, preventBackdropClose = false, maxWidth = 'md', title = 'Dialog', level = 'dialog' }: ModalProps) {
  if (!isOpen) return null;
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl', '4xl': 'sm:max-w-4xl' };
  return <ManagedOverlay title={title} onClose={onClose} preventBackdropClose={preventBackdropClose} level={level}
    className="flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ width: '100vw', height: '100dvh', margin: 0, padding: 0 }}>
    <div className={`relative w-full h-full sm:h-auto sm:rounded-lg sm:shadow-xl ${widths[maxWidth]} bg-white/90 backdrop-blur-sm overflow-y-auto sm:max-h-[90vh]`}>
      {children}
    </div>
  </ManagedOverlay>;
}
