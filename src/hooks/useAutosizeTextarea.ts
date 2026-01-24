import { useEffect, useRef, useCallback } from 'react';

interface UseAutosizeTextareaOptions {
  value: string;
  isEnabled?: boolean;
}

export function useAutosizeTextarea({ value, isEnabled = true }: UseAutosizeTextareaOptions) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    if (!isEnabled) return;
    if (!ref.current) return;

    // Store current scroll position
    const scrollPos = ref.current.scrollTop;
    
    // Reset height to get accurate scrollHeight, then match content.
    ref.current.style.height = 'auto';
    const newHeight = ref.current.scrollHeight;
    ref.current.style.height = `${newHeight}px`;
    
    // Restore scroll position
    ref.current.scrollTop = scrollPos;
  }, [isEnabled]);

  // Run resize whenever value changes
  useEffect(() => {
    resize();
  }, [value, resize]);

  // Also resize when ref is first attached or component mounts
  useEffect(() => {
    if (!ref.current) return;
    
    // Use requestAnimationFrame to ensure DOM has fully updated
    const rafId = requestAnimationFrame(() => {
      resize();
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [resize]);

  return ref;
}

