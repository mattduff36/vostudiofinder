import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TemplateEditorPage from '@/app/admin/emails/template/[key]/page';
import { resolvedEmailTemplateSchema } from '@/lib/email/template-contract';

jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => null }));
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useParams: () => ({ key: 'custom-fixture' }), useRouter: () => ({ push: mockPush }) }));
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(r => { resolve = r; }), resolve: (value: T) => resolve(value) }; }
const saved = resolvedEmailTemplateSchema.parse({ key: 'custom-fixture', name: 'Custom fixture', subject: 'Saved subject', heading: 'Hello', bodyParagraphs: ['Hello {{displayName}}'], layout: 'STANDARD', isMarketing: false, isSystem: false, revision: 1, variableSchema: { displayName: 'string' } });
let fetchMock: jest.Mock;
beforeEach(() => {
  sessionStorage.clear(); mockPush.mockReset();
  fetchMock = jest.fn(async (url: string) => url.includes('/preview') ? json({ subject: 'Draft preview', html: '<p>Draft preview</p>' }) : json({ template: saved }));
  global.fetch = fetchMock;
});

const subject = () => screen.getByRole('textbox', { name: 'Subject line' });

test('typing after save submission survives its successful response and increments the saved revision', async () => {
  const save = deferred<ReturnType<typeof json>>(); const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => init?.method === 'PATCH' ? save.promise : normal(url, init));
  render(<TemplateEditorPage />); await screen.findByRole('textbox', { name: 'Subject line' });
  fireEvent.change(subject(), { target: { value: 'Submitted subject' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Save Changes' })[0]!);
  fireEvent.change(subject(), { target: { value: 'Newer typing' } });
  screen.getAllByRole('button', { name: 'Saving...' }).forEach(button => expect(button).toBeDisabled());
  await act(async () => save.resolve(json({ template: { ...saved, subject: 'Submitted subject', revision: 2 } })));
  expect(subject()).toHaveValue('Newer typing');
  const draft = JSON.parse(sessionStorage.getItem('email-template-draft:custom-fixture')!);
  expect(draft.subject).toBe('Newer typing'); expect(draft.revision).toBe(2);
  expect(fetchMock.mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1);
});

test('failed save, draft preview/test and Back retain this template draft', async () => {
  const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => init?.method === 'PATCH' ? json({ error: 'Version changed; review the latest copy' }, 409) : normal(url, init));
  const view = render(<TemplateEditorPage />); await screen.findByRole('textbox', { name: 'Subject line' });
  fireEvent.change(subject(), { target: { value: 'Unsaved subject' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Save Changes' })[0]!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Version changed');
  expect(subject()).toHaveValue('Unsaved subject');
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  await screen.findByText('Subject: Draft preview');
  const previewRequest = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/preview'))!;
  expect(JSON.parse(String(previewRequest[1].body)).draft.subject).toBe('Unsaved subject');
  fireEvent.click(screen.getByRole('button', { name: 'Test Send' }));
  expect(screen.getByRole('region', { name: 'Test email' })).toHaveTextContent('current unsaved draft');
  expect(subject()).toHaveValue('Unsaved subject');
  fireEvent.click(screen.getByRole('button', { name: 'Back to Templates' }));
  expect(mockPush).toHaveBeenCalledWith('/admin/emails?view=templates');
  view.unmount(); render(<TemplateEditorPage />);
  await waitFor(() => expect(subject()).toHaveValue('Unsaved subject'));
});

test('an incomplete draft survives remount rather than restoring an earlier saved value', async () => {
  const view = render(<TemplateEditorPage />); await screen.findByRole('textbox', { name: 'Subject line' });
  fireEvent.change(subject(), { target: { value: '' } });
  view.unmount(); render(<TemplateEditorPage />);
  await waitFor(() => expect(subject()).toHaveValue(''));
});

test('test send holds a pending state and reports provider rejection while preserving the draft', async () => {
  const send = deferred<ReturnType<typeof json>>(); const normal = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => url.endsWith('/test-send') ? send.promise : normal(url, init));
  render(<TemplateEditorPage />); await screen.findByRole('textbox', { name: 'Subject line' });
  fireEvent.change(subject(), { target: { value: 'Test-only draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Test Send' }));
  await screen.findByText('Subject: Draft preview');
  fireEvent.change(screen.getByLabelText('Test recipient email address'), { target: { value: 'controlled@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send test email' }));
  expect(screen.getByRole('button', { name: 'Sending test…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
  await act(async () => send.resolve(json({ error: 'Provider did not confirm acceptance. Check before another test.' }, 502)));
  expect(await screen.findByText(/Provider did not confirm acceptance/)).toBeInTheDocument();
  expect(subject()).toHaveValue('Test-only draft');
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/test-send'))).toHaveLength(1);
});
