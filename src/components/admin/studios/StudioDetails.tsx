'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle, Circle, Copy } from 'lucide-react';
import type { Studio, AdminStudioDetails } from './types';
import { completionEditSection, type ProfileSectionId } from '@/lib/profile/completion-sections';
import { formatDate } from '@/lib/date-format';

const groupHeading = '!text-sm !font-semibold text-gray-900 !mt-0 !mb-2';

export function outstandingStudioText(studio: Studio): string {
  const missing = studio.completion.items.filter(item => !item.completed);
  return [`${studio.name} — ${studio.profile_completion}% complete`,
    'Required outstanding:', ...missing.filter(item => item.required).map(item => `• ${item.label}`),
    ...(missing.some(item => item.required) ? [] : ['None']),
    'Optional outstanding:', ...missing.filter(item => !item.required).map(item => `• ${item.label}`),
    ...(missing.some(item => !item.required) ? [] : ['None'])].join('\n');
}

function DetailFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-medium text-gray-900">{label}</dt>
      <dd className="break-words [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function StudioDetails({ studio, onEdit }: { studio: Studio; onEdit: (section: ProfileSectionId) => void }) {
  const [copyResult, setCopyResult] = useState<'copied' | 'fallback' | null>(null);
  const text = outstandingStudioText(studio);
  const copyOutstanding = async () => {
    try { await navigator.clipboard.writeText(text); setCopyResult('copied'); }
    catch { setCopyResult('fallback'); }
  };
  const details = studio.admin_details;
  const [savedNote, setSavedNote] = useState<AdminStudioDetails['note'] | null>(null);
  const note = savedNote ?? details?.note;
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [noteConflict, setNoteConflict] = useState<AdminStudioDetails['note'] | null>(null);
  const saveNote = async () => {
    if (savingNote || noteConflict || !note) return;
    setSavingNote(true); setNoteError(''); setNoteSuccess(false);
    try {
      const response = await fetch(`/api/admin/studios/${encodeURIComponent(studio.id)}/note`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteDraft, expectedVersion: note.version }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && result.latest) setNoteConflict(result.latest);
        throw new Error(result.error || 'Unable to save note.');
      }
      setSavedNote(result.note); setEditingNote(false); setNoteSuccess(true);
    } catch (error) { setNoteError(error instanceof Error ? error.message : 'Unable to save note. Reload before retrying.'); }
    finally { setSavingNote(false); }
  };
  const ageDays = details ? Math.max(0, Math.floor((Date.now() - new Date(details.accountCreatedAt).getTime()) / 86400000)) : null;
  return (
    <section data-studio-details className="@container border-t border-gray-200 mt-3 pt-3 text-sm text-gray-700 whitespace-normal min-w-0 max-w-full" onClick={event => event.stopPropagation()} aria-label={`${studio.name} details`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div><h3 className="!text-sm !font-semibold text-gray-900 !mt-0 !mb-1">Profile completion: {studio.profile_completion}%</h3>
          <p className="text-xs text-gray-600">Required {studio.completion.required.completed}/{studio.completion.required.total} · Optional {studio.completion.optional.completed}/{studio.completion.optional.total}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={copyOutstanding} className="inline-flex items-center gap-1 text-gray-700 hover:underline"><Copy className="h-4 w-4" />Copy outstanding items</button>
        </div>
      </div>
      {copyResult === 'copied' && <p role="status" className="mb-3 text-green-700">Outstanding items copied.</p>}
      {copyResult === 'fallback' && <label className="block mb-3">Select and copy the text below:<textarea readOnly value={text} className="mt-1 w-full min-h-36 border rounded p-2" onFocus={event => event.target.select()} /></label>}
      <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4 gap-x-4 gap-y-3 min-w-0">
        {[true, false].map(required => <div key={String(required)} className="min-w-0"><h4 className={groupHeading}>{required ? 'Required' : 'Optional'}</h4>
          <ul className="space-y-1">{studio.completion.items.filter(item => item.required === required).map(item => <li key={item.id} className="min-w-0">
            <button type="button" onClick={() => onEdit(completionEditSection(item.id, 'admin'))} aria-label={`Edit ${item.label}`} aria-description={item.completed ? 'Complete' : 'Outstanding'} className="flex w-full items-start gap-2 min-w-0 rounded text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {item.completed ? <CheckCircle aria-hidden className="w-4 h-4 shrink-0 mt-0.5 text-green-600" /> : <Circle aria-hidden className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />}
            <span className={`min-w-0 break-words ${item.completed ? 'text-gray-600' : 'font-medium text-gray-900'}`}>{item.label}<span className="sr-only"> — {item.completed ? 'Complete' : 'Outstanding'}</span></span>
            </button>
          </li>)}</ul>
        </div>)}
        <div className="min-w-0">
          <h4 className={groupHeading}>Account and billing</h4>
          <dl className="space-y-1.5">
            <DetailFact label="Email verification">{studio.users.email_verified ? 'Verified' : 'Awaiting verification'}</DetailFact>
            <DetailFact label="Account created">{details ? `${formatDate(details.accountCreatedAt)} · ${ageDays?.toLocaleString('en-GB')} days ago` : 'Unavailable'}</DetailFact>
            <DetailFact label="Billing status">{details?.billing ?? 'Unavailable'}{details?.latestPayment && <span className="block text-xs">Latest payment: {details.latestPayment}</span>}</DetailFact>
            <DetailFact label="Auto-renewal">{details?.renewal ?? 'Unavailable'}</DetailFact>
          </dl>
        </div>
        <div className="min-w-0">
          <h4 className={groupHeading}>Needs attention</h4>
          <dl className="space-y-1.5">
            <DetailFact label="Outstanding issues">{details ? `${details.openSupport} open support ${details.openSupport === 1 ? 'ticket' : 'tickets'} · ${details.openRefunds} ${details.openRefunds === 1 ? 'refund' : 'refunds'} needing attention` : 'Unavailable'}</DetailFact>
            <DetailFact label="Latest admin note">
              <span className="block line-clamp-3 whitespace-pre-line" title={note?.text || undefined}>{details ? note?.text || 'No admin note yet' : 'Unavailable'}</span>
              {note?.updatedAt && <span className="block text-xs text-gray-500">Updated {formatDate(note.updatedAt)}</span>}
              {!editingNote && <button type="button" disabled={!details} onClick={() => { setNoteDraft(note?.text || ''); setNoteError(''); setNoteConflict(null); setNoteSuccess(false); setEditingNote(true); }} className="text-xs text-blue-700 hover:underline disabled:text-gray-400">{note?.text ? 'View / edit note' : 'Add note'}</button>}
            </DetailFact>
          </dl>
          {editingNote && <div className="mt-2 space-y-2">
            <label className="block text-xs">Private admin note<textarea aria-label="Private admin note" maxLength={500} disabled={savingNote} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} className="block mt-1 w-full rounded border border-gray-300 p-2 text-sm" rows={3} /></label>
            <div className="flex gap-3 text-xs"><button type="button" disabled={savingNote || !!noteConflict} onClick={saveNote} className="text-blue-700 hover:underline">{savingNote ? 'Saving…' : 'Save note'}</button><button type="button" disabled={savingNote} onClick={() => setEditingNote(false)} className="hover:underline">Cancel</button><span className="ml-auto text-gray-500">{noteDraft.length}/500</span></div>
            {noteConflict && <div className="text-xs"><p>Latest saved note: {noteConflict.text || 'No note'}</p><button type="button" className="text-blue-700 underline" onClick={() => { setSavedNote(noteConflict); setNoteDraft(noteConflict.text); setNoteConflict(null); setNoteError(''); }}>Load latest note</button></div>}
            {noteError && <p role="alert" className="text-xs text-red-700">{noteError}</p>}
          </div>}
          {noteSuccess && <p role="status" className="mt-1 text-xs text-green-700">Admin note saved.</p>}
        </div>
      </div>
    </section>
  );
}
