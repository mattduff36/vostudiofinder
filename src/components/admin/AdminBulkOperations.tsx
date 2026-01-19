'use client';

import { useState } from 'react';

interface AdminBulkOperationsProps {
  selectedStudios: string[];
  onBulkAction: (action: string, studioIds: string[]) => Promise<void>;
  onClearSelection: () => void;
}

export default function AdminBulkOperations({ selectedStudios, onBulkAction, onClearSelection }: AdminBulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  const handleBulkAction = async () => {
    if (!bulkAction || selectedStudios.length === 0) return;

    setIsProcessing(true);
    try {
      await onBulkAction(bulkAction, selectedStudios);
      setBulkAction('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedStudios.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:space-x-4 flex-1">
          <span className="text-sm font-medium text-blue-900">
            {selectedStudios.length} studio{selectedStudios.length !== 1 ? 's' : ''} selected
          </span>
          
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="text-sm border border-blue-300 rounded px-3 py-2 bg-white w-full md:w-auto"
            disabled={isProcessing}
          >
            <option value="">Choose bulk action...</option>
            <option value="activate">Activate Studios</option>
            <option value="deactivate">Deactivate Studios</option>
            <option value="export">Export Data</option>
            <option value="delete">Delete Studios</option>
          </select>

          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Apply'
            )}
          </button>
        </div>

        <button
          onClick={onClearSelection}
          className="text-sm text-blue-600 hover:text-blue-800 text-center md:text-left"
          disabled={isProcessing}
        >
          Clear Selection
        </button>
      </div>

      {bulkAction === 'delete' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            ⚠️ <strong>Warning:</strong> This action will permanently delete {selectedStudios.length} studio{selectedStudios.length !== 1 ? 's' : ''} and cannot be undone.
          </p>
        </div>
      )}
    </div>
  );
}
