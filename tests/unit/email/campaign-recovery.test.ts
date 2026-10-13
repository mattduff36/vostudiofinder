/** @jest-environment node */
import { runCampaignAttempt, type StoredCampaignAttempt } from '@/lib/email/campaign-client';
const attempt: StoredCampaignAttempt = { payload: JSON.stringify({ requestKey: 'fixed-request-id', name: 'Draft' }), review: { audienceFingerprint: 'a'.repeat(64), templateRevision: 1, matchedCount: 4, eligibleCount: 3, exclusions: { consent: 1 } } };
const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });

test('create succeeds/start fails: persist the existing ID before starting and recover that ID', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(response(200, { campaign: { id: 'campaign-1' } })).mockResolvedValueOnce(response(503, { error: 'Paused' }));
  const created = jest.fn();
  const result = await runCampaignAttempt(attempt, true, created, fetcher);
  expect(created).toHaveBeenCalledWith('campaign-1');
  expect(created.mock.invocationCallOrder[0]).toBeLessThan(fetcher.mock.invocationCallOrder[1]!);
  expect(result).toEqual({ campaignId: 'campaign-1', startError: 'Paused' });
  fetcher.mockClear().mockResolvedValue(response(200, { success: true }));
  await runCampaignAttempt({ ...attempt, campaignId: 'campaign-1' }, true, created, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe('/api/admin/emails/campaigns/campaign-1/start');
});

test('lost create response retains exactly the same request payload/key on recovery', async () => {
  const fetcher = jest.fn().mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce(response(200, { campaign: { id: 'same-campaign' } }));
  await expect(runCampaignAttempt(attempt, false, jest.fn(), fetcher)).rejects.toThrow('response lost');
  await expect(runCampaignAttempt(attempt, false, jest.fn(), fetcher)).resolves.toMatchObject({ campaignId: 'same-campaign' });
  expect(fetcher.mock.calls[0]![1].body).toBe(fetcher.mock.calls[1]![1].body);
});
