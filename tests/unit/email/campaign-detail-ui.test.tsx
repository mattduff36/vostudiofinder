import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CampaignDetailPage from '@/app/admin/emails/campaigns/[id]/page';

jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
jest.mock('@/components/ui/Modal', () => ({ Modal: () => null }));
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'fixture-campaign' }),
  useRouter: () => ({ push: jest.fn() }),
}));

const campaignPath = '/api/admin/emails/campaigns/fixture-campaign';
const campaign = {
  id: 'fixture-campaign', name: 'Fixture campaign', template_key: 'fixture-template', status: 'SENT',
  filters: {}, processingEnabled: false, requiresLegacyReview: false,
  recipient_count: 1, sent_count: 1, failed_count: 0, auto_retry: false,
  max_retries: 3, retry_count: 0, retry_after: null, scheduled_at: null,
  started_at: null, completed_at: null, created_at: '2026-10-12T12:00:00Z',
};
const deliveryStats = { pending: 0, sending: 0, sent: 1, failed: 0, bounced: 0, skipped: 0, uncertain: 0, retryable: 0 };
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const detail = (overrides = {}) => json({ campaign: { ...campaign, ...overrides }, deliveryStats });
function deferred<T>() {
  let resolve!: (value: T) => void;
  return { promise: new Promise<T>(complete => { resolve = complete; }), resolve: (value: T) => resolve(value) };
}
let fetchMock: jest.Mock;

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/admin/emails/campaigns/fixture-campaign');
  fetchMock = jest.fn(async (url: string) => {
    if (url === campaignPath) return detail();
    if (url.startsWith(`${campaignPath}/deliveries?`)) return json({ deliveries: [], pagination: { total: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  });
  global.fetch = fetchMock;
});

test('a recovered refresh clears its read error and keeps the loaded campaign visible while retrying', async () => {
  render(<CampaignDetailPage />);
  await screen.findByRole('heading', { name: campaign.name });
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string) => url === campaignPath ? json({ error: 'Campaign read unavailable' }, 503) : normal(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh campaign and deliveries' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Campaign read unavailable');
  const recovery = deferred<ReturnType<typeof json>>();
  fetchMock.mockImplementation((url: string) => url === campaignPath ? recovery.promise : normal(url));
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading campaign' }));
  expect(screen.getByRole('heading', { name: campaign.name })).toBeInTheDocument();
  expect(screen.getByText('Refreshing campaign…')).toHaveAttribute('role', 'status');
  await act(async () => recovery.resolve(detail({ name: 'Authoritative refreshed campaign' })));
  expect(await screen.findByRole('heading', { name: 'Authoritative refreshed campaign' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('an initial read failure offers a pending-aware retry that loads the campaign without navigation', async () => {
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string) => url === campaignPath ? json({ error: 'Initial campaign read failed' }, 503) : normal(url));
  render(<CampaignDetailPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Initial campaign read failed');
  const retry = screen.getByRole('button', { name: 'Retry loading campaign' });
  const recovery = deferred<ReturnType<typeof json>>();
  fetchMock.mockImplementation((url: string) => url === campaignPath ? recovery.promise : normal(url));
  fireEvent.click(retry);
  expect(retry).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Loading campaign…');
  fireEvent.click(retry);
  expect(fetchMock.mock.calls.filter(([url]) => url === campaignPath)).toHaveLength(2);
  await act(async () => recovery.resolve(detail()));
  expect(await screen.findByRole('heading', { name: campaign.name })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a durable create/start uncertainty notice survives read failure and successful recovery', async () => {
  const notice = 'The start response was lost. Check the current campaign outcome before trying again.';
  sessionStorage.setItem('email-campaign-notice:fixture-campaign', notice);
  render(<CampaignDetailPage />);
  await screen.findByRole('heading', { name: campaign.name });
  expect(screen.getByRole('alert')).toHaveTextContent(notice);
  expect(sessionStorage.getItem('email-campaign-notice:fixture-campaign')).toBeNull();
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string) => url === campaignPath ? json({ error: 'Temporary read failure' }, 503) : normal(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh campaign and deliveries' }));
  await screen.findByText('Temporary read failure');
  expect(screen.getByText(notice)).toBeInTheDocument();
  fetchMock.mockImplementation((url: string) => url === campaignPath ? detail({ name: 'Recovered campaign' }) : normal(url));
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading campaign' }));
  await screen.findByRole('heading', { name: 'Recovered campaign' });
  expect(screen.getByRole('alert')).toHaveTextContent(notice);
  expect(screen.queryByText('Temporary read failure')).not.toBeInTheDocument();
});

test('an action outcome error survives the automatic authoritative read after the action', async () => {
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === campaignPath && init?.method === 'PATCH') return json({ error: 'Cancellation outcome unavailable' }, 503);
    if (url === campaignPath) return detail({ status: 'DRAFT' });
    return normal(url, init);
  });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    render(<CampaignDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel', exact: true }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled());
    expect(screen.getByRole('alert')).toHaveTextContent('Cancellation outcome unavailable');
    expect(fetchMock.mock.calls.filter(([url, init]) => url === campaignPath && init?.method !== 'PATCH')).toHaveLength(2);
  } finally { confirm.mockRestore(); }
});
