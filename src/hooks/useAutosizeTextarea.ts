import { useEffect, useRef } from 'react';

interface UseAutosizeTextareaOptions {
  value: string;
  isEnabled?: boolean;
}

export function useAutosizeTextarea({ value, isEnabled = true }: UseAutosizeTextareaOptions) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
  }, [value, isEnabled]);

  return ref;
}

