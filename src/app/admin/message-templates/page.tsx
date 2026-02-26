'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
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

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/message-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!editForm.label.trim() || !editForm.body.trim()) {
      showWarning('Please fill in both label and message body');
      return;
    }

    try {
      const response = await fetch('/api/admin/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to create template');

      await fetchTemplates();
      setIsAddingNew(false);
      setEditForm({ label: '', body: '' });
      showSuccess('Template created successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.label.trim() || !editForm.body.trim()) {
      showWarning('Please fill in both label and message body');
      return;
    }

    try {
      const response = await fetch(`/api/admin/message-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update template');

      await fetchTemplates();
      setEditingId(null);
      setEditForm({ label: '', body: '' });
      showSuccess('Template updated successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Template?',
      message: 'Are you sure you want to delete this message template? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/message-templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      await fetchTemplates();
      showSuccess('Template deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const startEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setEditForm({ label: template.label, body: template.body });
    setIsAddingNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({ label: '', body: '' });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminTabs activeTab="message_templates" />
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
              onClick={() => {
                setIsAddingNew(true);
                setEditingId(null);
                setEditForm({ label: '', body: '' });
              }}
              disabled={isAddingNew}
              className="flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus size={20} />
              Add Template
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isAddingNew && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">New Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label (shown in dropdown)
                  </label>
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Content too light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Body
                  </label>
                  <textarea
                    value={editForm.body}
                    onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the message body..."
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <Button onClick={handleCreate} className="flex items-center gap-2 justify-center w-full md:w-auto">
                    <Save size={16} />
                    Create Template
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" className="flex items-center gap-2 justify-center w-full md:w-auto">
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Label (shown in dropdown)
                          </label>
                          <input
                            type="text"
                            value={editForm.label}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message Body
                          </label>
                          <textarea
                            value={editForm.body}
                            onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                          <Button onClick={() => handleUpdate(template.id)} className="flex items-center gap-2 justify-center w-full md:w-auto">
                            <Save size={16} />
                            Save Changes
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" className="flex items-center gap-2 justify-center w-full md:w-auto">
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
                            onClick={() => startEdit(template)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Edit template"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
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
