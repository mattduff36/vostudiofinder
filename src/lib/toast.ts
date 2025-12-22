/**
 * Toast Notification Utility
 * 
 * Centralized toast notification system using react-hot-toast
 * with custom styling matching the site's design system.
 */

import toast, { Toast as HotToast } from 'react-hot-toast';

// Custom styling matching site's red theme
const baseStyle = {
  borderRadius: '8px',
  background: '#fff',
  color: '#1f2937',
  padding: '12px 16px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid #e5e7eb',
  fontSize: '14px',
  fontWeight: '500',
  maxWidth: '500px',
};

const iconStyle = {
  marginRight: '8px',
};

/**
 * Show a success toast notification
 */
export const showSuccess = (message: string, duration = 3000) => {
  return toast.success(message, {
    duration,
    style: {
      ...baseStyle,
      border: '1px solid #10b981',
      background: '#f0fdf4',
      color: '#065f46',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#f0fdf4',
    },
  });
};

/**
 * Show an error toast notification
 * Critical errors stay longer (6 seconds by default)
 */
export const showError = (message: string, isCritical = false) => {
  const duration = isCritical ? 6000 : 3000;
  
  return toast.error(message, {
    duration,
    style: {
      ...baseStyle,
      border: '1px solid #ef4444',
      background: '#fef2f2',
      color: '#991b1b',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fef2f2',
    },
  });
};

/**
 * Show a warning toast notification
 */
export const showWarning = (message: string, duration = 3000) => {
  return toast(message, {
    duration,
    icon: '⚠️',
    style: {
      ...baseStyle,
      border: '1px solid #f59e0b',
      background: '#fffbeb',
      color: '#92400e',
    },
  });
};

/**
 * Show an info toast notification
 */
export const showInfo = (message: string, duration = 3000) => {
  return toast(message, {
    duration,
    icon: 'ℹ️',
    style: {
      ...baseStyle,
      border: '1px solid #3b82f6',
      background: '#eff6ff',
      color: '#1e40af',
    },
  });
};

/**
 * Show a loading toast notification
 * Returns the toast ID so it can be dismissed later
 */
export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: baseStyle,
  });
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

/**
 * Show a promise-based toast
 * Automatically shows loading, success, or error based on promise result
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: baseStyle,
      success: {
        duration: 3000,
        style: {
          ...baseStyle,
          border: '1px solid #10b981',
          background: '#f0fdf4',
          color: '#065f46',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#f0fdf4',
        },
      },
      error: {
        duration: 3000,
        style: {
          ...baseStyle,
          border: '1px solid #ef4444',
          background: '#fef2f2',
          color: '#991b1b',
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#fef2f2',
        },
      },
    }
  );
};

/**
 * Custom toast with full control over styling
 */
export const showCustom = (
  message: string,
  options?: {
    duration?: number;
    icon?: string;
    style?: React.CSSProperties;
  }
) => {
  return toast(message, {
    duration: options?.duration || 3000,
    icon: options?.icon,
    style: {
      ...baseStyle,
      ...options?.style,
    },
  });
};

// Re-export toast for direct access if needed
export { toast };

