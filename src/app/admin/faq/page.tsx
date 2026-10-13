'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useContentMutation } from '@/components/admin/useContentMutation';
import { readContentResponse } from '@/lib/admin/content-validation';
import { moveFaq, sameFaqOrder } from '@/lib/admin/faq-order';
import { Button } from '@/components/ui/Button';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

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
  const drag = useRef<{ item: FAQ; before: FAQ[] } | null>(null);

  const { busy, run, allowDiscard } = useContentMutation();
  const editorBaseline = useRef(JSON.stringify(editForm));
  const draftIsDirty = (editingId !== null || isAddingNew) && JSON.stringify(editForm) !== editorBaseline.current;
  const readEpoch = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const fetchFAQs = async () => {
    const epoch = ++readEpoch.current;
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/faq', { signal: controller.signal });
      const body = await readContentResponse(response);
      if (epoch !== readEpoch.current || controller.signal.aborted) return;
      setFaqs(body.faqs as FAQ[]); setError(null);
    } catch (error) {
      if (epoch === readEpoch.current && !controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load this list');
    } finally { if (epoch === readEpoch.current && !controller.signal.aborted) setIsLoading(false); }
  };
  useEffect(() => { void fetchFAQs(); return () => { readController.current?.abort(); readEpoch.current++; }; }, []);
  useEffect(() => { if (editingId || isAddingNew) document.getElementById('faq-question')?.focus(); }, [editingId, isAddingNew]);
  const resetEditor = () => {
    const blank = { question: '', answer: '' };
    editorBaseline.current = JSON.stringify(blank);
    setEditForm(blank); setEditingId(null); setIsAddingNew(false);
  };
  const startNew = async () => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    resetEditor(); setIsAddingNew(true);
  };
  const startEdit = async (item: FAQ) => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    const form = { question: item.question, answer: item.answer };
    editorBaseline.current = JSON.stringify(form);
    setEditForm(form); setEditingId(item.id); setIsAddingNew(false);
  };
  const cancelEdit = async () => {
    if (isLoading || !await allowDiscard(draftIsDirty)) return;
    resetEditor(); document.getElementById('faq-add')?.focus();
  };
  const save = async (id?: string) => {
    if (isLoading) return;
    if (!editForm.question.trim() || !editForm.answer.trim()) { showWarning('Please fill in both question and answer'); return; }
    await run(async () => {
      const submitted = editForm;
      setError(null);
      try {
        const response = await fetch(id ? `/api/admin/faq/${id}` : '/api/admin/faq', {
          method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submitted),
        });
        const body = await readContentResponse(response);
        const saved = body.faq as FAQ;
        setFaqs(previous => id ? previous.map(item => item.id === id ? saved : item) : [...previous, saved]);
        resetEditor(); showSuccess('FAQ saved successfully');
        document.getElementById('faq-add')?.focus();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save faq';
        setError(message); showError(message);
      }
    });
  };
  const handleCreate = () => save();
  const handleUpdate = (id: string) => save(id);
  const handleDelete = async (id: string) => {
    if (isLoading) return;
    await run(async () => {
      const confirmed = await showConfirm({ title: 'Delete FAQ?', message: 'Are you sure you want to delete this faq? This action cannot be undone.', confirmText: 'Delete', isDangerous: true });
      if (!confirmed) return;
      try {
        await readContentResponse(await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' }));
        setFaqs(previous => previous.filter(item => item.id !== id));
        showSuccess('FAQ deleted successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to delete faq';
        setError(message); showError(message);
      }
    });
  };

  const persistOrder = async (before: FAQ[], after: FAQ[]) => {
    if (sameFaqOrder(before, after) || isLoading || editingId || isAddingNew) return;
    await run(async () => {
      setFaqs(after); setError(null);
      try {
        const body = await readContentResponse(await fetch('/api/admin/faq/reorder', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ faqs: after.map((faq, index) => ({ id: faq.id, sort_order: index + 1 })), expectedOrder: before.map(faq => faq.id) }),
        }));
        setFaqs(body.faqs as FAQ[]); showSuccess('FAQs reordered successfully');
      } catch (error) {
        setFaqs(before);
        const message = error instanceof Error ? error.message : 'Unable to reorder FAQs';
        setError(message); showError(message);
      }
    });
  };
  const handleDragStart = (event: React.DragEvent, faq: FAQ) => {
    if (busy || isLoading || editingId || isAddingNew) { event.preventDefault(); return; }
    drag.current = { item: faq, before: faqs };
    event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', faq.id);
    setDraggedItem(faq);
  };
  const handleDrop = (event: React.DragEvent, target: FAQ) => {
    event.preventDefault();
    const current = drag.current;
    drag.current = null; setDraggedItem(null);
    if (!current) return;
    const from = current.before.findIndex(item => item.id === current.item.id);
    const to = current.before.findIndex(item => item.id === target.id);
    void persistOrder(current.before, moveFaq(current.before, from, to));
  };
  // Leaving the drop area or pressing Escape never persists an unaccepted drag.
  const handleDragEnd = () => { drag.current = null; setDraggedItem(null); };


  return (
    <>
      <AdminTabs activeTab="faq" />
      {isLoading && <p role="status" className="px-4 py-2 text-sm text-gray-500">Loading…</p>}
      <div className="px-4 py-4 md:p-8">
        <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage FAQs</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Add, edit, delete, and reorder FAQs shown on the Help page
            </p>
          </div>
          <Button
            onClick={startNew}
            id="faq-add"
            disabled={isAddingNew || busy || isLoading}
            className="flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <Plus size={20} />
            Add New FAQ
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p role="alert" className="text-red-800">{error}</p><Button size="sm" disabled={busy || isLoading} onClick={fetchFAQs}>Retry loading</Button>
          </div>
        )}

        {/* Add New FAQ Form */}
        {isAddingNew && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Add New FAQ</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="faq-question" className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                <input
                  disabled={busy || isLoading}
                  type="text"
                  id="faq-question"
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the question..."
                />
              </div>
              <div>
                <label htmlFor="faq-answer" className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                <textarea
                  disabled={busy || isLoading}
                  id="faq-answer"
                  value={editForm.answer}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the answer..."
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Button disabled={busy || isLoading} onClick={handleCreate} className="flex items-center gap-2 justify-center w-full md:w-auto">
                  <Save size={16} />
                  Create FAQ
                </Button>
                <Button disabled={busy || isLoading} onClick={cancelEdit} variant="outline" className="flex items-center gap-2 justify-center w-full md:w-auto">
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
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  draggable={!editingId && !isAddingNew && !busy && !isLoading}
                  onDragStart={(event) => handleDragStart(event, faq)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, faq)}
                  onDragEnd={handleDragEnd}
                  className={`p-6 transition-colors ${
                    draggedItem?.id === faq.id ? 'opacity-50' : ''
                  } ${editingId !== faq.id && !isAddingNew ? 'cursor-move hover:bg-gray-50' : ''}`}
                >
                  {editingId === faq.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="faq-question" className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                        <input
                  disabled={busy || isLoading}
                          type="text"
                          id="faq-question"
                  value={editForm.question}
                          onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="faq-answer" className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                        <textarea
                  disabled={busy || isLoading}
                          id="faq-answer"
                  value={editForm.answer}
                          onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex flex-col md:flex-row gap-3">
                        <Button disabled={busy || isLoading} onClick={() => handleUpdate(faq.id)} className="flex items-center gap-2 justify-center w-full md:w-auto">
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
                    // View Mode
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 pt-1 hidden md:block">
                        <GripVertical size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col md:flex-row gap-2">
                        <button aria-label={`Move ${faq.question} up`} disabled={busy || isLoading || !!editingId || isAddingNew || index === 0}
                          onClick={() => void persistOrder(faqs, moveFaq(faqs, index, index - 1))}
                          className="p-2 text-gray-600 disabled:opacity-30 min-h-[44px] min-w-[44px]"><ArrowUp size={18} /></button>
                        <button aria-label={`Move ${faq.question} down`} disabled={busy || isLoading || !!editingId || isAddingNew || index === faqs.length - 1}
                          onClick={() => void persistOrder(faqs, moveFaq(faqs, index, index + 1))}
                          className="p-2 text-gray-600 disabled:opacity-30 min-h-[44px] min-w-[44px]"><ArrowDown size={18} /></button>
                        <button
                          disabled={busy || isLoading}
                          onClick={() => startEdit(faq)}
                          className="p-2 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Edit FAQ"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          disabled={busy || isLoading}
                          onClick={() => handleDelete(faq.id)}
                          className="p-2 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            <li>• <strong>Drag and drop</strong> FAQs to reorder them, or use the up and down buttons</li>
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
