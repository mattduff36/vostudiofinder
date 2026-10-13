'use client';

import { useState } from 'react';
import { CheckCircle, Circle, Copy, Pencil } from 'lucide-react';
import type { Studio } from './types';
import { completionEditSection, type ProfileSectionId } from '@/lib/profile/completion-sections';
import { COMPLETION_CONNECTION_FIELDS } from '@/lib/utils/profile-completion';
import { formatDate } from '@/lib/date-format';

const connectionLabels = ['Source Connect', 'Source-Nexus', 'Phone Patch', 'Session Link Pro', 'Zoom or Teams', 'Cleanfeed', 'Riverside', 'Google Hangouts', 'ipDTL', 'SquadCast', 'Zencastr', 'DIVA'];
export function outstandingStudioText(studio: Studio): string {
  const missing = studio.completion.items.filter(item => !item.completed);
  return [`${studio.name} — ${studio.profile_completion}% complete`,
    'Required outstanding:', ...missing.filter(item => item.required).map(item => `• ${item.label}`),
    ...(missing.some(item => item.required) ? [] : ['None']),
    'Optional outstanding:', ...missing.filter(item => !item.required).map(item => `• ${item.label}`),
    ...(missing.some(item => !item.required) ? [] : ['None'])].join('\n');
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
    <section data-studio-details className="border-t border-gray-200 mt-3 pt-4 text-sm text-gray-700 whitespace-normal min-w-0" onClick={event => event.stopPropagation()} aria-label={`${studio.name} details`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><h3 className="font-semibold text-gray-900">Profile completion: {studio.profile_completion}%</h3>
          <p className="text-xs text-gray-600">Required {studio.completion.required.completed}/{studio.completion.required.total} · Optional {studio.completion.optional.completed}/{studio.completion.optional.total}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={copyOutstanding} className="inline-flex items-center gap-1 text-gray-700 hover:underline"><Copy className="h-4 w-4" />Copy outstanding items</button>
          <button type="button" onClick={() => onEdit('basic')} className="inline-flex items-center gap-1 text-blue-700 hover:underline"><Pencil className="h-4 w-4" />Edit Profile</button>
        </div>
      </div>
      {copyResult === 'copied' && <p role="status" className="mb-3 text-green-700">Outstanding items copied.</p>}
      {copyResult === 'fallback' && <label className="block mb-3">Select and copy the text below:<textarea readOnly value={text} className="mt-1 w-full min-h-36 border rounded p-2" onFocus={event => event.target.select()} /></label>}
      <div className="grid md:grid-cols-2 gap-4">
        {[true, false].map(required => <div key={String(required)}><h4 className="!text-sm !font-semibold text-gray-900 !mt-0 !mb-2">{required ? 'Required' : 'Optional'}</h4>
          <ul className="space-y-1.5">{studio.completion.items.filter(item => item.required === required).map(item => <li key={item.id} className="flex items-center gap-2">
            {item.completed ? <CheckCircle aria-hidden className="w-4 h-4 shrink-0 text-green-600" /> : <Circle aria-hidden className="w-4 h-4 shrink-0 text-amber-600" />}
            <span className={item.completed ? 'text-gray-600' : 'font-medium text-gray-900'}>{item.label}<span className="sr-only"> — {item.completed ? 'Complete' : 'Outstanding'}</span></span>
            <button type="button" onClick={() => onEdit(completionEditSection(item.id, 'admin'))} className="ml-auto text-xs text-blue-700 hover:underline" aria-label={`Edit ${item.label}`}>Edit</button>
          </li>)}</ul>
        </div>)}
      </div>
      <dl className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-5 break-words [overflow-wrap:anywhere]">
        <div><dt className="font-medium text-gray-900">Owner</dt><dd>{studio.users.display_name || 'Missing'} (@{studio.users.username || 'Missing'})</dd></div>
        <div><dt className="font-medium text-gray-900">Email</dt><dd>{studio.users.email || 'Missing'} · {studio.users.email_verified ? 'Verified' : 'Not verified'}</dd></div>
        <div><dt className="font-medium text-gray-900">Location</dt><dd>{studio.location || 'Missing'}</dd></div>
        <div><dt className="font-medium text-gray-900">Website</dt><dd>{safeWebsite ? <a href={safeWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{website}</a> : website || 'Missing'}</dd></div>
        <div><dt className="font-medium text-gray-900">Connections</dt><dd>{connections || 'None selected'}</dd></div>
        <div><dt className="font-medium text-gray-900">Images</dt><dd>{studio.images_count ?? studio.studio_images.length} studio image(s) · {studio.users.avatar_url ? 'Avatar added' : 'Avatar missing'}</dd></div>
        <div><dt className="font-medium text-gray-900">Membership</dt><dd>{studio.membership_tier} · {studio.membership_expires_at ? `Expires ${formatDate(studio.membership_expires_at)}` : 'No expiry recorded'}</dd></div>
        <div><dt className="font-medium text-gray-900">Visibility and listing</dt><dd>{studio.is_profile_visible ? 'Visible' : 'Hidden'} · {studio.status} · {studio.is_verified ? 'Studio verified' : 'Studio not verified'}</dd></div>
        <div><dt className="font-medium text-gray-900">Featured</dt><dd>{studio.is_featured ? `Featured${studio.featured_until ? ` until ${formatDate(studio.featured_until)}` : ' · No expiry recorded'}` : 'Not featured'}</dd></div>
        <div><dt className="font-medium text-gray-900">Admin review</dt><dd>{studio.admin_review ? 'Flagged for review' : 'Not flagged'}</dd></div>
        <div className="md:col-span-2"><dt className="font-medium text-gray-900">Short description</dt><dd className="whitespace-pre-wrap">{studio.short_about || 'Missing'}</dd></div>
        <div className="md:col-span-2"><dt className="font-medium text-gray-900">Full description</dt><dd className="whitespace-pre-wrap max-h-64 overflow-y-auto">{studio.about || 'Missing'}</dd></div>
      </dl>
    </section>
  );
}
