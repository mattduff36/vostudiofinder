'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AdminTabs } from '@/components/admin/AdminTabs';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number | null;
}

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState({ question: '', answer: '' });
  const [draggedItem, setDraggedItem] = useState<FAQ | null>(null);

  // Fetch FAQs
  const fetchFAQs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/faq');
      if (!response.ok) throw new Error('Failed to fetch FAQs');
      const data = await response.json();
      setFaqs(data.faqs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  // Create new FAQ
  const handleCreate = async () => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      alert('Please fill in both question and answer');
      return;
    }

    try {
      const response = await fetch('/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Failed to create FAQ');
      
      await fetchFAQs();
      setIsAddingNew(false);
      setEditForm({ question: '', answer: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create FAQ');
    }
  };

  // Update FAQ
  const handleUpdate = async (id: string) => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      alert('Please fill in both question and answer');
      return;
    }

    try {
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Failed to update FAQ');
      
      await fetchFAQs();
      setEditingId(null);
      setEditForm({ question: '', answer: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update FAQ');
    }
  };

  // Delete FAQ
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete FAQ');
      
      await fetchFAQs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  // Start editing
  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setEditForm({ question: faq.question, answer: faq.answer });
    setIsAddingNew(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({ question: '', answer: '' });
  };

  // Drag and drop handlers
  const handleDragStart = (faq: FAQ) => {
    setDraggedItem(faq);
  };

  const handleDragOver = (e: React.DragEvent, targetFaq: FAQ) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetFaq.id) return;

    const draggedIndex = faqs.findIndex(f => f.id === draggedItem.id);
    const targetIndex = faqs.findIndex(f => f.id === targetFaq.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newFaqs = [...faqs];
    newFaqs.splice(draggedIndex, 1);
    
    // Adjust target index if dragged item was before target
    // (removing an earlier item shifts all later indices down by 1)
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newFaqs.splice(adjustedTargetIndex, 0, draggedItem);

    setFaqs(newFaqs);
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;

    // Update sort_order for all FAQs
    const reorderedFaqs = faqs.map((faq, index) => ({
      id: faq.id,
      sort_order: index + 1
    }));

    try {
      const response = await fetch('/api/admin/faq/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: reorderedFaqs })
      });

      if (!response.ok) throw new Error('Failed to reorder FAQs');
      
      await fetchFAQs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reorder FAQs');
      await fetchFAQs(); // Revert to original order
    } finally {
      setDraggedItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading FAQs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminTabs activeTab="faq" />
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage FAQs</h1>
            <p className="text-gray-600 mt-2">
              Add, edit, delete, and reorder FAQs shown on the Help page
            </p>
          </div>
          <Button
            onClick={() => {
              setIsAddingNew(true);
              setEditingId(null);
              setEditForm({ question: '', answer: '' });
            }}
            disabled={isAddingNew}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Add New FAQ
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Add New FAQ Form */}
        {isAddingNew && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Add New FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the question..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer
                </label>
                <textarea
                  value={editForm.answer}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the answer..."
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreate} className="flex items-center gap-2">
                  <Save size={16} />
                  Create FAQ
                </Button>
                <Button onClick={cancelEdit} variant="outline" className="flex items-center gap-2">
                  <X size={16} />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ List */}
        <div className="bg-white rounded-lg shadow">
          {faqs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No FAQs found. Click "Add New FAQ" to create one.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  draggable={editingId !== faq.id && !isAddingNew}
                  onDragStart={() => handleDragStart(faq)}
                  onDragOver={(e) => handleDragOver(e, faq)}
                  onDragEnd={handleDragEnd}
                  className={`p-6 transition-colors ${
                    draggedItem?.id === faq.id ? 'opacity-50' : ''
                  } ${editingId !== faq.id && !isAddingNew ? 'cursor-move hover:bg-gray-50' : ''}`}
                >
                  {editingId === faq.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question
                        </label>
                        <input
                          type="text"
                          value={editForm.question}
                          onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer
                        </label>
                        <textarea
                          value={editForm.answer}
                          onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={() => handleUpdate(faq.id)} className="flex items-center gap-2">
                          <Save size={16} />
                          Save Changes
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" className="flex items-center gap-2">
                          <X size={16} />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <GripVertical size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex gap-2">
                        <button
                          onClick={() => startEdit(faq)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit FAQ"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete FAQ"
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

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• <strong>Drag and drop</strong> FAQs to reorder them</li>
            <li>• <strong>Click Edit</strong> to modify a question or answer</li>
            <li>• <strong>Click Delete</strong> to remove an FAQ (requires confirmation)</li>
            <li>• Changes are immediately reflected on the <a href="/help" target="_blank" className="text-blue-600 hover:underline">Help page</a></li>
          </ul>
        </div>
      </div>
      </div>
    </>
  );
}
