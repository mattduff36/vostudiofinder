'use client';

import { useRef, useEffect, useState, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProfileEditForm, type ProfileEditFormHandle } from '@/components/dashboard/ProfileEditForm';
import { ManagedOverlay } from '@/components/ui/ManagedOverlay';
import { showError } from '@/lib/toast';
import { showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import type { ProfileSectionId } from '@/lib/profile/completion-sections';
import type { PersistedProfileChange } from '@/lib/profile/persisted-change';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (() => void) | undefined;
  onPersistedChange?: ((change: PersistedProfileChange) => void) | undefined;
  userId?: string | undefined;
  mode?: 'owner' | 'admin';
  targetUsername?: string | undefined;
  studioId?: string | undefined;
  initialSection?: ProfileSectionId | undefined;
  openSessionId?: number | string | undefined;
  fallbackFocusRef?: RefObject<HTMLElement | null> | undefined;
}

export function EditProfileModal(props: EditProfileModalProps) {
  if (!props.isOpen) return null;
  // Explicit target and opening identity own all async work and form state.
  const identity = `${props.mode ?? 'owner'}:${props.studioId ?? props.targetUsername ?? props.userId ?? 'self'}:${props.openSessionId ?? ''}`;
  return <EditorSession key={identity} {...props} />;
}

function EditorSession({ onClose, onSaveSuccess, onPersistedChange, userId, mode = 'owner', targetUsername, studioId, initialSection, fallbackFocusRef }: EditProfileModalProps) {
  const profileFormRef = useRef<ProfileEditFormHandle>(null);
  const closePending = useRef(false);
  const active = useRef(true);
  const [isClosing, setIsClosing] = useState(false);
  const [resolvedStudioId, setResolvedStudioId] = useState<string | undefined>(studioId);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [selfLookupFailed, setSelfLookupFailed] = useState(false);
  const { data: session } = useSession();
  const explicitAdmin = mode === 'admin';
  // Both owner accounts were verified to carry the stored ADMIN role.
  const isAdmin = session?.user?.role === 'ADMIN';
  const selfAdmin = isAdmin && !explicitAdmin && (!userId || session?.user?.id === userId);
  const needsAdmin = explicitAdmin || selfAdmin && !selfLookupFailed;
  const targetId = studioId || resolvedStudioId;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (studioId || !needsAdmin) return;
    const username = explicitAdmin ? targetUsername : session?.user?.username;
    if (!username) { if (explicitAdmin) setLookupError('No studio was selected.'); return; }
    const controller = new AbortController();
    setLookupError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/studios/by-username/${encodeURIComponent(username)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load the selected studio.');
        const data = await response.json();
        if (!data.studio?.id) throw new Error('The selected studio is unavailable.');
        if (!controller.signal.aborted && active.current) setResolvedStudioId(data.studio.id);
      } catch (error) {
        if (controller.signal.aborted || !active.current) return;
        if (selfAdmin && !explicitAdmin) setSelfLookupFailed(true);
        else setLookupError(error instanceof Error ? error.message : 'Unable to load studio.');
      }
    })();
    return () => controller.abort();
  }, [studioId, needsAdmin, explicitAdmin, targetUsername, session?.user?.username, selfAdmin, lookupAttempt]);

  const handleCloseAttempt = async () => {
    if (closePending.current) return;
    closePending.current = true;
    setIsClosing(true);
    try {
      await profileFormRef.current?.waitForPendingSaves();
      if (!active.current) return;
      const dirty = profileFormRef.current?.hasUnsavedChanges() ?? false;
      if (!dirty) { onClose(); return; }
      const result = await showUnsavedChangesDialog();
      if (!active.current || result === 'cancel') return;
      if (result === 'discard') { onClose(); return; }
      const saved = await profileFormRef.current?.saveIfDirty();
      if (active.current && saved !== false) onClose();
    } catch { if (active.current) showError('Unable to finish saving. Please try again.'); }
    finally { closePending.current = false; if (active.current) setIsClosing(false); }
  };
  const useAdminData = needsAdmin && !!targetId;
  return <ManagedOverlay title="Edit Profile" onClose={() => { void handleCloseAttempt(); }} bodyClass="admin-modal-open" fallbackFocusRef={fallbackFocusRef} className="overflow-y-auto">
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md pointer-events-none" />
    <div className="flex min-h-full items-start md:items-center justify-center p-0 md:p-8 relative" onClick={event => { if (event.target === event.currentTarget) void handleCloseAttempt(); }}>
      <div className="relative w-full max-w-7xl mx-auto">
        <button type="button" onClick={() => { void handleCloseAttempt(); }} disabled={isClosing} aria-label="Close profile editor"
          className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ width: 44, height: 44, fontSize: 32 }} title="Close modal (Esc)">
          {isClosing ? <Loader2 className="w-6 h-6 animate-spin" /> : '×'}
        </button>
        {lookupError ? <div className="bg-white rounded-lg p-8" role="alert"><p>{lookupError}</p><button type="button" className="mt-3 underline" onClick={() => setLookupAttempt(value => value + 1)}>Retry</button></div>
          : needsAdmin && !targetId ? <div className="bg-white rounded-lg p-8 flex items-center" role="status"><Loader2 className="w-8 h-8 animate-spin text-red-600" /><span className="ml-3">Loading studio data…</span></div>
          : <ProfileEditForm ref={profileFormRef} userId={userId || session?.user?.id || ''} mode="modal" autoSaveOnSectionChange={false}
            onSaveSuccess={onSaveSuccess} onNavigateAway={() => { if (active.current) onClose(); }} onPersistedChange={onPersistedChange} initialSection={initialSection}
            dataSource={useAdminData ? 'admin' : 'user'} adminStudioId={useAdminData ? targetId : undefined}
            isAdminUI={isAdmin && (explicitAdmin || selfAdmin)} disableSandboxOverrides={explicitAdmin} />}
      </div>
    </div>
  </ManagedOverlay>;
}
