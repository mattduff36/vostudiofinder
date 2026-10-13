import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Suggestions } from '@/components/admin/Suggestions';
import { showConfirm } from '@/components/ui/ConfirmDialog';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'admin-fixture', role: 'ADMIN' } } }) }));
jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
// The root overlay suite covers real breakpoints/focus; these tests isolate reply identity.
jest.mock('@/components/admin/AdminDrawer', () => ({ AdminDrawer: () => null }));
jest.mock('@/components/ui/ConfirmDialog', () => ({ showConfirm: jest.fn() }));
jest.mock('@/components/ui/UnsavedChangesDialog', () => ({ showUnsavedChangesDialog: jest.fn() }));
jest.mock('@/lib/toast', () => ({ showSuccess: jest.fn(), showError: jest.fn() }));
const makeTicket = (id: string) => ({ id, user_id: `user-${id}`, type: 'SUGGESTION', category: `Category ${id}`, subject: null,
  message: `Original message ${id}`, status: 'OPEN', priority: 'MEDIUM', created_at: '2026-10-12T18:00:00Z', updated_at: '2026-10-12T18:00:00Z', resolved_at: null,
  users: { id: `user-${id}`, email: `${id.toLowerCase()}@example.test`, username: id, display_name: `Customer ${id}` } });
const tickets = [makeTicket('A'), makeTicket('B')];
const json = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
let fetchMock: jest.Mock;
const operation = (id: string, key: string, message: string, providerStatus = 'ACCEPTED') => ({ id: key, ticketId: id, recipient: `${id.toLowerCase()}@example.test`, message, providerStatus,
  providerId: providerStatus === 'ACCEPTED' ? 'email-fixture' : null, statusResult: 'APPLIED', requestedStatus: 'IN_PROGRESS', canRecover: providerStatus === 'UNKNOWN', retryAt: null });
beforeEach(() => {
  sessionStorage.clear(); jest.clearAllMocks(); (showConfirm as jest.Mock).mockResolvedValue(true);
  fetchMock = jest.fn(async (url: string) => {
    if (url.includes('support-tickets?')) return json({ tickets });
    if (url.includes('/reply')) return json({ operation: null });
    throw new Error('Unexpected fixture request');
  }); global.fetch = fetchMock;
});
const select = async (id: string) => { fireEvent.click(await screen.findByRole('button', { name: new RegExp(`Category ${id}`) })); };
const edit = (text: string) => fireEvent.change(screen.getByRole('textbox', { name: 'Reply message' }), { target: { value: text } });

it('keeps A/B drafts and the submitted recipient separate when the selection changes during a reply', async () => {
  const sent = deferred<any>(); let captured: any;
  const baseline = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      captured = JSON.parse(String(init.body));
      expect(url).toContain('/B/reply');
      const saved = JSON.parse(sessionStorage.getItem('admin-support-drafts:admin-fixture')!);
      expect(saved.attempts.B).toEqual(captured); // persisted before dispatch
      return sent.promise;
    }
    return baseline(url, init);
  });
  render(<Suggestions />);
  await select('A'); edit('Draft for A');
  await select('B'); edit('Reply for B');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send Reply' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));
  await waitFor(() => expect(captured?.expectedRecipient).toBe('b@example.test'));
  await select('A');
  expect(screen.getByRole('textbox', { name: 'Reply message' })).toHaveValue('Draft for A');
  await act(async () => sent.resolve(json({ operation: operation('B', captured.requestKey, 'Reply for B'), ticket: { ...tickets[1], status: 'IN_PROGRESS' } })));
  expect(screen.getByRole('textbox', { name: 'Reply message' })).toHaveValue('Draft for A');
  await select('B');
  expect(screen.getByRole('textbox', { name: 'Reply message' })).toHaveValue('');
  expect(screen.getByText(/accepted by the email provider for b@example.test/)).toBeInTheDocument();
});

it('ignores an obsolete reply lookup for the same selected suggestion', async () => {
  const oldRead = deferred<any>(); const newerRead = deferred<any>(); let aReads = 0;
  const baseline = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => url.includes('/A/reply') ? (++aReads === 1 ? oldRead.promise : newerRead.promise) : baseline(url, init));
  render(<Suggestions />);
  await select('A'); await select('B'); await select('A');
  await act(async () => newerRead.resolve(json({ operation: operation('A', 'op-a', 'Prior accepted reply') })));
  await act(async () => oldRead.resolve(json({ operation: null })));
  expect(screen.getByText(/accepted by the email provider for a@example.test/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send Reply' })).toBeDisabled();
});

it('reloads an ambiguous operation and recovers that identity instead of creating a new reply', async () => {
  let savedRequest: any; let recoverBody: any;
  const baseline = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { savedRequest = JSON.parse(String(init.body)); throw new Error('Fixture lost HTTP response'); }
    return baseline(url, init);
  });
  const first = render(<Suggestions />); await select('A'); edit('Frozen reply');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send Reply' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));
  await screen.findByText('Fixture lost HTTP response'); first.unmount();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      recoverBody = JSON.parse(String(init.body));
      return json({ operation: operation('A', savedRequest.requestKey, 'Frozen reply'), ticket: tickets[0] });
    }
    if (url.includes('/A/reply')) return json({ operation: operation('A', savedRequest.requestKey, 'Frozen reply', 'UNKNOWN') });
    return baseline(url, init);
  });
  render(<Suggestions />); await select('A');
  fireEvent.click(await screen.findByRole('button', { name: 'Recover existing reply' }));
  await waitFor(() => expect(recoverBody).toEqual({ action: 'recover', operationId: savedRequest.requestKey }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Reply message' })).toHaveValue(''));
});
