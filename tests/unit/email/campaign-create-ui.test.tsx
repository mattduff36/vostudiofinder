import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateCampaignPage from '@/app/admin/emails/campaigns/create/page';

jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
let mockSearch = 'template=custom';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), useSearchParams: () => new URLSearchParams(mockSearch) }));
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(r => { resolve = r; }), resolve: (value: T) => resolve(value) }; }
const review = (count: number) => ({ audienceFingerprint: 'a'.repeat(64), templateRevision: 1, eligibleCount: count, matchedCount: count, exclusions: {} });
let fetchMock: jest.Mock;
beforeEach(() => {
  sessionStorage.clear(); mockPush.mockReset(); mockSearch = 'template=custom';
  fetchMock = jest.fn(async (url: string) => url.endsWith('/templates')
    ? json({ templates: [{ key: 'custom', name: 'Custom fixture', subject: 'Custom', layout: 'STANDARD', isMarketing: false, isSystem: false, campaignSupported: true }] })
    : json(review(5)));
  global.fetch = fetchMock;
});
const start = () => screen.getByRole('button', { name: 'Create & Start Sending' });

test('only a successful review for the current audience enables creation', async () => {
  const older = deferred<ReturnType<typeof json>>(); const newer = deferred<ReturnType<typeof json>>();
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (!url.endsWith('/preview')) return normal(url, init);
    const body = JSON.parse(String(init?.body));
    return body.audience.filters.search === 'older' ? older.promise : body.audience.filters.search === 'newer' ? newer.promise : json(review(5));
  });
  render(<CreateCampaignPage />);
  await waitFor(() => expect(start()).toBeEnabled());
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'older' } });
  expect(start()).toBeDisabled();
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => String(init?.body).includes('older'))).toBe(true));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'newer' } });
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => String(init?.body).includes('newer'))).toBe(true));
  await act(async () => older.resolve(json(review(500)))); expect(start()).toBeDisabled();
  await act(async () => newer.resolve(json({ error: 'Audience unavailable' }, 503))); expect(start()).toBeDisabled();
  expect(await screen.findByText('Audience unavailable')).toBeInTheDocument();
  expect(screen.queryByText('500 recipients')).not.toBeInTheDocument();
});

test('malformed legacy link filters cannot silently create an all-users audience', async () => {
  mockSearch = 'template=custom&studioVerified=YES';
  render(<CreateCampaignPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid filters');
  await new Promise(resolve => setTimeout(resolve, 350));
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/preview'))).toBe(false); expect(start()).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Clear invalid filters' }));
  await waitFor(() => expect(start()).toBeEnabled());
});

test('selected audience handoff locks unrelated filters and reviews only its explicit IDs', async () => {
  mockSearch = 'template=custom&audience=chosen';
  sessionStorage.setItem('email-audience:chosen', JSON.stringify({ mode: 'selected', userIds: ['selected-a', 'selected-b'] }));
  render(<CreateCampaignPage />);
  await waitFor(() => expect(start()).toBeEnabled());
  expect(screen.getByRole('textbox', { name: 'Search' })).toBeDisabled();
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/preview'))!;
  expect(JSON.parse(String(call[1].body)).audience).toEqual({ mode: 'selected', userIds: ['selected-a', 'selected-b'], excludedEmails: [] });
});
