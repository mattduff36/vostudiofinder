'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { registerOverlay } from '@/lib/ui/overlay-manager';

export interface UseOverlayOptions {
  open: boolean;
  elementRef: RefObject<HTMLElement | null>;
  onClose?: (() => void) | undefined;
  level?: 'navigation' | 'dialog' | 'confirmation';
  bodyClass?: string | undefined;
  documentClass?: string | undefined;
  fallbackFocusRef?: RefObject<HTMLElement | null> | undefined;
}
export function useOverlay({ open, elementRef, onClose, level = 'dialog', bodyClass, documentClass, fallbackFocusRef }: UseOverlayOptions) {
  const id = useId();
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const element = elementRef.current;
    if (!mounted || !open || !element) return;
    return registerOverlay({ id, element, level, bodyClass, documentClass,
      onEscape: () => closeRef.current?.(), fallbackFocus: () => fallbackFocusRef?.current ?? null });
  }, [id, mounted, open, elementRef, level, bodyClass, documentClass, fallbackFocusRef]);
  return { id, mounted };
}
