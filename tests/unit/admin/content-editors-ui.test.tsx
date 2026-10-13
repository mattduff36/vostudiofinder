import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FAQPage from '@/app/admin/faq/page';
import MessageTemplatesPage from '@/app/admin/message-templates/page';
import { showConfirm } from '@/components/ui/ConfirmDialog';

jest.mock('@/components/admin/AdminTabs', () => ({ AdminTabs: () => <nav>Admin navigation</nav> }));
jest.mock('@/components/ui/ConfirmDialog', () => ({ showConfirm: jest.fn() }));
jest.mock('@/lib/toast', () => ({ showSuccess: jest.fn(), showError: jest.fn(), showWarning: jest.fn() }));
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
let fetcher: jest.Mock;
beforeEach(() => { fetcher = jest.fn(); global.fetch = fetcher; (showConfirm as jest.Mock).mockReset(); });
const faqs = [{ id: 'a', question: 'First?', answer: 'A', sort_order: 1 }, { id: 'b', question: 'Second?', answer: 'B', sort_order: 2 }, { id: 'c', question: 'Third?', answer: 'C', sort_order: 3 }];

it('an unaccepted FAQ drag has no request or committed order; accepted drop uses final position', async () => {
  fetcher.mockResolvedValueOnce(response({ faqs }));
  render(<FAQPage />);
  const first = (await screen.findByText('First?')).closest('[draggable]')!;
  const third = screen.getByText('Third?').closest('[draggable]')!;
  const dataTransfer = { effectAllowed: '', setData: jest.fn() };
  fireEvent.dragStart(first, { dataTransfer }); fireEvent.dragOver(third); fireEvent.dragEnd(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValueOnce(response({ faqs: [faqs[1], faqs[2], faqs[0]] }));
  fireEvent.dragStart(first, { dataTransfer }); fireEvent.drop(third); fireEvent.dragEnd(first);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ faqs: [{ id: 'b', sort_order: 1 }, { id: 'c', sort_order: 2 }, { id: 'a', sort_order: 3 }], expectedOrder: ['a', 'b', 'c'] });
});
it('a double save is one write, leaves navigation mounted, and preserves a failed draft', async () => {
  fetcher.mockResolvedValueOnce(response({ faqs }));
  let finish!: (value: ReturnType<typeof response>) => void;
  fetcher.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<FAQPage />); await screen.findByText('First?');
  fireEvent.click(screen.getAllByTitle('Edit FAQ')[0]!);
  const input = await screen.findByLabelText('Question'); fireEvent.change(input, { target: { value: 'My unsaved draft?' } });
  const save = screen.getByRole('button', { name: 'Save Changes' }); fireEvent.click(save); fireEvent.click(save);
  expect(fetcher).toHaveBeenCalledTimes(2); expect(screen.getByText('Admin navigation')).toBeInTheDocument();
  expect(input).toBeDisabled();
  await act(async () => { finish(response({ error: 'This record no longer exists. Refresh the list.' }, 404)); });
  expect(screen.getByLabelText('Question')).toHaveValue('My unsaved draft?');
  expect(screen.getByRole('alert')).toHaveTextContent('no longer exists');
  expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeDisabled();
});
it('switching a dirty template waits for explicit discard and preserves it when declined', async () => {
  fetcher.mockResolvedValue(response({ templates: [{ id: 'a', label: 'One', body: 'First text' }, { id: 'b', label: 'Two', body: 'Second text' }] }));
  (showConfirm as jest.Mock).mockResolvedValue(false);
  render(<MessageTemplatesPage />); await screen.findByText('One');
  fireEvent.click(screen.getAllByTitle('Edit template')[0]!);
  const input = await screen.findByLabelText('Label (shown in dropdown)');
  fireEvent.change(input, { target: { value: 'Unsaved label' } });
  fireEvent.click(screen.getByTitle('Edit template'));
  await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Label (shown in dropdown)')).toHaveValue('Unsaved label');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
