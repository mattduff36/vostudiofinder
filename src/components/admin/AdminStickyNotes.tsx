'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { showSuccess } from '@/lib/toast';
import { useUnsavedNavigationGuard } from '@/hooks/useUnsavedNavigationGuard';
import { showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { Loader2, X, StickyNote } from 'lucide-react';
import type { StickyNoteValue } from '@/lib/admin/sticky-notes';

interface AdminStickyNotesProps { isOpen: boolean; onClose: () => void }
export function AdminStickyNotes({ isOpen, onClose }: AdminStickyNotesProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [version, setVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<StickyNoteValue | null>(null);
  const read = useRef({ generation: 0, controller: null as AbortController | null });
  const savePending = useRef<Promise<boolean> | null>(null);
  const leavePending = useRef<Promise<boolean> | null>(null);
  const closed = useRef(false);
  const closeOnce = () => { if (!closed.current) { closed.current = true; onClose(); } };
  const hasChanges = loaded && content !== originalContent;

  const fetchNote = useCallback(async () => {
    read.current.controller?.abort();
    const generation = ++read.current.generation;
    const controller = new AbortController(); read.current.controller = controller;
    setIsLoading(true); setLoaded(false); setError(null); setConflict(null);
    try {
      const response = await fetch('/api/admin/sticky-notes', { signal: controller.signal });
      if (!response.ok) throw new Error('Failed to load the shared note. Retry before editing.');
      const data: StickyNoteValue = await response.json();
      if (generation !== read.current.generation || controller.signal.aborted) return;
      setContent(data.content); setOriginalContent(data.content); setVersion(data.updatedAt); setLoaded(true);
    } catch (cause) {
      if (generation === read.current.generation && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Failed to load the shared note.');
    } finally { if (generation === read.current.generation && !controller.signal.aborted) setIsLoading(false); }
  }, []);
  useEffect(() => {
    if (isOpen) { closed.current = false; void fetchNote(); }
    const request = read.current;
    return () => { request.controller?.abort(); ++request.generation; };
  }, [isOpen, fetchNote]);


  const save = (): Promise<boolean> => {
    if (savePending.current) return savePending.current;
    if (!loaded || isLoading || conflict) return Promise.resolve(false);
    const generation = read.current.generation;
    const submitted = content;
    const operation = (async () => {
      setIsSaving(true); setError(null);
      try {
        const response = await fetch('/api/admin/sticky-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: submitted, expectedUpdatedAt: version }) });
        const data = await response.json();
        if (generation !== read.current.generation) return false;
        if (response.status === 409) { setConflict(data.latest); setError(data.error); return false; }
        if (!response.ok) throw new Error('Failed to save the note. Your draft has been kept.');
        setOriginalContent(data.content); setVersion(data.updatedAt); showSuccess('Shared note saved'); return true;
      } catch (cause) {
        if (generation === read.current.generation) setError(cause instanceof Error ? cause.message : 'Failed to save the shared note.');
        return false;
      } finally { setIsSaving(false); savePending.current = null; }
    })();
    savePending.current = operation;
    return operation;
  };
  const confirmLeave = (): Promise<boolean> => {
    if (leavePending.current) return leavePending.current;
    const operation = (async () => {
      if (savePending.current) return savePending.current;
      if (!hasChanges) return true;
      const answer = await showUnsavedChangesDialog();
      if (answer === 'cancel') return false;
      return answer === 'discard' || await save();
    })().finally(() => { leavePending.current = null; });
    leavePending.current = operation;
    return operation;
  };
  const handleClose = async () => { if (await confirmLeave()) closeOnce(); };
  useUnsavedNavigationGuard({ enabled: isOpen && hasChanges, confirmLeave, onAccepted: closeOnce });

  return <Modal title="Admin Sticky Notes" isOpen={isOpen} onClose={() => void handleClose()} maxWidth="lg">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2"><StickyNote className="w-5 h-5 text-gray-700" /><h2 className="text-xl font-bold text-gray-900">Admin Sticky Notes</h2></div>
        <button onClick={() => void handleClose()} className="text-gray-400 hover:text-gray-600" aria-label="Close notes"><X className="w-5 h-5" /></button>
      </div>
      <p className="text-sm text-gray-600 mb-4">Shared note for all admins. Use this to track small snippets of information needed for the immediate future.</p>
      {error && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} {!loaded && <button className="underline" onClick={() => void fetchNote()}>Retry load</button>}</div>}
      {isLoading ? <div role="status" aria-label="Loading notes" className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div> : <>
        <Textarea aria-label="Shared admin note" value={content} onChange={event => setContent(event.target.value)} placeholder="Enter your notes here..." rows={12} maxLength={10000} className="font-mono text-sm" disabled={!loaded || isSaving} />
        <div className="mt-2 text-xs text-gray-500 text-right">{content.length.toLocaleString()} / 10,000 characters</div>
        {conflict && <div className="mt-4 rounded border border-amber-300 p-3 text-sm">
          <p className="mb-2 font-medium">Latest saved note</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">{conflict.content || '(empty)'}</pre>
          <p className="my-2">Your draft is still in the editor. Review and combine the notes before saving again.</p>
          <button className="underline" onClick={() => { setOriginalContent(conflict.content); setVersion(conflict.updatedAt); setConflict(null); setError(null); }}>Keep my draft and use this version for the next save</button>
        </div>}
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => void handleClose()} disabled={isSaving}>Close</Button>
          <Button onClick={async () => { if (await save()) closeOnce(); }} disabled={!loaded || isSaving || !hasChanges || !!conflict}>{isSaving ? 'Saving...' : 'Save'}</Button>
        </div>
      </>}
    </div>
  </Modal>;
}
