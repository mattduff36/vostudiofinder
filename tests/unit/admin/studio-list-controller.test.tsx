import { act, renderHook, waitFor } from '@testing-library/react';
import { useAdminStudioList } from '@/hooks/useAdminStudioList';
import { fetchStudioSummary } from '@/lib/admin/studios/client';
import type { Studio } from '@/components/admin/studios/types';
jest.mock('@/lib/admin/studios/client', () => ({ fetchStudioSummary: jest.fn() }));

const initial = { search: '', status: 'all', sortBy: 'updated_at', sortOrder: 'desc' as const };
const studio = (id: string, name = id) => ({ id, name }) as Studio;
const response = (studios: Studio[], total = studios.length, limit = 80) => ({ ok: true, json: async () => ({ studios, pagination: { total, offset: 0, returned: studios.length, limit, maxLimit: 400, hasMore: studios.length < total } }) }) as Response;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });

it('ignores a late response from a previous query', async () => {
  const old = deferred<Response>(), current = deferred<Response>();
  (fetch as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const { result, rerender } = renderHook(({ query }) => useAdminStudioList(query), { initialProps: { query: initial } });
  rerender({ query: { ...initial, search: 'current' } });
  await act(async () => current.resolve(response([studio('current')])));
  await act(async () => old.resolve(response([studio('stale')])));
  expect(result.current.studios.map(row => row.id)).toEqual(['current']); expect(result.current.pending).toBe(false);
});
it('coalesces Load More and replaces the entire 160-row response instead of appending independent snapshots', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response([studio('old')], 200));
  const { result } = renderHook(() => useAdminStudioList(initial));
  await waitFor(() => expect(result.current.pending).toBe(false));
  const next = deferred<Response>(); (fetch as jest.Mock).mockReturnValueOnce(next.promise);
  act(() => { result.current.loadMore(); result.current.loadMore(); });
  expect(fetch).toHaveBeenCalledTimes(2); expect(String((fetch as jest.Mock).mock.calls[1][0])).toContain('limit=160');
  await act(async () => next.resolve(response([studio('fresh')], 200, 160)));
  expect(result.current.studios.map(row => row.id)).toEqual(['fresh']);
});
it('keeps a failed refresh recoverable and prevents an invalidated read overwriting the saved studio', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response([studio('a', 'before')]));
  const { result } = renderHook(() => useAdminStudioList(initial));
  await waitFor(() => expect(result.current.pending).toBe(false));
  const stale = deferred<Response>(); (fetch as jest.Mock).mockReturnValueOnce(stale.promise);
  act(() => result.current.refresh());
  act(() => { expect(result.current.beginMutation(['a'])).toBe(true); expect(result.current.beginMutation(['a'])).toBe(false); });
  (fetchStudioSummary as jest.Mock).mockResolvedValue(studio('a', 'saved'));
  (fetch as jest.Mock).mockResolvedValue({ ok: false });
  await act(async () => result.current.refreshStudio('a'));
  await act(async () => stale.resolve(response([studio('a', 'stale')])));
  expect(result.current.studios[0]?.name).toBe('saved');
  await waitFor(() => expect(result.current.error).toContain('retry'));
  act(() => result.current.endMutation(['a']));
});
