'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useContentMutation } from '@/components/admin/useContentMutation';
import { readContentResponse } from '@/lib/admin/content-validation';
import { Button } from '@/components/ui/Button';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface MessageTemplate {
  id: string;
  label: string;
  body: string;
  sort_order: number;
}

export default function AdminMessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState({ label: '', body: '' });

  const { busy, run, allowDiscard } = useContentMutation();
  const editorBaseline = useRef(JSON.stringify(editForm));
  const draftIsDirty = (editingId !== null || isAddingNew) && JSON.stringify(editForm) !== editorBaseline.current;
  const readEpoch = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const fetchTemplates = async () => {
    const epoch = ++readEpoch.current;
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/message-templates', { signal: controller.signal });
      const body = await readContentResponse(response);
      if (epoch !== readEpoch.current || controller.signal.aborted) return;
      setTemplates(body.templates as MessageTemplate[]); setError(null);
    } catch (error) {
      if (epoch === readEpoch.current && !controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load this list');
    } finally { if (epoch === readEpoch.current && !controller.signal.aborted) setIsLoading(false); }
  };
  useEffect(() => { void fetchTemplates(); return () => { readController.current?.abort(); readEpoch.current++; }; }, []);
  useEffect(() => { if (editingId || isAddingNew) document.getElementById('message-templates-label')?.focus(); }, [editingId, isAddingNew]);
  const resetEditor = () => {
    const blank = { label: '', body: '' };
    editorBaseline.current = JSON.stringify(blank);
    setEditForm(blank); setEditingId(null); setIsAddingNew(false);
  };
  const startNew = async () => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    resetEditor(); setIsAddingNew(true);
  };
  const startEdit = async (item: MessageTemplate) => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    const form = { label: item.label, body: item.body };
    editorBaseline.current = JSON.stringify(form);
    setEditForm(form); setEditingId(item.id); setIsAddingNew(false);
  };
  const cancelEdit = async () => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    resetEditor(); document.getElementById('message-templates-add')?.focus();
  };
  const save = async (id?: string) => {
    if (isLoading) return;
    if (!editForm.label.trim() || !editForm.body.trim()) { showWarning('Please fill in both label and message body'); return; }
    await run(async () => {
      const submitted = editForm;
      setError(null);
      try {
        const response = await fetch(id ? `/api/admin/message-templates/${id}` : '/api/admin/message-templates', {
          method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submitted),
        });
        const body = await readContentResponse(response);
        const saved = body.template as MessageTemplate;
        setTemplates(previous => id ? previous.map(item => item.id === id ? saved : item) : [...previous, saved]);
        resetEditor(); showSuccess('Template saved successfully');
        document.getElementById('message-templates-add')?.focus();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save template';
        setError(message); showError(message);
      }
    });
  };
  const handleCreate = () => save();
  const handleUpdate = (id: string) => save(id);
  const handleDelete = async (id: string) => {
    if (isLoading) return;
    await run(async () => {
      const confirmed = await showConfirm({ title: 'Delete Template?', message: 'Are you sure you want to delete this template? This action cannot be undone.', confirmText: 'Delete', isDangerous: true });
      if (!confirmed) return;
      try {
        await readContentResponse(await fetch(`/api/admin/message-templates/${id}`, { method: 'DELETE' }));
        setTemplates(previous => previous.filter(item => item.id !== id));
        showSuccess('Template deleted successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to delete template';
        setError(message); showError(message);
      }
    });
  };


  return (
    <>
      <AdminTabs activeTab="message_templates" />
      {isLoading && <p role="status" className="px-4 py-2 text-sm text-gray-500">Loading…</p>}
      <div className="px-4 py-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Message Templates</h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                Pre-filled messages available in the &quot;Message As Admin&quot; modal
              </p>
            </div>
            <Button
              onClick={startNew}
            id="message-templates-add"
            disabled={isAddingNew || busy || isLoading}
              className="flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus size={20} />
              Add Template
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p role="alert" className="text-red-800">{error}</p><Button size="sm" disabled={busy || isLoading} onClick={fetchTemplates}>Retry loading</Button>
            </div>
          )}

          {isAddingNew && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">New Template</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="message-templates-label" className="block text-sm font-medium text-gray-700 mb-2">Label (shown in dropdown)</label>
                  <input
                  disabled={busy || isLoading}
                    type="text"
                    id="message-templates-label"
                  value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Content too light"
                  />
                </div>
                <div>
                  <label htmlFor="message-templates-body" className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                  <textarea
                  disabled={busy || isLoading}
                    id="message-templates-body"
                  value={editForm.body}
                    onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the message body..."
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <Button disabled={busy || isLoading} onClick={handleCreate} className="flex items-center gap-2 justify-center w-full md:w-auto">
                    <Save size={16} />
                    Create Template
                  </Button>
                  <Button disabled={busy || isLoading} onClick={cancelEdit} variant="outline" className="flex items-center gap-2 justify-center w-full md:w-auto">
                    <X size={16} />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No message templates found. Click &quot;Add Template&quot; to create one.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <div key={template.id} className="p-6">
                    {editingId === template.id ? (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="message-templates-label" className="block text-sm font-medium text-gray-700 mb-2">Label (shown in dropdown)</label>
                          <input
                  disabled={busy || isLoading}
                            type="text"
                            id="message-templates-label"
                  value={editForm.label}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label htmlFor="message-templates-body" className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                          <textarea
                  disabled={busy || isLoading}
                            id="message-templates-body"
                  value={editForm.body}
                            onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                          <Button disabled={busy || isLoading} onClick={() => handleUpdate(template.id)} className="flex items-center gap-2 justify-center w-full md:w-auto">
                            <Save size={16} />
                            Save Changes
                          </Button>
                          <Button disabled={busy || isLoading} onClick={cancelEdit} variant="outline" className="flex items-center gap-2 justify-center w-full md:w-auto">
                            <X size={16} />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                            {template.label}
                          </h3>
                          <p className="text-sm md:text-base text-gray-600 whitespace-pre-wrap">
                            {template.body}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col md:flex-row gap-2">
                          <button
                          disabled={busy || isLoading}
                            onClick={() => startEdit(template)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Edit template"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                          disabled={busy || isLoading}
                            onClick={() => handleDelete(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete template"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
