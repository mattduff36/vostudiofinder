'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Toast Provider Component
 * 
 * Wraps react-hot-toast's Toaster with our custom configuration
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{
        top: 80, // Below navbar (navbar is 64px + 16px spacing)
      }}
      toastOptions={{
        // Default options for all toasts
        duration: 3000,
        style: {
          borderRadius: '8px',
          background: '#fff',
          color: '#1f2937',
          padding: '12px 16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '500px',
        },
        // Limit to 3 visible toasts
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#f0fdf4',
          },
        },
        error: {
          duration: 3000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
        },
        loading: {
          duration: Infinity,
        },
      }}
    />
  );
}

