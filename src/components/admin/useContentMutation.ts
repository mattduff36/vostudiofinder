'use client';
import { useCallback, useRef, useState } from 'react';
import { showConfirm } from '@/components/ui/ConfirmDialog';

/** Shared only by the three small content editors with identical write ownership. */
export function useContentMutation() {
  const owned = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<void>) => {
    if (owned.current) return;
    owned.current = true; setBusy(true);
    try { await work(); }
    finally { owned.current = false; setBusy(false); }
  }, []);
  const allowDiscard = async (dirty: boolean) => {
    if (owned.current) return false;
    if (!dirty) return true;
    let accepted = false;
    await run(async () => { accepted = await showConfirm({ title: 'Discard unsaved changes?', message: 'Your current draft has not been saved.', confirmText: 'Discard changes' }); });
    return accepted;
  };
  return { busy, run, allowDiscard };
}
