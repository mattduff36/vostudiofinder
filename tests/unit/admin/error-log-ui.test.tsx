import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorLog } from '@/components/admin/ErrorLog';
jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
jest.mock('@/components/admin/AdminDrawer', () => ({ AdminDrawer: () => null }));
jest.mock('@/lib/toast', () => ({ showSuccess: jest.fn(), showError: jest.fn() }));
const makeGroup = (id: string) => ({ id, sentry_issue_id: `issue-${id}`, title: `Error ${id}`, level: 'error', status: 'OPEN', source_status: 'OPEN', local_triage: null,
  first_seen_at: '2026-10-12T18:00:00Z', last_seen_at: '2026-10-12T18:00:00Z', event_count: 2, environment: null, release: null,
  last_event_id: null, created_at: '2026-10-12T18:00:00Z', updated_at: '2026-10-12T18:00:00Z' });
const groups = [makeGroup('A'), makeGroup('B')];
const json = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const listing = (rows = groups, page = 1, totalCount = 2) => json({ errorLogGroups: rows, pagination: { page, limit: 50, totalCount, totalPages: Math.ceil(totalCount / 50) } });
const detail = (id: string) => json({ errorLogGroup: { ...makeGroup(id), sample_event_json: null }, sentryIssue: null, sentryLatestEvent: null, sentryError: null });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
let fetchMock: jest.Mock;
beforeEach(() => { jest.clearAllMocks(); fetchMock = jest.fn(async (url: string) => url.includes('error-log?') ? listing() : detail(url.includes('/A?') ? 'A' : 'B')); global.fetch = fetchMock; });
it('keeps read failures separate from an empty result and supports retry', async () => {
  fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(listing([], 1, 0));
  render(<ErrorLog />); await screen.findByText('Failed to load error logs. Please retry.');
  expect(screen.queryByText('No errors match these filters.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('No errors match these filters.');
});
it('does not put obsolete A details into B or reopen details after closing while loading', async () => {
  const a = deferred<any>(); const b = deferred<any>();
  fetchMock.mockImplementation(async (url: string) => url.includes('error-log?') ? listing() : url.includes('/A?') ? a.promise : b.promise);
  render(<ErrorLog />);
  fireEvent.click(await screen.findByRole('button', { name: 'Show error: Error A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show error: Error B' }));
  await act(async () => b.resolve(detail('B')));
  await act(async () => a.resolve(detail('A')));
  expect(screen.getByText('issue-B')).toBeInTheDocument(); expect(screen.queryByText('issue-A')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show error: Error B' }));
  const late = deferred<any>(); fetchMock.mockReturnValueOnce(late.promise);
  fireEvent.click(screen.getByRole('button', { name: 'Show error: Error A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show error: Error A' }));
  await act(async () => late.resolve(detail('A')));
  expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show error: Error A' })).toHaveAttribute('aria-expanded', 'false');
});
it('refreshes the current filter when an older status mutation finishes', async () => {
  const mutation = deferred<any>(); const listQueries: string[] = [];
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return mutation.promise;
    if (url.includes('error-log?')) { listQueries.push(url); return listing(); }
    return detail('A');
  });
  render(<ErrorLog />); fireEvent.click(await screen.findByRole('button', { name: 'Show error: Error A' }));
  fireEvent.change(await screen.findByRole('combobox', { name: 'Change local error status' }), { target: { value: 'IGNORED' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Error status' }), { target: { value: 'RESOLVED' } });
  await waitFor(() => expect(listQueries.at(-1)).toContain('status=RESOLVED'));
  await act(async () => mutation.resolve(json({ success: true, errorLogGroup: { ...makeGroup('A'), status: 'IGNORED' } })));
  await waitFor(() => expect(listQueries.length).toBeGreaterThan(2));
  expect(listQueries.at(-1)).toContain('status=RESOLVED');
});
it('requests page 2 for 51 records and resets to page 1 when a filter changes', async () => {
  fetchMock.mockImplementation(async (url: string) => {
    const page = Number(new URL(url, 'http://fixture.test').searchParams.get('page'));
    return listing(page === 2 ? [makeGroup('last')] : groups, page || 1, 51);
  });
  render(<ErrorLog />); await screen.findByRole('button', { name: 'Show error: Error A' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('button', { name: 'Show error: Error last' });
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Error level' }), { target: { value: 'fatal' } });
  await screen.findByRole('button', { name: 'Show error: Error A' });
  expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=1');
});
it('shows partial sync failures and does not automatically retry the sync write', async () => {
  fetchMock.mockImplementation(async (url: string) => url.includes('sync-sentry') ? json({ synced: 2, errors: 1 }) : listing());
  render(<ErrorLog />); await screen.findByRole('button', { name: 'Show error: Error A' });
  fireEvent.click(screen.getByRole('button', { name: 'Sync Now' }));
  await screen.findByText(/Synced 2 errors; 1 could not be imported/);
  expect(fetchMock.mock.calls.filter(([url]) => url.includes('sync-sentry'))).toHaveLength(1);
});
