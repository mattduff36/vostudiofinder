/** Coordinates the profile form's independently persisted controls with its main save.
 * A save waits for writes already in flight and blocks new writes until its snapshot
 * is acknowledged. It does not pretend aborting an HTTP request cancels a mutation. */
export function createProfileWriteCoordinator() {
  const pending = new Set<string>();
  const waiters = new Set<() => void>();
  let save: Promise<boolean> | null = null;
  let locked = false;
  const waitForControls = () => pending.size === 0 ? Promise.resolve() : new Promise<void>(resolve => waiters.add(resolve));
  return {
    get saving() { return locked; },
    get pending() { return pending.size > 0 || locked; },
    begin(key: string) {
      if (locked || pending.has(key)) return false;
      pending.add(key);
      return true;
    },
    end(key: string) {
      pending.delete(key);
      if (pending.size === 0) { for (const resolve of waiters) resolve(); waiters.clear(); }
    },
    runSave(task: () => Promise<boolean>): Promise<boolean> {
      if (save) return save;
      locked = true;
      save = (async () => { await waitForControls(); return task(); })()
        .finally(() => { locked = false; save = null; });
      return save;
    },
    async waitForPendingSaves() { await waitForControls(); if (save) await save; },
  };
}
