'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle, Circle, Copy, Pencil } from 'lucide-react';
import type { Studio } from './types';
import { completionEditSection, type ProfileSectionId } from '@/lib/profile/completion-sections';
import { COMPLETION_CONNECTION_FIELDS } from '@/lib/utils/profile-completion';
import { formatDate } from '@/lib/date-format';

const connectionLabels = ['Source Connect', 'Source-Nexus', 'Phone Patch', 'Session Link Pro', 'Zoom or Teams', 'Cleanfeed', 'Riverside', 'Google Hangouts', 'ipDTL', 'SquadCast', 'Zencastr', 'DIVA'];
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
  const connections = COMPLETION_CONNECTION_FIELDS.flatMap((field, index) => studio[field] === '1' ? [connectionLabels[index]] : []).join(', ');
  const website = studio.website_url?.trim();
  const safeWebsite = website && /^https?:\/\//i.test(website) ? website : undefined;
  return (
    <section data-studio-details className="@container border-t border-gray-200 mt-3 pt-3 text-sm text-gray-700 whitespace-normal min-w-0 max-w-full" onClick={event => event.stopPropagation()} aria-label={`${studio.name} details`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div><h3 className="!text-sm !font-semibold text-gray-900 !mt-0 !mb-1">Profile completion: {studio.profile_completion}%</h3>
          <p className="text-xs text-gray-600">Required {studio.completion.required.completed}/{studio.completion.required.total} · Optional {studio.completion.optional.completed}/{studio.completion.optional.total}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={copyOutstanding} className="inline-flex items-center gap-1 text-gray-700 hover:underline"><Copy className="h-4 w-4" />Copy outstanding items</button>
          <button type="button" onClick={() => onEdit('basic')} className="inline-flex items-center gap-1 text-blue-700 hover:underline"><Pencil className="h-4 w-4" />Edit Profile</button>
        </div>
      </div>
      {copyResult === 'copied' && <p role="status" className="mb-3 text-green-700">Outstanding items copied.</p>}
      {copyResult === 'fallback' && <label className="block mb-3">Select and copy the text below:<textarea readOnly value={text} className="mt-1 w-full min-h-36 border rounded p-2" onFocus={event => event.target.select()} /></label>}
      <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4 gap-x-4 gap-y-3 min-w-0">
        {[true, false].map(required => <div key={String(required)} className="min-w-0"><h4 className={groupHeading}>{required ? 'Required' : 'Optional'}</h4>
          <ul className="space-y-1">{studio.completion.items.filter(item => item.required === required).map(item => <li key={item.id} className="flex items-start gap-2 min-w-0">
            {item.completed ? <CheckCircle aria-hidden className="w-4 h-4 shrink-0 mt-0.5 text-green-600" /> : <Circle aria-hidden className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />}
            <span className={`min-w-0 break-words ${item.completed ? 'text-gray-600' : 'font-medium text-gray-900'}`}>{item.label}<span className="sr-only"> — {item.completed ? 'Complete' : 'Outstanding'}</span></span>
            <button type="button" onClick={() => onEdit(completionEditSection(item.id, 'admin'))} className="ml-auto shrink-0 text-xs text-blue-700 hover:underline" aria-label={`Edit ${item.label}`}>Edit</button>
          </li>)}</ul>
        </div>)}
        <div className="min-w-0">
          <h4 className={groupHeading}>Identity and contact</h4>
          <dl className="space-y-1.5">
            <DetailFact label="Owner">{studio.users.display_name || 'Missing'} (@{studio.users.username || 'Missing'})</DetailFact>
            <DetailFact label="Email">{studio.users.email || 'Missing'} · {studio.users.email_verified ? 'Verified' : 'Not verified'}</DetailFact>
            <DetailFact label="Location">{studio.location || 'Missing'}</DetailFact>
            <DetailFact label="Website">{safeWebsite ? <a href={safeWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{website}</a> : website || 'Missing'}</DetailFact>
            <DetailFact label="Connections">{connections || 'None selected'}</DetailFact>
          </dl>
        </div>
        <div className="min-w-0">
          <h4 className={groupHeading}>Listing and membership</h4>
          <dl className="space-y-1.5">
            <DetailFact label="Images">{studio.images_count ?? studio.studio_images.length} studio image(s) · {studio.users.avatar_url ? 'Avatar added' : 'Avatar missing'}</DetailFact>
            <DetailFact label="Membership">{studio.membership_tier} · {studio.membership_expires_at ? `Expires ${formatDate(studio.membership_expires_at)}` : 'No expiry recorded'}</DetailFact>
            <DetailFact label="Visibility and listing">{studio.is_profile_visible ? 'Visible' : 'Hidden'} · {studio.status} · {studio.is_verified ? 'Studio verified' : 'Studio not verified'}</DetailFact>
            <DetailFact label="Featured">{studio.is_featured ? `Featured${studio.featured_until ? ` until ${formatDate(studio.featured_until)}` : ' · No expiry recorded'}` : 'Not featured'}</DetailFact>
            <DetailFact label="Admin review">{studio.admin_review ? 'Flagged for review' : 'Not flagged'}</DetailFact>
            <DetailFact label="Short description">{studio.short_about || 'Missing'}</DetailFact>
          </dl>
        </div>
      </div>
    </section>
  );
}
