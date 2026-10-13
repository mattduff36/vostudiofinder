'use client';

import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '@/hooks/useOverlay';
import { overlayHost } from '@/lib/ui/overlay-manager';
import { zIndex } from '@/lib/theme';

interface ManagedOverlayProps {
  children: ReactNode;
  title: string;
  onClose?: (() => void) | undefined;
  className?: string;
  style?: CSSProperties;
  level?: 'navigation' | 'dialog' | 'confirmation';
  bodyClass?: string;
  documentClass?: string;
  preventBackdropClose?: boolean;
  fallbackFocusRef?: RefObject<HTMLElement | null> | undefined;
}
/** Mount only while visibly open. AnimatePresence consumers keep this mounted
 * until their exit animation completes, retaining focus and scroll ownership. */
export function ManagedOverlay({ children, title, onClose, className = '', style, level = 'dialog', bodyClass, documentClass, preventBackdropClose = false, fallbackFocusRef }: ManagedOverlayProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { id, mounted } = useOverlay({ open: true, elementRef, onClose, level, bodyClass, documentClass, fallbackFocusRef });
  if (!mounted) return null;
  return createPortal(<div ref={elementRef} id={id} data-overlay-root role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
    className={`fixed inset-0 ${className}`} style={{ zIndex: level === 'confirmation' ? zIndex.confirmation : level === 'navigation' ? zIndex.navigationOverlay : zIndex.modal, ...style }}
    onClick={event => { if (!preventBackdropClose && event.target === event.currentTarget) onClose?.(); }}>
    {children}
  </div>, overlayHost());
}
