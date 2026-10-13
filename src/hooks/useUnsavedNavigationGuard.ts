'use client';

import { useEffect, useLayoutEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';

const HISTORY_MARKER = '__vsf_unsaved_navigation';
interface UnsavedNavigationGuardOptions {
  enabled: boolean;
  /** Return true only after Save succeeds or Discard is explicitly chosen. */
  confirmLeave: () => Promise<boolean>;
  onAccepted?: () => void;
}

/**
 * Protect user links, browser Back and unload while this editor has a draft.
 * Keeps Next's existing history state intact; never patches a router/history API.
 * Programmatic navigation remains the caller's responsibility: use confirmLeave.
 * Native unload offers the browser's standard warning, since it cannot await UI.
 */
export function useUnsavedNavigationGuard({ enabled, confirmLeave, onAccepted }: UnsavedNavigationGuardOptions) {
  const router = useRouter();
  const guardId = useId();
  const removalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barrier = useRef<{ url: string; state: unknown; marked: Record<string, unknown> } | null>(null);
  const latest = useRef({ confirmLeave, onAccepted, router });
  useLayoutEffect(() => { latest.current = { confirmLeave, onAccepted, router }; }, [confirmLeave, onAccepted, router]);

  useEffect(() => {
    if (!enabled) return;
    if (removalTimer.current) { clearTimeout(removalTimer.current); removalTimer.current = null; }
    const token = guardId;
    const previousBarrier = window.history.state?.[HISTORY_MARKER] === token ? barrier.current : null;
    const originalUrl = previousBarrier?.url ?? window.location.href;
    const originalState = previousBarrier ? previousBarrier.state : window.history.state;
    const markedState = previousBarrier?.marked ?? { ...(originalState && typeof originalState === 'object' ? originalState : {}), [HISTORY_MARKER]: token };
    // A nested confirmation should not add another competing history barrier.
    const ownsEntry = !!previousBarrier || !window.history.state?.[HISTORY_MARKER];
    if (ownsEntry && !previousBarrier) window.history.pushState(markedState, '', originalUrl);
    if (ownsEntry) barrier.current = { url: originalUrl, state: originalState, marked: markedState };
    const hasPreviousPage = window.history.length > 2;
    let pending = false;
    let disposed = false;
    let leaving = false;

    const ownsCurrentEntry = () => ownsEntry && window.history.state?.[HISTORY_MARKER] === token && window.location.href === originalUrl;
    const removeEntry = () => new Promise<void>(resolve => {
      if (!ownsCurrentEntry()) { resolve(); return; }
      // Clear our marker before moving back: a later Forward must not resurrect
      // a stale owner and disable protection in a newly opened editor.
      window.history.replaceState(originalState, '', originalUrl);
      // Pop the identical-URL barrier without passing it to Next as a route change.
      const removed = (event: PopStateEvent) => {
        window.removeEventListener('popstate', removed, true);
        if (window.location.href === originalUrl) event.stopImmediatePropagation();
        resolve();
      };
      window.addEventListener('popstate', removed, true);
      window.history.back();
    });
    const ask = async () => {
      try { return await latest.current.confirmLeave(); }
      catch { return false; }
    };
    const back = (event: PopStateEvent) => {
      if (!ownsEntry || leaving || disposed || window.history.state?.[HISTORY_MARKER] === token) return;
      // Back has reached the underlying copy of this URL. Re-establish the
      // barrier synchronously while the existing Save/Discard dialog decides.
      event.stopImmediatePropagation();
      window.history.pushState(markedState, '', originalUrl);
      if (pending) return;
      pending = true;
      void (async () => {
        const accepted = await ask();
        if (accepted && window.location.href === originalUrl) {
          leaving = true;
          latest.current.onAccepted?.();
          window.removeEventListener('popstate', back, true);
          window.history.replaceState(originalState, '', originalUrl);
          window.history.go(hasPreviousPage ? -2 : -1);
        }
        pending = false;
        if (disposed && !leaving) await removeEntry();
      })();
    };
    const click = (event: MouseEvent) => {
      if (leaving || disposed || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const target = new URL(anchor.href, originalUrl);
      if (!['http:', 'https:'].includes(target.protocol)) return;
      const current = new URL(window.location.href);
      if (target.origin === current.origin && target.pathname === current.pathname && target.search === current.search) return;
      event.preventDefault(); event.stopPropagation();
      if (pending) return;
      pending = true;
      void (async () => {
        const accepted = await ask();
        if (accepted && window.location.href === originalUrl) {
          leaving = true;
          window.removeEventListener('popstate', back, true);
          await removeEntry();
          latest.current.onAccepted?.();
          if (target.origin === current.origin) latest.current.router.push(`${target.pathname}${target.search}${target.hash}`);
          else window.location.assign(target.href);
        }
        pending = false;
        if (disposed && !leaving) await removeEntry();
      })();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (leaving) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('popstate', back, true);
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', unload);
    return () => {
      disposed = true;
      window.removeEventListener('popstate', back, true);
      document.removeEventListener('click', click, true);
      window.removeEventListener('beforeunload', unload);
      if (!leaving && !pending) {
        // Defer removal by one task so React Strict Mode can reuse the same
        // barrier during its immediate setup/cleanup/setup verification.
        removalTimer.current = setTimeout(() => { removalTimer.current = null; void removeEntry(); }, 0);
      }
    };
  }, [enabled, guardId]);
}
