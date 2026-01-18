'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface LoadingContextValue {
  isPageLoading: boolean;
  isInitialLoad: boolean;
}

const LoadingContext = createContext<LoadingContextValue>({
  isPageLoading: false,
  isInitialLoad: true,
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pathname = usePathname();

  // Track route changes
  useEffect(() => {
    // Mark as loading when route changes
    setIsPageLoading(true);

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsPageLoading(false);
      setIsInitialLoad(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Mark initial load as complete after hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LoadingContext.Provider value={{ isPageLoading, isInitialLoad }}>
      {children}
    </LoadingContext.Provider>
  );
}
