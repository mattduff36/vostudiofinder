import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminStickyNotes } from '@/components/admin/AdminStickyNotes';
import { showUnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
jest.mock('@/components/ui/Modal', () => ({ Modal: ({ isOpen, children, onClose }: any) => isOpen ? <section><button aria-label="Backdrop close" onClick={onClose} />{children}</section> : null }));
jest.mock('@/components/ui/UnsavedChangesDialog', () => ({ showUnsavedChangesDialog: jest.fn() }));
jest.mock('@/lib/toast', () => ({ showSuccess: jest.fn() }));
const json = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
let fetchMock: jest.Mock;
beforeEach(() => { jest.clearAllMocks(); fetchMock = jest.fn(); global.fetch = fetchMock; });
it('does not allow a failed read to become an empty-note save', async () => {
  fetchMock.mockResolvedValue(json({}, 500)); render(<AdminStickyNotes isOpen onClose={jest.fn()} />);
  await screen.findByText('Failed to load the shared note. Retry before editing.');
  expect(screen.getByRole('textbox', { name: 'Shared admin note' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(fetchMock.mock.calls.every(([, options]) => options?.method !== 'PUT')).toBe(true);
});
it('keeps a conflicting draft visible and requires reviewing the new version before another save', async () => {
  const onClose = jest.fn();
  fetchMock.mockResolvedValueOnce(json({ content: 'Original', updatedAt: '2026-10-12T18:00:00.000Z' }))
    .mockResolvedValueOnce(json({ error: 'The shared note changed.', latest: { content: 'Other admin note', updatedAt: '2026-10-12T18:01:00.000Z' } }, 409));
  render(<AdminStickyNotes isOpen onClose={onClose} />);
  const editor = await screen.findByDisplayValue('Original');
  fireEvent.change(editor, { target: { value: 'My important draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Other admin note');
  expect(editor).toHaveValue('My important draft'); expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Keep my draft/ }));
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});
it('awaits one save and closes once when Save and an Escape/backdrop close overlap', async () => {
  const onClose = jest.fn(); let resolve!: (value: any) => void;
  const pending = new Promise(r => { resolve = r; });
  fetchMock.mockResolvedValueOnce(json({ content: 'Original', updatedAt: null })).mockReturnValueOnce(pending);
  render(<AdminStickyNotes isOpen onClose={onClose} />);
  fireEvent.change(await screen.findByDisplayValue('Original'), { target: { value: 'Saved draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' })); fireEvent.click(screen.getByRole('button', { name: 'Backdrop close' }));
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
  await act(async () => resolve(json({ content: 'Saved draft', updatedAt: '2026-10-12T18:02:00.000Z' })));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(showUnsavedChangesDialog).not.toHaveBeenCalled();
});
