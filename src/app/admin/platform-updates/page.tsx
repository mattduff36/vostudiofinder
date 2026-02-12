'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';
import type { PlatformUpdateCategory } from '@prisma/client';

interface PlatformUpdate {
  id: string;
  title: string | null;
  description: string;
  category: PlatformUpdateCategory;
  release_date: string;
  is_highlighted: boolean;
}

interface PlatformUpdateFormState {
  title: string;
  description: string;
  category: PlatformUpdateCategory;
  release_date: string;
  is_highlighted: boolean;
}

const CATEGORIES: { value: PlatformUpdateCategory; label: string }[] = [
  { value: 'FEATURE', label: 'Feature' },
  { value: 'IMPROVEMENT', label: 'Improvement' },
  { value: 'FIX', label: 'Fix' },
  { value: 'SECURITY', label: 'Security' },
];

function formatReleaseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminPlatformUpdatesPage() {
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<PlatformUpdateFormState>({
    title: '',
    description: '',
    category: 'IMPROVEMENT',
    release_date: new Date().toISOString().split('T')[0] ?? '',
    is_highlighted: false,
  });

  const fetchUpdates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/platform-updates');
      if (!response.ok) throw new Error('Failed to fetch platform updates');
      const data = await response.json();
      setUpdates(data.updates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform updates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleCreate = async () => {
    if (!editForm.description.trim()) {
      showWarning('Please fill in the description');
      return;
    }

    try {
      const response = await fetch('/api/admin/platform-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim() || null,
          description: editForm.description.trim(),
          category: editForm.category,
          release_date: editForm.release_date,
          is_highlighted: editForm.is_highlighted,
        }),
      });

      if (!response.ok) throw new Error('Failed to create platform update');

      await fetchUpdates();
      setIsAddingNew(false);
      setEditForm({
        title: '',
        description: '',
        category: 'IMPROVEMENT',
        release_date: new Date().toISOString().split('T')[0] ?? '',
        is_highlighted: false,
      });
      showSuccess('Platform update created successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create platform update');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.description.trim()) {
      showWarning('Please fill in the description');
      return;
    }

    try {
      const response = await fetch(`/api/admin/platform-updates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim() || null,
          description: editForm.description.trim(),
          category: editForm.category,
          release_date: editForm.release_date,
          is_highlighted: editForm.is_highlighted,
        }),
      });

      if (!response.ok) throw new Error('Failed to update platform update');

      await fetchUpdates();
      setEditingId(null);
      setEditForm({
        title: '',
        description: '',
        category: 'IMPROVEMENT',
        release_date: new Date().toISOString().split('T')[0] ?? '',
        is_highlighted: false,
      });
      showSuccess('Platform update updated successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update platform update');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete platform update?',
      message: 'Are you sure you want to delete this update? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/platform-updates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete platform update');

      await fetchUpdates();
      showSuccess('Platform update deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete platform update');
    }
  };

  const startEdit = (update: PlatformUpdate) => {
    setEditingId(update.id);
    const datePart = update.release_date.split('T')[0] ?? new Date().toISOString().split('T')[0] ?? '';
    setEditForm({
      title: update.title || '',
      description: update.description,
      category: update.category,
      release_date: datePart,
      is_highlighted: update.is_highlighted,
    });
    setIsAddingNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({
      title: '',
      description: '',
      category: 'IMPROVEMENT',
      release_date: new Date().toISOString().split('T')[0] ?? '',
      is_highlighted: false,
    });
  };

  const getCategoryLabel = (category: PlatformUpdateCategory) =>
    CATEGORIES.find((c) => c.value === category)?.label ?? category;

  if (isLoading) {
    return (
      <>
        <AdminTabs activeTab="platform_updates" />
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Loading platform updates...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTabs activeTab="platform_updates" />
      <div className="px-4 py-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Manage What&apos;s New
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                Add, edit, and delete platform updates shown in the What&apos;s New modal
              </p>
            </div>
            <Button
              onClick={() => {
                setIsAddingNew(true);
                setEditingId(null);
              setEditForm({
                title: '',
                description: '',
                category: 'IMPROVEMENT',
                release_date: new Date().toISOString().split('T')[0] ?? '',
                is_highlighted: false,
              });
            }}
              disabled={isAddingNew}
              className="flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus size={20} />
              Add Update
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isAddingNew && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Add New Update</h3>
              <PlatformUpdateForm
                form={editForm}
                setForm={setEditForm}
                onSubmit={handleCreate}
                onCancel={cancelEdit}
                submitLabel="Create Update"
              />
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            {updates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No platform updates yet. Click &quot;Add Update&quot; to create one.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {updates.map((update) => (
                  <div key={update.id} className="p-6">
                    {editingId === update.id ? (
                      <div className="space-y-4">
                        <PlatformUpdateForm
                          form={editForm}
                          setForm={setEditForm}
                          onSubmit={() => handleUpdate(update.id)}
                          onCancel={cancelEdit}
                          submitLabel="Save Changes"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                              {getCategoryLabel(update.category)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatReleaseDate(update.release_date)}
                            </span>
                            {update.is_highlighted && (
                              <span className="text-xs text-amber-600 font-medium">Highlighted</span>
                            )}
                          </div>
                          {update.title && (
                            <h3 className="text-base font-semibold text-gray-900 mb-1">
                              {update.title}
                            </h3>
                          )}
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {update.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col md:flex-row gap-2">
                          <button
                            onClick={() => startEdit(update)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(update.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete"
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

          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Use one line per bullet point in the description (newlines become bullets)</li>
              <li>• Release date determines display order (newest first)</li>
              <li>• Highlighted updates get a subtle amber background in the modal</li>
              <li>• Changes appear in the What&apos;s New modal (accessible from the hamburger menu)</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

interface PlatformUpdateFormState {
  title: string;
  description: string;
  category: PlatformUpdateCategory;
  release_date: string;
  is_highlighted: boolean;
}

interface PlatformUpdateFormProps {
  form: PlatformUpdateFormState;
  setForm: React.Dispatch<React.SetStateAction<PlatformUpdateFormState>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

function PlatformUpdateForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
}: PlatformUpdateFormProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. Improvements"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (one line per bullet)
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Added a new feature...&#10;Fixed an issue with..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={form.category}
          onChange={(e) =>
            setForm((f) => ({ ...f, category: e.target.value as PlatformUpdateCategory }))
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Release date</label>
        <input
          type="date"
          value={form.release_date}
          onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_highlighted"
          checked={form.is_highlighted}
          onChange={(e) => setForm((f) => ({ ...f, is_highlighted: e.target.checked }))}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_highlighted" className="text-sm font-medium text-gray-700">
          Highlight this update
        </label>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={onSubmit} className="flex items-center gap-2 justify-center w-full md:w-auto">
          <Save size={16} />
          {submitLabel}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex items-center gap-2 justify-center w-full md:w-auto"
        >
          <X size={16} />
          Cancel
        </Button>
      </div>
    </>
  );
}
