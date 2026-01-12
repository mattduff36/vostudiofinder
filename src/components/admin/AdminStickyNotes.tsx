'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { showSuccess, showError } from '@/lib/toast';
import { Loader2, X, StickyNote } from 'lucide-react';

interface AdminStickyNotesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminStickyNotes({ isOpen, onClose }: AdminStickyNotesProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch note when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchNote();
    }
  }, [isOpen]);

  const fetchNote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sticky-notes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sticky note');
      }

      const data = await response.json();
      setContent(data.content || '');
      setOriginalContent(data.content || '');
    } catch (error) {
      console.error('Error fetching sticky note:', error);
      showError('Failed to load sticky note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/sticky-notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save sticky note');
      }

      const data = await response.json();
      setOriginalContent(data.content);
      showSuccess('Sticky note saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving sticky note:', error);
      showError(error instanceof Error ? error.message : 'Failed to save sticky note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset to original content on close
    setContent(originalContent);
    onClose();
  };

  const hasChanges = content !== originalContent;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Admin Sticky Notes</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          Shared note for all admins. Use this to track small snippets of information needed for the immediate future.
        </p>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Textarea */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your notes here..."
              rows={12}
              className="font-mono text-sm"
              disabled={isSaving}
            />

            {/* Character count */}
            <div className="mt-2 text-xs text-gray-500 text-right">
              {content.length.toLocaleString()} / 10,000 characters
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isSaving}
              >
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
