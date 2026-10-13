'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Lightbulb, 
  Loader2, 
  Mail, 
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  Trash2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { showSuccess, showError } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';
import { AdminTabs } from './AdminTabs';
import { AdminDrawer } from './AdminDrawer';

interface Suggestion {
  id: string;
  user_id: string;
  type: 'SUGGESTION';
  category: string;
  subject: string | null;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  users: {
    id: string;
    email: string;
    username: string;
    display_name: string;
  };
}

interface ReplyOperation {
  id: string; ticketId: string; recipient: string; message: string; providerStatus: string;
  providerId: string | null; statusResult: string; requestedStatus: string | null;
  canRecover: boolean; retryAt: string | null;
}
interface ReplyRequest {
  requestKey: string; message: string; expectedUserId: string; expectedRecipient: string;
  expectedUpdatedAt: string; updateStatus?: string;
}

export function Suggestions() {
  const { data: session } = useSession();
  const storageKey = `admin-support-drafts:${session?.user?.id ?? 'pending'}`;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [records, setRecords] = useState<Record<string, Suggestion>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const filterRef = useRef('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedSuggestion = selectedId ? records[selectedId] ?? null : null;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftsRef = useRef<Record<string, string>>({});
  const attempts = useRef<Record<string, ReplyRequest>>({});
  const [operations, setOperations] = useState<Record<string, ReplyOperation | null>>({});
  const [lookupErrors, setLookupErrors] = useState<Record<string, string>>({});
  const [lookupReady, setLookupReady] = useState<Record<string, boolean>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pending = useRef(new Set<string>());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null);
  const replyReads = useRef(new Map<string, AbortController>());
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  const closePending = useRef(false);
  const listRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const replyMessage = selectedId ? drafts[selectedId] ?? '' : '';
  const operation = selectedId ? operations[selectedId] ?? null : null;
  const sendingReply = !!selectedId && pendingIds.has(selectedId);
  const updatingStatus = sendingReply;
  const deleting = sendingReply;

  const persistDrafts = (next = draftsRef.current) => {
    if (!session?.user?.id) return false;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ drafts: next, attempts: attempts.current })); setDraftStorageError(null); return true; }
    catch { setDraftStorageError('Reply drafts could not be saved in this browser. Keep this page open until the draft is saved or copied.'); return false; }
  };
  const setDraft = (id: string, value: string) => {
    const next = { ...draftsRef.current, [id]: value };
    draftsRef.current = next; setDrafts(next); persistDrafts(next);
  };
  const setReplyMessage = (value: string) => { if (selectedId) setDraft(selectedId, value); };

  useEffect(() => {
    if (!session?.user?.id) return;
    replyReads.current.forEach(controller => controller.abort()); replyReads.current.clear();
    draftsRef.current = {}; attempts.current = {}; setDrafts({}); setOperations({}); setLookupReady({}); setLookupErrors({});
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      const restored = Object.fromEntries(Object.entries(saved.drafts ?? {}).filter(([, value]) => typeof value === 'string' && value.length <= 20_000)) as Record<string, string>;
      draftsRef.current = restored; setDrafts(restored);
      const restoredAttempts: Record<string, ReplyRequest> = {};
      for (const [id, value] of Object.entries(saved.attempts ?? {})) {
        if (!value || typeof value !== 'object') throw new Error('Invalid saved request');
        const request = value as ReplyRequest;
        if (typeof request.requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.requestKey)
          || typeof request.message !== 'string' || !request.message.trim() || request.message.length > 20_000
          || typeof request.expectedUserId !== 'string' || !request.expectedUserId
          || typeof request.expectedRecipient !== 'string' || !request.expectedRecipient.includes('@')
          || typeof request.expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(request.expectedUpdatedAt))
          || (request.updateStatus !== undefined && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(request.updateStatus))) throw new Error('Invalid saved request');
        restoredAttempts[id] = request;
      }
      attempts.current = restoredAttempts; setDraftStorageError(null);
    } catch { setDraftStorageError('Saved reply recovery details could not be restored. Check the previous reply before sending again.'); }
  }, [session?.user?.id, storageKey]);

  useEffect(() => () => { replyReads.current.forEach(controller => controller.abort()); replyReads.current.clear(); }, []);
  useEffect(() => {
    if (!draftStorageError || !Object.values(drafts).some(draft => draft.trim())) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draftStorageError, drafts]);

  const begin = (id: string) => {
    if (pending.current.has(id)) return false;
    replyReads.current.get(id)?.abort(); replyReads.current.delete(id);
    pending.current.add(id); setPendingIds(new Set(pending.current)); return true;
  };
  const finish = (id: string) => { pending.current.delete(id); setPendingIds(new Set(pending.current)); };
  const invalidateList = () => { listRequest.current.controller?.abort(); ++listRequest.current.generation; };
  const mergeTicket = (ticket: Suggestion) => {
    setRecords(current => ({ ...current, [ticket.id]: ticket }));
    setSuggestions(current => current.map(row => row.id === ticket.id ? ticket : row)
      .filter(row => filterRef.current === 'ALL' || row.status === filterRef.current));
  };

  const fetchSuggestions = useCallback(async () => {
    listRequest.current.controller?.abort();
    const generation = ++listRequest.current.generation;
    const controller = new AbortController(); listRequest.current.controller = controller;
    setLoading(true); setReadError(null);
    try {
      const params = new URLSearchParams({ type: 'SUGGESTION', sortBy: 'created_at', sortOrder: 'desc' });
      if (filterRef.current !== 'ALL') params.set('status', filterRef.current);
      const response = await fetch(`/api/admin/support-tickets?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error('Failed to load suggestions. Please retry.');
      if (generation !== listRequest.current.generation || controller.signal.aborted) return;
      setSuggestions(data.tickets);
      setRecords(current => ({ ...current, ...Object.fromEntries(data.tickets.map((ticket: Suggestion) => [ticket.id, ticket])) }));
    } catch (error) {
      if (generation === listRequest.current.generation && !controller.signal.aborted) setReadError(error instanceof Error ? error.message : 'Failed to load suggestions.');
    } finally { if (generation === listRequest.current.generation && !controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { void fetchSuggestions(); return invalidateList; }, [fetchSuggestions, filterStatus]);

  const applyOperation = (id: string, result: ReplyOperation) => {
    setOperations(current => ({ ...current, [id]: result }));
    setOperationErrors(current => ({ ...current, [id]: '' }));
    if (result.providerStatus === 'ACCEPTED' && draftsRef.current[id] === result.message) setDraft(id, '');
  };
  const loadReply = async (id: string) => {
    if (pending.current.has(id)) return;
    replyReads.current.get(id)?.abort();
    const controller = new AbortController(); replyReads.current.set(id, controller);
    setLookupErrors(current => ({ ...current, [id]: '' }));
    try {
      const request = attempts.current[id];
      const response = await fetch(`/api/admin/support-tickets/${id}/reply${request ? `?operationId=${encodeURIComponent(request.requestKey)}` : ''}`, { signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted || replyReads.current.get(id) !== controller) return;
      // A lost POST may still arrive: keep its original key/payload for a retry.
      if (response.status === 404 && request) {
        applyOperation(id, { id: request.requestKey, ticketId: id, recipient: request.expectedRecipient, message: request.message,
          providerStatus: 'PREPARED', providerId: null, statusResult: 'PENDING', requestedStatus: request.updateStatus ?? null, canRecover: true, retryAt: null });
      } else {
        if (!response.ok) throw new Error('Could not check the previous reply. Retry before sending.');
        if (data.operation) applyOperation(id, data.operation);
        else setOperations(current => ({ ...current, [id]: null }));
      }
      setLookupReady(current => ({ ...current, [id]: true }));
    } catch (error) {
      if (!controller.signal.aborted && replyReads.current.get(id) === controller) setLookupErrors(current => ({ ...current, [id]: error instanceof Error ? error.message : 'Reply lookup failed.' }));
    } finally { if (replyReads.current.get(id) === controller) replyReads.current.delete(id); }
  };

  const selectSuggestion = (id: string) => {
    setSelectedId(id); setMobileDrawerOpen(true);
    if (!lookupReady[id]) void loadReply(id);
  };
  const closeDrawer = async () => {
    if (closePending.current) return;
    closePending.current = true;
    try {
      if (selectedId && draftsRef.current[selectedId]?.trim()) {
        const answer = await showUnsavedChangesDialog();
        if (answer === 'cancel') return;
        if (answer === 'discard') setDraft(selectedId, '');
        if (answer === 'save' && !persistDrafts()) { showError('The draft could not be saved in this browser. Keep this window open.'); return; }
      }
      setMobileDrawerOpen(false);
    } finally { closePending.current = false; }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!begin(id)) return;
    invalidateList();
    try {
      const response = await fetch(`/api/admin/support-tickets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');
      mergeTicket(data.ticket); showSuccess('Status updated successfully'); void fetchSuggestions();
    } catch (error) { showError(error instanceof Error ? error.message : 'Failed to update status'); setLoading(false); }
    finally { finish(id); }
  };

  const submitAttempt = async (id: string, request: ReplyRequest | { action: 'recover'; operationId: string }, statusOnly = false) => {
    invalidateList();
    const response = await fetch(`/api/admin/support-tickets/${id}/reply`, {
      method: statusOnly ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusOnly ? { operationId: 'operationId' in request ? request.operationId : request.requestKey } : request),
    });
    const data = await response.json();
    if (!response.ok) {
      if (!statusOnly && 'requestKey' in request && [400, 404, 409].includes(response.status)) {
        const check = await fetch(`/api/admin/support-tickets/${id}/reply?operationId=${encodeURIComponent(request.requestKey)}`);
        if (check.status === 404) {
          delete attempts.current[id]; persistDrafts();
          setOperations(current => ({ ...current, [id]: null }));
          void fetchSuggestions();
        } else if (check.ok) {
          const recovered = await check.json();
          if (recovered.operation) applyOperation(id, recovered.operation);
        }
      }
      throw new Error(data.error || 'Reply outcome unavailable. Recover this operation before another send.');
    }
    applyOperation(id, data.operation);
    if (data.ticket) mergeTicket(data.ticket);
    if (data.operation.providerStatus === 'ACCEPTED') showSuccess('Reply accepted by the email provider');
    void fetchSuggestions();
  };

  const handleSendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSuggestion || !replyMessage.trim() || !lookupReady[selectedSuggestion.id] || operation) return;
    const target = selectedSuggestion;
    const message = replyMessage.trim();
    if (!begin(target.id)) return;
    try {
      const confirmed = await showConfirm({ title: 'Send reply?', message: `Send the displayed reply to ${target.users.email}?`, confirmText: 'Send Reply' });
      if (!confirmed) return;
      const request: ReplyRequest = { requestKey: crypto.randomUUID(), message, expectedUserId: target.user_id,
        expectedRecipient: target.users.email.toLowerCase().trim(), expectedUpdatedAt: target.updated_at,
        ...(target.status === 'OPEN' ? { updateStatus: 'IN_PROGRESS' } : {}) };
      attempts.current[target.id] = request;
      if (!persistDrafts()) { delete attempts.current[target.id]; throw new Error('Recovery details could not be saved in this browser. The reply has not been sent.'); }
      applyOperation(target.id, { id: request.requestKey, ticketId: target.id, recipient: request.expectedRecipient, message,
        providerStatus: 'SUBMITTING', providerId: null, statusResult: 'PENDING', requestedStatus: request.updateStatus ?? null, canRecover: true, retryAt: null });
      await submitAttempt(target.id, request);
    } catch (error) { setOperationErrors(current => ({ ...current, [target.id]: error instanceof Error ? error.message : 'Reply outcome unavailable.' })); setLoading(false); }
    finally { finish(target.id); }
  };

  const recoverOperation = async (statusOnly = false) => {
    if (!selectedId || !operation || !begin(selectedId)) return;
    const id = selectedId;
    try {
      // A known prepared local attempt keeps its exact original payload/key.
      const request = operation.providerStatus === 'PREPARED' && attempts.current[id] ? attempts.current[id]!
        : { action: 'recover' as const, operationId: operation.id };
      await submitAttempt(id, request, statusOnly);
    } catch (error) { setOperationErrors(current => ({ ...current, [id]: error instanceof Error ? error.message : 'Recovery failed.' })); setLoading(false); }
    finally { finish(id); }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!begin(id)) return;
    try {
      const confirmed = await showConfirm({ title: 'Delete Suggestion?', message: 'This will permanently delete this suggestion. This action cannot be undone.', confirmText: 'Delete Suggestion', isDangerous: true });
      if (!confirmed) return;
      invalidateList();
      const response = await fetch(`/api/admin/support-tickets/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete suggestion');
      setSuggestions(current => current.filter(row => row.id !== id));
      setRecords(current => { const next = { ...current }; delete next[id]; return next; });
      setSelectedId(current => current === id ? null : current);
      setDraft(id, ''); showSuccess('Suggestion deleted successfully'); void fetchSuggestions();
    } catch (error) { showError(error instanceof Error ? error.message : 'Failed to delete suggestion'); setLoading(false); }
    finally { finish(id); }
  };

  const replyFeedback = () => selectedId && <div className="mb-3 space-y-2 text-xs">
    {draftStorageError && <p role="alert" className="text-red-700">{draftStorageError}</p>}
    <p>Recipient: <strong>{selectedSuggestion?.users.email}</strong></p>
    {!lookupReady[selectedId] && !lookupErrors[selectedId] && <p role="status">Checking previous reply…</p>}
    {lookupErrors[selectedId] && <p role="alert" className="text-red-700">{lookupErrors[selectedId]} <button type="button" className="underline" onClick={() => void loadReply(selectedId)}>Retry lookup</button></p>}
    {operationErrors[selectedId] && <p role="alert" className="text-red-700">{operationErrors[selectedId]}</p>}
    {operation && <div className="rounded border bg-gray-50 p-2 space-y-2" role="status">
      <p>{operation.providerStatus === 'ACCEPTED' ? `Reply accepted by the email provider for ${operation.recipient}. Inbox delivery is not confirmed.`
        : operation.providerStatus === 'REJECTED' ? 'The provider did not accept this reply.'
        : operation.providerStatus === 'REVIEW_REQUIRED' || !operation.canRecover ? 'The reply outcome needs provider evidence before another send.'
        : 'A reply operation is pending or its outcome is uncertain. Recover it before sending another reply.'}</p>
      {operation.providerStatus === 'ACCEPTED' && ['PENDING', 'FAILED'].includes(operation.statusResult) && <><p>The email was accepted, but the suggestion status still needs updating.</p><button type="button" disabled={sendingReply} className="underline" onClick={() => void recoverOperation(true)}>Retry status only</button></>}
      {operation.statusResult === 'CONFLICT' && <p>The suggestion changed after this reply was prepared. Its newer status has been kept.</p>}
      {operation.canRecover && operation.providerStatus !== 'ACCEPTED' && <button type="button" disabled={sendingReply} className="underline" onClick={() => void recoverOperation()}>Recover existing reply</button>}
      {['ACCEPTED', 'REJECTED'].includes(operation.providerStatus) && <button type="button" disabled={sendingReply} className="underline" onClick={() => { delete attempts.current[selectedId]; persistDrafts(); setOperations(current => ({ ...current, [selectedId]: null })); }}>Write another reply</button>}
    </div>}
  </div>;

  const getStatusBadge = (status: string) => {
    const styles = {
      OPEN: 'bg-blue-100 text-blue-700 border-blue-300',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      RESOLVED: 'bg-green-100 text-green-700 border-green-300',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    const icons = {
      OPEN: Clock,
      IN_PROGRESS: Loader2,
      RESOLVED: CheckCircle2,
      CLOSED: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center space-x-1 ${styles[status as keyof typeof styles] || styles.OPEN}`}>
        <Icon className="w-3 h-3" />
        <span>{status.replace('_', ' ')}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[priority as keyof typeof styles] || styles.MEDIUM}`}>
        {priority}
      </span>
    );
  };

  return (
    <>
      <AdminTabs activeTab="suggestions" />

      <div className="px-4 py-4 md:p-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Suggestions</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Review user suggestions and feature requests
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => { filterRef.current = e.target.value; setFilterStatus(e.target.value); }}
                  aria-label="Suggestion status"
                  className="text-sm px-2.5 md:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C060B]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="text-xs md:text-sm text-gray-600 flex-shrink-0">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {readError && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{readError} <button className="underline" onClick={() => void fetchSuggestions()}>Retry</button></div>}
          {loading && suggestions.length > 0 && <p role="status" className="mb-2 text-sm text-gray-500">Refreshing suggestions…</p>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Suggestions List */}
            <div className="lg:col-span-2 space-y-3">
              {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[#9C060B]" />
                </div>
              ) : suggestions.length === 0 && !readError ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No suggestions found</p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.id}
                    onClick={() => selectSuggestion(suggestion.id)}
                    aria-pressed={selectedId === suggestion.id}
                    className={`w-full text-left bg-white rounded-lg border cursor-pointer transition-all ${
                      selectedSuggestion?.id === suggestion.id
                        ? 'border-[#9C060B] shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-3 md:p-4">
                      <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
                        <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                          <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0" />
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                            {suggestion.category}
                          </h3>
                        </div>
                        {getStatusBadge(suggestion.status)}
                      </div>

                      <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3 line-clamp-2">
                        {suggestion.message}
                      </p>

                      <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500 gap-2">
                        <div className="flex items-center gap-2 md:space-x-3 min-w-0 truncate">
                          <span className="truncate">{suggestion.users.display_name}</span>
                          <span className="flex items-center space-x-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(suggestion.created_at).toLocaleDateString('en-GB')}</span>
                          </span>
                        </div>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Desktop Detail & Reply Panel - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              {selectedSuggestion ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-4">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-semibold text-gray-900">
                          Suggestion Details
                        </h3>
                      </div>
                      {getStatusBadge(selectedSuggestion.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">From:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.users.display_name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <span className="ml-2 text-gray-600">{selectedSuggestion.users.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Priority:</span>
                        <span className="ml-2">{getPriorityBadge(selectedSuggestion.priority)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(selectedSuggestion.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSuggestion.message}</p>
                  </div>

                  <div className="p-4 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Status
                    </label>
                    <select
                      aria-label="Change suggestion status"
                      value={selectedSuggestion.status}
                      onChange={(e) => handleUpdateStatus(selectedSuggestion.id, e.target.value)}
                      disabled={updatingStatus}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C060B]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div className="p-4 border-b border-gray-200">
                    <button
                      onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                      disabled={deleting}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Suggestion</span>
                        </>
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSendReply} className="p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reply via Email
                    </label>
                    {replyFeedback()}
                    <textarea
                      aria-label="Reply message"
                      maxLength={20000}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={6}
                      placeholder="Type your reply message..."
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C060B] mb-3"
                      disabled={sendingReply}
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyMessage.trim() || !!operation || !selectedId || !lookupReady[selectedId]}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-[#9C060B] rounded-md hover:bg-[#680407] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  Select a suggestion to view details and reply
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Suggestion Details Drawer */}
      <AdminDrawer
        isOpen={mobileDrawerOpen && !!selectedSuggestion}
        onClose={() => void closeDrawer()}
        breakpoint="lg"
        title="Suggestion Details"
        showBackButton
      >
        {selectedSuggestion && (
          <div className="p-4 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">Suggestion</span>
              </div>
              {getStatusBadge(selectedSuggestion.status)}
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2 text-gray-900">{selectedSuggestion.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">From:</span>
                  <span className="ml-2 text-gray-900">{selectedSuggestion.users.display_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900 break-words">{selectedSuggestion.users.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <span className="ml-2">{getPriorityBadge(selectedSuggestion.priority)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Submitted:</span>
                  <span className="ml-2 text-gray-900 text-xs">
                    {new Date(selectedSuggestion.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSuggestion.message}</p>
            </div>

            {/* Change Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Status
              </label>
              <select
                aria-label="Change suggestion status"
                      value={selectedSuggestion.status}
                onChange={(e) => handleUpdateStatus(selectedSuggestion.id, e.target.value)}
                disabled={updatingStatus}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C060B]"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Delete Button */}
            <div>
              <button
                onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                disabled={deleting}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Suggestion</span>
                  </>
                )}
              </button>
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Reply via Email
              </label>
              {replyFeedback()}
              <textarea
                aria-label="Reply message"
                maxLength={20000}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                placeholder="Type your reply message..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C060B]"
                disabled={sendingReply}
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim() || !!operation || !selectedId || !lookupReady[selectedId]}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#9C060B] rounded-md hover:bg-[#680407] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {sendingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </AdminDrawer>
    </>
  );
}
