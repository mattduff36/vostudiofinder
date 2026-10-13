export interface CampaignReview {
  audienceFingerprint: string;
  templateRevision: number;
  eligibleCount: number;
  matchedCount: number;
  exclusions: Record<string, number>;
}
export interface StoredCampaignAttempt {
  payload: string;
  review: CampaignReview;
  campaignId?: string;
}

export function describeCampaignExclusions(exclusions: Record<string, number>): string {
  const labels: Record<string, string> = {
    missingUsers: 'unavailable accounts', explicit: 'manually excluded', consent: 'without marketing consent',
    deletionHold: 'accounts awaiting deletion', invalidAddress: 'invalid addresses', duplicateAddress: 'duplicate addresses',
  };
  return Object.entries(exclusions).filter(([, count]) => count > 0)
    .map(([reason, count]) => `${count} ${labels[reason] ?? reason}`).join(', ') || 'none';
}

/** Persist onCreated before attempting start; recovery never creates another ID. */
export async function runCampaignAttempt(
  attempt: StoredCampaignAttempt,
  start: boolean,
  onCreated: (id: string) => void,
  fetcher: typeof fetch = fetch,
): Promise<{ campaignId: string; startError: string | null }> {
  let campaignId = attempt.campaignId;
  if (!campaignId) {
    const response = await fetcher('/api/admin/emails/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: attempt.payload,
    });
    const result = await response.json();
    if (!response.ok || !result.campaign?.id) throw new Error(result.error || 'Campaign creation result unavailable. Recover this request before making another.');
    campaignId = String(result.campaign.id);
    onCreated(campaignId);
  }
  if (start) {
    try {
      const response = await fetcher(`/api/admin/emails/campaigns/${encodeURIComponent(campaignId)}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audienceFingerprint: attempt.review.audienceFingerprint, templateRevision: attempt.review.templateRevision }),
      });
      const result = await response.json();
      if (!response.ok) return { campaignId, startError: result.error || 'Starting requires review' };
    } catch { return { campaignId, startError: 'Start outcome unavailable. Check this campaign before trying again.' }; }
  }
  return { campaignId, startError: null };
}
