'use client';

import { useEffect, useRef, useState } from 'react';
import { createSampleVariables, type EmailTemplateCopy, type ResolvedEmailTemplate } from '@/lib/email/template-contract';

interface TemplatePlaygroundProps {
  template: Pick<ResolvedEmailTemplate, 'key' | 'variableSchema'>;
  draft?: Partial<EmailTemplateCopy>;
  mode: 'preview' | 'test';
  onBusyChange?: (busy: boolean) => void;
}

export async function emailResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const issues = Array.isArray(data.details) ? data.details.map((issue: { path?: string[]; message?: string }) => `${issue.path?.join('.') || 'Input'}: ${issue.message}`).join('; ') : '';
    throw new Error(`${data.error || 'Request failed'}${issues ? ` — ${issues}` : ''}`);
  }
  return data as T;
}

export function TemplatePlayground({ template, draft, mode, onBusyChange }: TemplatePlaygroundProps) {
  const [variables, setVariables] = useState(() => createSampleVariables(template.variableSchema));
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const body = JSON.stringify({ templateKey: template.key, variables, ...(draft ? { draft } : {}) });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await emailResponse<{ html: string; subject: string }>(await fetch('/api/admin/emails/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal,
        }));
        if (!controller.signal.aborted) setPreview(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Preview failed');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [body]);

  const sendTest = async () => {
    if (pending.current || loading || error) return;
    if (!recipient.trim()) { setMessage('Enter the destination for this test.'); return; }
    pending.current = true; setSending(true); onBusyChange?.(true); setMessage('');
    try {
      await emailResponse(await fetch('/api/admin/emails/test-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...JSON.parse(body), recipientEmail: recipient }),
      }));
      setMessage('The provider accepted this test email. Your draft is still here.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Test result unavailable. Check before sending again.'); }
    finally { pending.current = false; setSending(false); onBusyChange?.(false); }
  };

  return <section className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 mb-6" aria-label={mode === 'test' ? 'Test email' : 'Email preview'}>
    <h2 className="text-lg font-semibold text-gray-900">{mode === 'test' ? 'Test email' : 'Email preview'} — {draft ? 'current unsaved draft' : 'saved content'}</h2>
    <p className="text-sm text-gray-600 mt-1 mb-4">Example values below are only for this preview or test. They are never used as campaign recipient data.</p>
    <fieldset disabled={sending} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <legend className="sr-only">Sample variables</legend>
      {Object.entries(template.variableSchema).map(([key, type]) => <label key={key} className="block text-sm text-gray-700">
        {key} <span className="text-gray-500">({type})</span>
        <input aria-label={`Sample ${key}`} type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}
          value={variables[key] ?? ''} onChange={event => setVariables(current => ({ ...current, [key]: event.target.value }))}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </label>)}
    </fieldset>
    {mode === 'test' && <div className="mb-4">
      <label htmlFor="email-test-recipient" className="block text-sm font-medium text-gray-700 mb-1">Test recipient email address</label>
      <input id="email-test-recipient" type="email" value={recipient} disabled={sending} onChange={event => setRecipient(event.target.value)}
        className="w-full max-w-lg px-3 py-2 border border-gray-300 rounded-lg" />
      <button type="button" onClick={sendTest} disabled={sending || loading || !!error || !recipient.trim()}
        className="block mt-3 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">{sending ? 'Sending test…' : 'Send test email'}</button>
    </div>}
    {message && <p role="status" className="mb-3 text-sm text-gray-800">{message}</p>}
    {loading && <p role="status" className="text-sm text-gray-600 mb-3">Updating preview…</p>}
    {error && <p role="alert" className="p-3 bg-red-50 text-red-800 rounded-lg mb-3">{error}</p>}
    {preview && !error && <div aria-busy={loading}>
      <p className="mb-2 text-sm font-medium text-gray-900">Subject: {preview.subject}</p>
      <iframe srcDoc={preview.html} title="Rendered email preview" sandbox="" className="w-full h-[650px] border border-gray-300 rounded-lg bg-white" />
    </div>}
  </section>;
}
