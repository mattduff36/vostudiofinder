import { act, render, screen } from '@testing-library/react';
import { initializeAdminSandbox, resetAdminSandbox, SANDBOX_STORAGE_KEY, updateAdminSandbox, useAdminSandbox, useSandboxStorageError } from '@/lib/admin/sandbox-store';
function Consumer({ name }: { name: string }) { const state = useAdminSandbox(); const error = useSandboxStorageError(); return <output data-testid={name}>{JSON.stringify({ ...state, error })}</output>; }
const current = (name = 'a') => JSON.parse(screen.getByTestId(name).textContent!);
beforeEach(() => { jest.restoreAllMocks(); sessionStorage.clear(); resetAdminSandbox(); });
it('publishes badge disable to every same-document consumer and keeps it disabled on the next field update', () => {
  render(<><Consumer name="a" /><Consumer name="b" /></>);
  act(() => { updateAdminSandbox({ enabled: true, isVerified: true }); });
  expect(current('a').enabled).toBe(true); expect(current('b').enabled).toBe(true);
  act(() => { updateAdminSandbox({ enabled: false }); updateAdminSandbox({ profileCompletion: 72 }); });
  expect(current('a')).toMatchObject({ enabled: false, profileCompletion: 72 });
  expect(current('b')).toMatchObject({ enabled: false, profileCompletion: 72 });
  expect(JSON.parse(sessionStorage.getItem(SANDBOX_STORAGE_KEY)!)).toMatchObject({ enabled: false, profileCompletion: 72 });
});
it('rejects invalid values and malformed persisted data without enabling overrides', () => {
  render(<Consumer name="a" />);
  act(() => { expect(updateAdminSandbox({ profileCompletion: 101 })).toBe(false); expect(updateAdminSandbox({ nextAvailableDate: '2026-02-30' })).toBe(false); });
  expect(current().enabled).toBe(false);
  sessionStorage.setItem(SANDBOX_STORAGE_KEY, '{corrupt');
  act(() => { initializeAdminSandbox(); window.dispatchEvent(new StorageEvent('storage', { key: SANDBOX_STORAGE_KEY, storageArea: sessionStorage })); });
  expect(current().enabled).toBe(false); expect(current().error).toContain('could not be restored');
});
it('retains the actual previous state if saving or resetting session storage fails', () => {
  render(<Consumer name="a" />); act(() => { updateAdminSandbox({ enabled: true }); });
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('fixture storage quota'); });
  act(() => { expect(updateAdminSandbox({ enabled: false })).toBe(false); });
  expect(current().enabled).toBe(true); expect(current().error).toContain('previous settings remain active');
  write.mockRestore(); jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('fixture storage blocked'); });
  act(() => { expect(resetAdminSandbox()).toBe(false); });
  expect(current().enabled).toBe(true); expect(current().error).toContain('could not be reset');
});
