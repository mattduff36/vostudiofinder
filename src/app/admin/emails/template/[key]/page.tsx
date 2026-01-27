'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, TestTube, RotateCcw } from 'lucide-react';

interface TemplateData {
  key: string;
  name: string;
  description?: string;
  layout: 'STANDARD' | 'HERO';
  isMarketing: boolean;
  isSystem: boolean;
  subject: string;
  preheader?: string;
  heading: string;
  bodyParagraphs: string[];
  bulletItems?: string[];
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  footerText?: string;
  variableSchema: Record<string, string>;
  defaultTemplate?: any;
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateKey = params.key as string;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTemplate();
  }, [templateKey]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/emails/templates/${templateKey}`);
      
      if (!res.ok) {
        throw new Error('Failed to load template');
      }
      
      const data = await res.json();
      setTemplate(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/admin/emails/templates/${templateKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          preheader: template.preheader,
          heading: template.heading,
          bodyParagraphs: template.bodyParagraphs,
          bulletItems: template.bulletItems,
          ctaPrimaryLabel: template.ctaPrimaryLabel,
          ctaPrimaryUrl: template.ctaPrimaryUrl,
          ctaSecondaryLabel: template.ctaSecondaryLabel,
          ctaSecondaryUrl: template.ctaSecondaryUrl,
          footerText: template.footerText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      setSuccessMessage('Template saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadTemplate(); // Reload to get updated version
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!template?.defaultTemplate || !confirm('Reset to default template? All custom changes will be lost.')) return;
    
    setTemplate({
      ...template,
      subject: template.defaultTemplate.subject,
      preheader: template.defaultTemplate.preheader,
      heading: template.defaultTemplate.heading,
      bodyParagraphs: template.defaultTemplate.bodyParagraphs,
      bulletItems: template.defaultTemplate.bulletItems,
      ctaPrimaryLabel: template.defaultTemplate.ctaPrimaryLabel,
      ctaPrimaryUrl: template.defaultTemplate.ctaPrimaryUrl,
      ctaSecondaryLabel: template.defaultTemplate.ctaSecondaryLabel,
      ctaSecondaryUrl: template.defaultTemplate.ctaSecondaryUrl,
      footerText: template.defaultTemplate.footerText,
    });
  };

  const updateArrayField = (field: 'bodyParagraphs' | 'bulletItems', index: number, value: string) => {
    if (!template) return;
    const array = [...(template[field] || [])];
    array[index] = value;
    setTemplate({ ...template, [field]: array });
  };

  const addArrayItem = (field: 'bodyParagraphs' | 'bulletItems') => {
    if (!template) return;
    const array = [...(template[field] || []), ''];
    setTemplate({ ...template, [field]: array });
  };

  const removeArrayItem = (field: 'bodyParagraphs' | 'bulletItems', index: number) => {
    if (!template) return;
    const array = (template[field] || []).filter((_, i) => i !== index);
    setTemplate({ ...template, [field]: array });
  };

  if (loading) {
    return (
      <div className="px-4 py-4 md:p-6">
        <AdminTabs activeTab="emails" />
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="px-4 py-4 md:p-6">
        <AdminTabs activeTab="emails" />
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin/emails')}
            className="mt-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="emails" />

      <div className="max-w-4xl mx-auto mt-4 md:mt-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/emails')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {template.description || `Edit the ${template.name} template`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {template.isMarketing && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Marketing
                  </span>
                )}
                {template.isSystem && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    System
                  </span>
                )}
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {template.layout}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {template.defaultTemplate && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </button>
              )}
              <button
                onClick={() => router.push(`/admin/emails/template/${templateKey}/preview`)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => router.push(`/admin/emails/template/${templateKey}/test`)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <TestTube className="w-4 h-4" />
                Test Send
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Available Variables */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Available Variables</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(template.variableSchema).map(([key, type]) => (
              <code key={key} className="px-2 py-1 text-xs bg-white border border-blue-200 rounded text-blue-700">
                {`{{${key}}}`}
              </code>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Use these placeholders in your content. They'll be replaced with actual values when the email is sent.
          </p>
        </div>

        {/* Editor Form */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line *
            </label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Email subject"
            />
          </div>

          {/* Preheader */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preheader Text (Preview Text)
            </label>
            <input
              type="text"
              value={template.preheader || ''}
              onChange={(e) => setTemplate({ ...template, preheader: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Preview text shown in email clients"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Heading *
            </label>
            <input
              type="text"
              value={template.heading}
              onChange={(e) => setTemplate({ ...template, heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Email heading (H1)"
            />
          </div>

          {/* Body Paragraphs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Paragraphs *
            </label>
            <div className="space-y-3">
              {template.bodyParagraphs.map((para, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={para}
                    onChange={(e) => updateArrayField('bodyParagraphs', index, e.target.value)}
                    rows={3}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    placeholder={`Paragraph ${index + 1}`}
                  />
                  {template.bodyParagraphs.length > 1 && (
                    <button
                      onClick={() => removeArrayItem('bodyParagraphs', index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem('bodyParagraphs')}
                className="text-sm text-red-600 hover:text-red-800"
              >
                + Add Paragraph
              </button>
            </div>
          </div>

          {/* Bullet Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bullet Points (Optional)
            </label>
            <div className="space-y-2">
              {(template.bulletItems || []).map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayField('bulletItems', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    placeholder={`Bullet point ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('bulletItems', index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('bulletItems')}
                className="text-sm text-red-600 hover:text-red-800"
              >
                + Add Bullet Point
              </button>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Button Label
              </label>
              <input
                type="text"
                value={template.ctaPrimaryLabel || ''}
                onChange={(e) => setTemplate({ ...template, ctaPrimaryLabel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="e.g., Get Started"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Button URL
              </label>
              <input
                type="text"
                value={template.ctaPrimaryUrl || ''}
                onChange={(e) => setTemplate({ ...template, ctaPrimaryUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="https://... or {{variableName}}"
              />
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Button Label
              </label>
              <input
                type="text"
                value={template.ctaSecondaryLabel || ''}
                onChange={(e) => setTemplate({ ...template, ctaSecondaryLabel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="e.g., Learn More"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Button URL
              </label>
              <input
                type="text"
                value={template.ctaSecondaryUrl || ''}
                onChange={(e) => setTemplate({ ...template, ctaSecondaryUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="https://... or {{variableName}}"
              />
            </div>
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Footer Text (Optional)
            </label>
            <textarea
              value={template.footerText || ''}
              onChange={(e) => setTemplate({ ...template, footerText: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Custom footer text (use \n for line breaks)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to use default footer. Use \n for line breaks.
            </p>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
