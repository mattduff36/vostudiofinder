import { StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useUnsavedNavigationGuard } from '@/hooks/useUnsavedNavigationGuard';
const router = { push: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
const originalState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ['fixture-tree'], custom: 'preserved' };
const originalUrl = '/admin/suggestions';
let back: jest.SpyInstance; let go: jest.SpyInstance;
let forwardState: unknown;
function Fixture({ confirm, accepted = jest.fn(), enabled = true }: { confirm: () => Promise<boolean>; accepted?: () => void; enabled?: boolean }) {
  useUnsavedNavigationGuard({ enabled, confirmLeave: confirm, onAccepted: accepted });
  return <><a href="/admin/studios?fixture=1">Studios link</a><a href="/admin/studios" target="_blank">New tab</a></>;
}
function popBack() {
  window.history.replaceState(originalState, '', originalUrl);
  window.dispatchEvent(new PopStateEvent('popstate', { state: originalState }));
}
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); window.history.replaceState(originalState, '', originalUrl);
  forwardState = null;
  back = jest.spyOn(window.history, 'back').mockImplementation(() => { forwardState = window.history.state; popBack(); });
  go = jest.spyOn(window.history, 'go').mockImplementation(() => {});
});
afterEach(() => { cleanup(); act(() => jest.runOnlyPendingTimers()); jest.restoreAllMocks(); jest.useRealTimers(); });
it('preserves Next history fields, reuses the barrier in Strict Mode, and removes it on clean unmount', async () => {
  const confirm = jest.fn(async () => false);
  const view = render(<StrictMode><Fixture confirm={confirm} /></StrictMode>);
  expect(window.history.state).toMatchObject(originalState);
  expect(window.history.state.__vsf_unsaved_navigation).toBeTruthy();
  expect(back).not.toHaveBeenCalled();
  view.unmount(); act(() => jest.runOnlyPendingTimers());
  expect(back).toHaveBeenCalledTimes(1); expect(window.history.state).toEqual(originalState);
  expect(forwardState).toEqual(originalState); // Forward cannot revive a stale barrier owner.
});
it('coalesces repeated Back attempts and keeps the editor/history intact after cancel', async () => {
  let release!: (value: boolean) => void; const pending = new Promise<boolean>(resolve => { release = resolve; });
  const confirm = jest.fn(() => pending);
  render(<Fixture confirm={confirm} />);
  act(() => { popBack(); popBack(); });
  expect(confirm).toHaveBeenCalledTimes(1);
  await act(async () => release(false));
  expect(go).not.toHaveBeenCalled(); expect(window.history.state).toMatchObject(originalState);
  expect(window.history.state.__vsf_unsaved_navigation).toBeTruthy();
});
it('does not navigate a link on failed save; accepted link navigation removes the sentinel exactly once', async () => {
  const confirm = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true); const accepted = jest.fn();
  render(<Fixture confirm={confirm} accepted={accepted} />);
  fireEvent.click(screen.getByText('Studios link')); await act(async () => {});
  expect(router.push).not.toHaveBeenCalled(); expect(back).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Studios link')); await act(async () => {});
  expect(accepted).toHaveBeenCalledTimes(1); expect(back).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith('/admin/studios?fixture=1');
});
it('finishes an accepted Back after Save makes the draft clean and disables the guard', async () => {
  const accepted = jest.fn();
  function SaveFixture() {
    const [dirty, setDirty] = useState(true);
    return <Fixture enabled={dirty} accepted={accepted} confirm={async () => { setDirty(false); await Promise.resolve(); return true; }} />;
  }
  render(<SaveFixture />); act(() => popBack()); await act(async () => {});
  await waitFor(() => expect(accepted).toHaveBeenCalledTimes(1)); expect(go).toHaveBeenCalledTimes(1);
  expect(back).not.toHaveBeenCalled();
});
it('allows modified/new-tab links and uses the native warning only while dirty', async () => {
  const confirm = jest.fn(async () => false); const view = render(<Fixture confirm={confirm} />);
  fireEvent.click(screen.getByText('New tab')); fireEvent.click(screen.getByText('Studios link'), { ctrlKey: true });
  expect(confirm).not.toHaveBeenCalled();
  const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
  view.rerender(<Fixture enabled={false} confirm={confirm} />); act(() => jest.runOnlyPendingTimers());
  const cleanEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(cleanEvent); expect(cleanEvent.defaultPrevented).toBe(false);
});
