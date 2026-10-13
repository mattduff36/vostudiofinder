import { createProfileWriteCoordinator } from '@/lib/profile/write-coordinator';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
it('waits for independent acknowledgements before taking a main-save snapshot and rejects overlapping writes', async () => {
  const writes = createProfileWriteCoordinator();
  let avatar = 'old';
  expect(writes.begin('avatar')).toBe(true); expect(writes.begin('avatar')).toBe(false);
  const task = jest.fn(async () => { expect(avatar).toBe('uploaded'); return true; });
  const saving = writes.runSave(task);
  expect(writes.begin('privacy')).toBe(false); expect(task).not.toHaveBeenCalled();
  avatar = 'uploaded'; writes.end('avatar');
  expect(await saving).toBe(true); expect(task).toHaveBeenCalledTimes(1); expect(writes.pending).toBe(false);
});
it('coalesces Save and closing while a save is in flight, then releases after failure', async () => {
  const writes = createProfileWriteCoordinator(), response = deferred<boolean>();
  const task = jest.fn(() => response.promise);
  const first = writes.runSave(task), duplicate = writes.runSave(task);
  expect(duplicate).toBe(first);
  let closed = false; const closing = writes.waitForPendingSaves().then(() => { closed = true; });
  await Promise.resolve(); expect(closed).toBe(false);
  response.resolve(false); expect(await first).toBe(false); await closing;
  expect(closed).toBe(true); expect(task).toHaveBeenCalledTimes(1); expect(writes.begin('images')).toBe(true); writes.end('images');
});
