'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStudioSummary } from '@/lib/admin/studios/client';
import { STUDIO_MAX_WINDOW, STUDIO_PAGE_SIZE, type Studio, type StudiosResponse } from '@/components/admin/studios/types';

interface StudioQuery {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/** Each accepted response replaces one coherent range. The bounded window can
 * grow through Load More; Next/Previous windows keep the entire set browsable. */
export function useAdminStudioList(query: StudioQuery) {
  const key = JSON.stringify(query);
  const [range, setRange] = useState({ key, offset: 0, limit: STUDIO_PAGE_SIZE });
  const activeRange = range.key === key ? range : { key, offset: 0, limit: STUDIO_PAGE_SIZE };
  const [studios, setStudios] = useState<Studio[]>([]);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false, offset: 0, limit: STUDIO_PAGE_SIZE, returned: 0, maxLimit: STUDIO_MAX_WINDOW });
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestEpoch = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  const readPending = useRef(false);
  const mounted = useRef(true);
  const summaryEpoch = useRef(new Map<string, number>());
  const writes = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const invalidateReads = useCallback(() => {
    requestEpoch.current++;
    activeRead.current?.abort();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; invalidateReads(); };
  }, [invalidateReads]);

  useEffect(() => {
    const epoch = ++requestEpoch.current;
    const controller = new AbortController();
    activeRead.current = controller;
    readPending.current = true;
    setPending(true);
    setError(null);
    const config: StudioQuery = JSON.parse(key);
    const params = new URLSearchParams({ ...config, offset: String(activeRange.offset), limit: String(activeRange.limit) });
    // On a changed query preserve the shell/inputs; stale results remain labelled
    // as refreshing until the whole replacement has been accepted.
    void (async () => {
      try {
        const response = await fetch(`/api/admin/studios?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load studios. Please retry.');
        const result: StudiosResponse = await response.json();
        if (controller.signal.aborted || epoch !== requestEpoch.current || !mounted.current) return;
        if (!Array.isArray(result.studios) || !result.pagination) throw new Error('Invalid studio list response. Please retry.');
        if (activeRange.offset > 0 && result.studios.length === 0) {
          setRange({ key, offset: Math.max(0, Math.floor(Math.max(0, result.pagination.total - 1) / STUDIO_MAX_WINDOW) * STUDIO_MAX_WINDOW), limit: STUDIO_PAGE_SIZE });
          return;
        }
        setStudios(result.studios);
        setPagination(result.pagination);
      } catch (failure) {
        if (!controller.signal.aborted && epoch === requestEpoch.current && mounted.current) {
          setError(failure instanceof Error ? failure.message : 'Unable to load studios.');
        }
      } finally {
        if (epoch === requestEpoch.current && mounted.current) {
          readPending.current = false;
          setPending(false);
        }
      }
    })();
    return () => controller.abort();
  }, [key, activeRange.offset, activeRange.limit, refreshKey]);

  const refresh = useCallback(() => {
    invalidateReads();
    setRefreshKey(value => value + 1);
  }, [invalidateReads]);
  const refreshStudio = useCallback(async (id: string) => {
    invalidateReads();
    const revision = (summaryEpoch.current.get(id) ?? 0) + 1;
    summaryEpoch.current.set(id, revision);
    try {
      const studio = await fetchStudioSummary(id);
      if (!mounted.current || summaryEpoch.current.get(id) !== revision) return;
      setStudios(current => studio ? current.map(row => row.id === id ? studio : row) : current.filter(row => row.id !== id));
    } catch (failure) {
      if (mounted.current && summaryEpoch.current.get(id) === revision) setError(failure instanceof Error ? failure.message : 'Unable to refresh saved studio.');
    } finally {
      // Reconcile membership/order from a new complete range after the mutation.
      if (mounted.current && summaryEpoch.current.get(id) === revision) refresh();
    }
  }, [invalidateReads, refresh]);

  const beginMutation = useCallback((ids: string[]) => {
    if (ids.some(id => writes.current.has(id))) return false;
    ids.forEach(id => writes.current.add(id));
    setPendingIds(new Set(writes.current));
    invalidateReads();
    return true;
  }, [invalidateReads]);
  const endMutation = useCallback((ids: string[]) => {
    invalidateReads();
    ids.forEach(id => writes.current.delete(id));
    if (mounted.current) { setPendingIds(new Set(writes.current)); refresh(); }
  }, [refresh, invalidateReads]);

  const loadMore = () => {
    if (readPending.current || writes.current.size > 0 || !pagination.hasMore) return;
    readPending.current = true;
    setRange(activeRange.limit >= STUDIO_MAX_WINDOW
      ? { key, offset: activeRange.offset + STUDIO_MAX_WINDOW, limit: STUDIO_PAGE_SIZE }
      : { ...activeRange, limit: Math.min(STUDIO_MAX_WINDOW, activeRange.limit + STUDIO_PAGE_SIZE) });
  };
  const previousWindow = () => {
    if (readPending.current || writes.current.size > 0) return;
    readPending.current = true;
    setRange({ key, offset: Math.max(0, activeRange.offset - STUDIO_MAX_WINDOW), limit: STUDIO_MAX_WINDOW });
  };
  return { studios, setStudios, pagination, pending, error, refresh, refreshStudio, beginMutation, endMutation, pendingIds, loadMore, previousWindow,
    isNextWindow: activeRange.limit >= STUDIO_MAX_WINDOW, initialLoading: pending && studios.length === 0 };
}
