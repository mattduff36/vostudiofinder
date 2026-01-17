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

    // Reset height to get accurate scrollHeight, then match content.
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value, isEnabled]);

  return ref;
}

