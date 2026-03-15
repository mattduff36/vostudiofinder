'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LayoutType = 'STANDARD' | 'HERO';
type VariableType = 'string' | 'url' | 'email' | 'number' | 'date';

interface VariableField {
  key: string;
  type: VariableType;
}

interface CreateTemplateForm {
  key: string;
  name: string;
  description: string;
  layout: LayoutType;
  isMarketing: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  subject: string;
  preheader: string;
  heading: string;
  bodyParagraphs: string[];
  bulletItems: string[];
  ctaPrimaryLabel: string;
  ctaPrimaryUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  footerText: string;
}

const VARIABLE_TYPE_OPTIONS: VariableType[] = ['string', 'url', 'email', 'number', 'date'];

export default function NewEmailTemplatePage() {
  const router = useRouter();

  const [form, setForm] = useState<CreateTemplateForm>({
    key: '',
    name: '',
    description: '',
    layout: 'STANDARD',
    isMarketing: false,
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
    subject: '',
    preheader: '',
    heading: '',
    bodyParagraphs: [''],
    bulletItems: [],
    ctaPrimaryLabel: '',
    ctaPrimaryUrl: '',
    ctaSecondaryLabel: '',
    ctaSecondaryUrl: '',
    footerText: '',
  });
  const [variables, setVariables] = useState<VariableField[]>([
    { key: 'userEmail', type: 'string' },
    { key: 'displayName', type: 'string' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof CreateTemplateForm>(field: K, value: CreateTemplateForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: 'bodyParagraphs' | 'bulletItems', index: number, value: string) => {
    const next = [...form[field]];
    next[index] = value;
    updateField(field, next);
  };

  const addArrayItem = (field: 'bodyParagraphs' | 'bulletItems') => {
    updateField(field, [...form[field], '']);
  };

  const removeArrayItem = (field: 'bodyParagraphs' | 'bulletItems', index: number) => {
    const filtered = form[field].filter((_, i) => i !== index);
    updateField(field, filtered.length > 0 || field === 'bulletItems' ? filtered : ['']);
  };

  const addVariable = () => {
    setVariables((prev) => [...prev, { key: '', type: 'string' }]);
  };

  const updateVariable = (index: number, patch: Partial<VariableField>) => {
    setVariables((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const RESERVED_KEYS = ['new', 'create', 'edit', 'delete', 'preview', 'test'];

  const normalizeTemplateKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  const buildVariableSchema = () => {
    const schema: Record<string, VariableType> = {};
    variables.forEach((item) => {
      const cleanKey = item.key.trim();
      if (cleanKey) {
        schema[cleanKey] = item.type;
      }
    });
    return schema;
  };

  const handleSubmit = async () => {
    setError(null);

    const normalizedKey = normalizeTemplateKey(form.key.trim()).replace(/^-+|-+$/g, '');
    if (!normalizedKey) {
      setError('Template key is required.');
      return;
    }

    if (RESERVED_KEYS.includes(normalizedKey)) {
      setError(`"${normalizedKey}" is a reserved key. Please choose a different template key.`);
      return;
    }

    if (!form.name.trim() || !form.subject.trim() || !form.heading.trim()) {
      setError('Name, subject, and heading are required.');
      return;
    }

    const bodyParagraphs = form.bodyParagraphs.map((p) => p.trim()).filter(Boolean);
    if (bodyParagraphs.length === 0) {
      setError('At least one body paragraph is required.');
      return;
    }

    const payload = {
      key: normalizedKey,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      layout: form.layout,
      isMarketing: form.isMarketing,
      fromName: form.fromName.trim() || undefined,
      fromEmail: form.fromEmail.trim() || undefined,
      replyToEmail: form.replyToEmail.trim() || undefined,
      subject: form.subject.trim(),
      preheader: form.preheader.trim() || undefined,
      heading: form.heading.trim(),
      bodyParagraphs,
      bulletItems: form.bulletItems.map((item) => item.trim()).filter(Boolean),
      ctaPrimaryLabel: form.ctaPrimaryLabel.trim() || undefined,
      ctaPrimaryUrl: form.ctaPrimaryUrl.trim() || undefined,
      ctaSecondaryLabel: form.ctaSecondaryLabel.trim() || undefined,
      ctaSecondaryUrl: form.ctaSecondaryUrl.trim() || undefined,
      footerText: form.footerText.trim() || undefined,
      variableSchema: buildVariableSchema(),
    };

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const details = Array.isArray(data?.details) ? ` ${data.details.map((d: { message?: string }) => d.message).join(', ')}` : '';
        throw new Error(data?.error ? `${data.error}${details}` : 'Failed to create template.');
      }

      router.push(`/admin/emails/template/${payload.key}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AdminTabs activeTab="emails" />

      <div className="px-4 py-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/emails')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Templates
            </button>

            <h1 className="text-2xl font-bold text-gray-900">Create Custom Template</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create a custom email template and continue editing in the standard template editor.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Key *</label>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => updateField('key', normalizeTemplateKey(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="example-template-key"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Legacy User Re-Engagement"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Short internal description for admins"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                <select
                  value={form.layout}
                  onChange={(e) => updateField('layout', e.target.value as LayoutType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="HERO">HERO</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isMarketing}
                    onChange={(e) => updateField('isMarketing', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                  />
                  Marketing Email (adds unsubscribe handling)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                <input
                  type="text"
                  value={form.fromName}
                  onChange={(e) => updateField('fromName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Voiceover Studio Finder"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => updateField('fromEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="hello@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reply-To Email</label>
                <input
                  type="email"
                  value={form.replyToEmail}
                  onChange={(e) => updateField('replyToEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="support@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Variables</label>
              <div className="space-y-2">
                {variables.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => updateVariable(index, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="displayName"
                    />
                    <select
                      value={item.type}
                      onChange={(e) => updateVariable(index, { type: e.target.value as VariableType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      {VARIABLE_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeVariable(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addVariable}
                type="button"
                className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Variable
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Your subject line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preheader Text</label>
              <input
                type="text"
                value={form.preheader}
                onChange={(e) => updateField('preheader', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Preview text shown by email clients"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Heading *</label>
              <input
                type="text"
                value={form.heading}
                onChange={(e) => updateField('heading', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Main email heading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Paragraphs *</label>
              <div className="space-y-3">
                {form.bodyParagraphs.map((paragraph, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      rows={3}
                      value={paragraph}
                      onChange={(e) => updateArrayField('bodyParagraphs', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder={`Paragraph ${index + 1}`}
                    />
                    {form.bodyParagraphs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('bodyParagraphs', index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addArrayItem('bodyParagraphs')}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                + Add Paragraph
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bullet Points</label>
              <div className="space-y-2">
                {form.bulletItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateArrayField('bulletItems', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder={`Bullet ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('bulletItems', index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addArrayItem('bulletItems')}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                + Add Bullet Point
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Button Label</label>
                <input
                  type="text"
                  value={form.ctaPrimaryLabel}
                  onChange={(e) => updateField('ctaPrimaryLabel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Get Started"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Button URL</label>
                <input
                  type="text"
                  value={form.ctaPrimaryUrl}
                  onChange={(e) => updateField('ctaPrimaryUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="https://... or {{variableName}}"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Button Label</label>
                <input
                  type="text"
                  value={form.ctaSecondaryLabel}
                  onChange={(e) => updateField('ctaSecondaryLabel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Learn More"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Button URL</label>
                <input
                  type="text"
                  value={form.ctaSecondaryUrl}
                  onChange={(e) => updateField('ctaSecondaryUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="https://... or {{variableName}}"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
              <textarea
                rows={4}
                value={form.footerText}
                onChange={(e) => updateField('footerText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Optional custom footer text"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
