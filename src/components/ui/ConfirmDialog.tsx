'use client';

import { create } from 'zustand';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDangerous: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const useConfirmDialogStore = create<ConfirmDialogState & {
  open: (options: ConfirmDialogOptions, onConfirm: () => void | Promise<void>) => void;
  close: () => void;
}>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDangerous: false,
  onConfirm: () => {},
  onCancel: () => {},
  
  open: (options, onConfirm) => {
    set({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      isDangerous: options.isDangerous || false,
      onConfirm,
      onCancel: () => set({ isOpen: false }),
    });
  },
  
  close: () => set({ isOpen: false }),
}));

/**
 * Show a confirmation dialog
 * @returns Promise that resolves to true if confirmed, false if canceled
 */
export const showConfirm = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    useConfirmDialogStore.getState().open(options, () => {
      resolve(true);
      useConfirmDialogStore.getState().close();
    });
    
    // Override onCancel to resolve with false
    useConfirmDialogStore.setState({
      onCancel: () => {
        resolve(false);
        useConfirmDialogStore.getState().close();
      },
    });
  });
};

/**
 * ConfirmDialog Component
 * Must be included in app layout
 */
export function ConfirmDialog() {
  const { isOpen, title, message, confirmText, cancelText, isDangerous, onConfirm, onCancel } = useConfirmDialogStore();
  
  const handleConfirm = async () => {
    await onConfirm();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-lg shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Content */}
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-start gap-4 mb-4">
                {isDangerous && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {message}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    isDangerous
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-[#d42027] hover:bg-[#b01a20] focus:ring-red-500'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
