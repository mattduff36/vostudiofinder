'use client';

import { create } from 'zustand';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type UnsavedChangesResult = 'cancel' | 'discard' | 'save';

interface UnsavedChangesDialogItem {
  id: string;
  resolve: (value: UnsavedChangesResult) => void;
}

interface UnsavedChangesDialogStore {
  current: UnsavedChangesDialogItem | null;
  show: (item: UnsavedChangesDialogItem) => void;
  resolve: (value: UnsavedChangesResult) => void;
}

const useUnsavedChangesDialogStore = create<UnsavedChangesDialogStore>((set, get) => ({
  current: null,

  show: (item) => {
    const state = get();
    // If a dialog is already open, resolve it as cancel first
    if (state.current) {
      state.current.resolve('cancel');
    }
    set({ current: item });
  },

  resolve: (value) => {
    const state = get();
    if (state.current) {
      state.current.resolve(value);
      set({ current: null });
    }
  },
}));

/**
 * Show an unsaved changes dialog with 3 options: Cancel, Discard, Save.
 * @returns Promise that resolves to 'cancel', 'discard', or 'save'
 */
export const showUnsavedChangesDialog = (): Promise<UnsavedChangesResult> => {
  return new Promise((resolve) => {
    const item: UnsavedChangesDialogItem = {
      id: `unsaved-${Date.now()}-${Math.random()}`,
      resolve,
    };
    useUnsavedChangesDialogStore.getState().show(item);
  });
};

/**
 * UnsavedChangesDialog Component
 * Must be included in app layout
 */
export function UnsavedChangesDialog() {
  const { current, resolve } = useUnsavedChangesDialogStore();

  const handleCancel = () => resolve('cancel');
  const handleDiscard = () => resolve('discard');
  const handleSave = () => resolve('save');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const isOpen = !!current;

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
              onClick={handleCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Unsaved Changes
                  </h3>
                  <p className="text-sm text-gray-600">
                    You have unsaved changes. Would you like to save before closing?
                  </p>
                </div>
              </div>

              {/* Actions - 3 buttons */}
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#d42027] hover:bg-[#b01a20] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
