'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProfileEditForm, ProfileEditFormHandle } from '@/components/dashboard/ProfileEditForm';
import { showError } from '@/lib/toast';

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

  // Reset studioId when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAdminStudioId(studioId);
      setLoadingStudioId(false);
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
    
    setIsClosing(true);
    
    const savePromise = profileFormRef.current?.saveIfDirty();
    if (savePromise === undefined) {
      // Ref not mounted or form not ready - don't close without attempting save (avoid data loss)
      setIsClosing(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('MODAL_CLOSE_TIMEOUT: Save operation timed out after 30 seconds'));
      }, 30000);
    });
    
    try {
      const saveSuccess = await Promise.race([savePromise, timeoutPromise]);
      
      // Clean up timeout if save completed first (prevent unhandled rejection)
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      if (saveSuccess === false) {
        // Save failed, block closing
        setIsClosing(false);
        return;
      }
      
      // Save succeeded or no changes, allow close
      // Don't refresh - just close the modal and stay on current page
      onClose();
    } catch (error) {
      // Clean up timeout on error too
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a timeout error
      if (errorMessage.includes('MODAL_CLOSE_TIMEOUT')) {
        console.error('❌ CRITICAL ERROR: Modal close operation timed out', {
          timestamp: new Date().toISOString(),
          userId: session?.user?.id,
          username: session?.user?.username,
          mode: mode,
          targetUsername: targetUsername,
          error: errorMessage
        });
        
        showError('Save operation timed out. Forcing modal close.');
        
        // Force close the modal after timeout
        setIsClosing(false);
        onClose();
      } else {
        // Regular error during save
        console.error('Error during modal close:', error);
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
            autoSaveOnSectionChange={true}
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
