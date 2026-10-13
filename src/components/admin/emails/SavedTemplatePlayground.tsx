'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { TemplatePlayground, emailResponse } from './TemplatePlayground';
import type { ResolvedEmailTemplate } from '@/lib/email/template-contract';

export function SavedTemplatePlayground({ mode }: { mode: 'preview' | 'test' }) {
  const { key } = useParams<{ key: string }>();
  const [template, setTemplate] = useState<ResolvedEmailTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setTemplate(null); setError(null);
    void fetch(`/api/admin/emails/templates/${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(response => emailResponse<{ template: ResolvedEmailTemplate }>(response))
      .then(data => { if (!controller.signal.aborted) setTemplate(data.template); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Template unavailable'); });
    return () => controller.abort();
  }, [key, retry]);
  return <><AdminTabs activeTab="emails" /><div className="px-4 py-4 md:p-8 max-w-7xl mx-auto">
    <Link href={`/admin/emails/template/${encodeURIComponent(key)}`} className="inline-block mb-4 text-gray-600 hover:text-gray-900">← Back to template editor</Link>
    {error ? <div role="alert" className="bg-red-50 p-4 rounded-lg text-red-800">{error} <button onClick={() => setRetry(value => value + 1)} className="underline">Retry</button></div>
      : template ? <TemplatePlayground key={key} template={template} mode={mode} /> : <p role="status">Loading saved template…</p>}
  </div></>;
}
