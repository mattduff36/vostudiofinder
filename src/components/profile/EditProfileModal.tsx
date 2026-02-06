'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProfileEditForm, ProfileEditFormHandle } from '@/components/dashboard/ProfileEditForm';
import { showError } from '@/lib/toast';
import { showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void; // Optional callback after successful save
  userId?: string;
  mode?: 'owner' | 'admin';
  targetUsername?: string;
  studioId?: string | undefined;
}

export function EditProfileModal({ isOpen, onClose, onSaveSuccess, userId, mode = 'owner', targetUsername, studioId }: EditProfileModalProps) {
  const profileFormRef = useRef<ProfileEditFormHandle>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [adminStudioId, setAdminStudioId] = useState<string | undefined>(studioId);
  const [loadingStudioId, setLoadingStudioId] = useState(false);
  const { data: session } = useSession();

  const isAdminMode = mode === 'admin';
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy' || session?.user?.role === 'ADMIN';

  // Reset state when modal closes so it's clean on next open
  useEffect(() => {
    if (!isOpen) {
      setAdminStudioId(studioId);
      setLoadingStudioId(false);
      setIsClosing(false);
    }
  }, [isOpen, studioId]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('admin-modal-open');
    } else {
      document.body.classList.remove('admin-modal-open');
    }

    return () => {
      document.body.classList.remove('admin-modal-open');
    };
  }, [isOpen]);

  // Fetch studioId by username if in admin mode and studioId not provided
  useEffect(() => {
    if (isOpen && isAdminMode && targetUsername && !adminStudioId) {
      fetchStudioIdByUsername();
    }
  }, [isOpen, isAdminMode, targetUsername, adminStudioId]);

  const fetchStudioIdByUsername = async () => {
    if (!targetUsername) return;
    
    setLoadingStudioId(true);
    try {
      const response = await fetch(`/api/admin/studios/by-username/${targetUsername}`);
      if (!response.ok) throw new Error('Failed to fetch studio');
      
      const data = await response.json();
      setAdminStudioId(data.studio.id);
    } catch (error) {
      console.error('Error fetching studio:', error);
      showError('Failed to load studio data. Please try again.');
      onClose();
    } finally {
      setLoadingStudioId(false);
    }
  };

  const handleCloseAttempt = async () => {
    if (isClosing) return;
    
    // Check if there are unsaved changes
    const hasChanges = profileFormRef.current?.hasUnsavedChanges?.() ?? false;
    
    if (!hasChanges) {
      // No unsaved changes, close immediately
      onClose();
      return;
    }
    
    // Show 3-button dialog: Cancel / Discard / Save
    const result = await showUnsavedChangesDialog();
    
    if (result === 'cancel') {
      // User chose to stay in the modal
      return;
    }
    
    if (result === 'discard') {
      // User chose to discard changes and close
      onClose();
      return;
    }
    
    if (result === 'save') {
      // User chose to save then close
      setIsClosing(true);
      
      try {
        const saveSuccess = await profileFormRef.current?.saveIfDirty();
        
        if (saveSuccess === false) {
          // Save failed, stay in modal
          setIsClosing(false);
          return;
        }
        
        // Save succeeded, close modal
        // (isClosing is reset by the useEffect when isOpen becomes false)
        onClose();
      } catch (error) {
        console.error('Error saving during modal close:', error);
        showError('Failed to save changes. Please try again.');
      } finally {
        // Always reset isClosing to prevent stuck spinner state.
        // If onClose() succeeded, the useEffect(!isOpen) reset also fires,
        // but this ensures cleanup even if onClose throws or is delayed.
        setIsClosing(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseAttempt();
    }
  };

  const handleSaveSuccess = () => {
    // Called after successful save from ProfileEditForm
    // Trigger the parent's onSaveSuccess callback if provided (for admin studios page refresh)
    if (onSaveSuccess) {
      onSaveSuccess();
    }
    // We don't auto-close, just let the user continue editing
  };

  if (!isOpen) return null;

  // Show loading spinner while fetching studioId
  if (loadingStudioId || (isAdminMode && !adminStudioId)) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <span className="ml-3">Loading studio data...</span>
          </div>
        </div>
      </div>
    );
  }

  const effectiveUserId = isAdminMode ? (userId || session?.user?.id || '') : userId || '';
  
  // Determine if we should show admin UI:
  // - When in admin mode editing another user's profile, OR
  // - When admin is editing their own profile (even in owner mode)
  const showAdminUI = isAdmin && (isAdminMode || effectiveUserId === session?.user?.id);

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Modal backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity z-[100]" />
      
      {/* Modal container - centers the form */}
      <div className="flex min-h-full items-start md:items-center justify-center p-0 md:p-8 relative z-[101]">
        <div className="relative w-full max-w-7xl mx-auto z-[101]">
          {/* Floating close button in top right */}
          <button
            onClick={handleCloseAttempt}
            disabled={isClosing}
            className="absolute top-4 right-4 z-[102] bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ width: '44px', height: '44px', fontSize: '32px' }}
            title="Close modal (Esc)"
          >
            {isClosing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              '×'
            )}
          </button>
          
          {/* ProfileEditForm is the only container */}
          <ProfileEditForm 
            ref={profileFormRef}
            userId={effectiveUserId}
            mode="modal"
            autoSaveOnSectionChange={false}
            onSaveSuccess={handleSaveSuccess}
            dataSource={isAdminMode ? 'admin' : 'user'}
            adminStudioId={isAdminMode && adminStudioId ? adminStudioId : undefined}
            isAdminUI={showAdminUI}
          />
        </div>
      </div>
    </div>
  );
}
