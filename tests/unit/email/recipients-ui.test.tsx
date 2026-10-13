import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecipientsPage from '@/app/admin/emails/recipients/page';

jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const recipient = (id: string) => ({ id, email: `${id}@example.invalid`, username: id, display_name: id, email_verified: true, status: 'ACTIVE', created_at: '2026-10-13T00:00:00Z', last_login: null, studio_profiles: null, email_preferences: null });
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(r => { resolve = r; }), resolve: (value: T) => resolve(value) }; }
let fetchMock: jest.Mock;

beforeEach(() => {
  sessionStorage.clear(); mockPush.mockReset(); window.history.replaceState(null, '', '/admin/emails/recipients');
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000001' });
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return json({ matchingCount: JSON.parse(String(init.body)).userIds.length });
    const second = new URL(url, 'http://localhost').searchParams.get('page') === '2';
    return json({ users: second ? [recipient('c'), recipient('d')] : [recipient('a'), recipient('b')], pagination: { total: 52, totalPages: 2 } });
  });
  global.fetch = fetchMock;
});

test('page selection uses intersections and keeps selected IDs outside the visible page', async () => {
  render(<RecipientsPage />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select a@example.invalid' }));
  expect(screen.getByRole('checkbox', { name: 'Select all users on this page' })).toBePartiallyChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('checkbox', { name: 'Select a@example.invalid' })).toBeDisabled();
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select c@example.invalid' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all users on this page' }));
  expect(screen.getByRole('checkbox', { name: 'Select all users on this page' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all users on this page' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create from selected' }));
  const saved = JSON.parse(sessionStorage.getItem('email-audience:00000000-0000-4000-8000-000000000001')!);
  expect(saved).toEqual({ mode: 'selected', userIds: ['a'] });
  expect(mockPush).toHaveBeenCalledWith('/admin/emails/campaigns/create?audience=00000000-0000-4000-8000-000000000001');
});

test('a late search response cannot replace a newer result or re-enable actions early', async () => {
  const older = deferred<ReturnType<typeof json>>(); const newer = deferred<ReturnType<typeof json>>();
  const baseline = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const search = new URL(url, 'http://localhost').searchParams.get('search');
    return search === 'older' ? older.promise : search === 'newer' ? newer.promise : baseline(url, init);
  });
  render(<RecipientsPage />); await screen.findByRole('checkbox', { name: 'Select a@example.invalid' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'older' } });
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=older'))).toBe(true));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'newer' } });
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=newer'))).toBe(true));
  await act(async () => older.resolve(json({ users: [recipient('obsolete')], pagination: { total: 1, totalPages: 1 } })));
  expect(screen.queryByText('obsolete@example.invalid')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create Campaign from Filters' })).toBeDisabled();
  await act(async () => newer.resolve(json({ users: [recipient('current')], pagination: { total: 1, totalPages: 1 } })));
  expect(screen.getByText('current@example.invalid')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create Campaign from Filters' })).toBeEnabled();
});

test('invalid link filters are shown without fetching a broader audience until cleared', async () => {
  window.history.replaceState(null, '', '/admin/emails/recipients?verified=true');
  render(<RecipientsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid recipient filters');
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Create Campaign from Filters' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Clear invalid filters' }));
  expect(await screen.findByRole('checkbox', { name: 'Select a@example.invalid' })).toBeEnabled();
});
