import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildRecipientWhere, isMarketingEligible, MAX_CAMPAIGN_RECIPIENTS, normalizeRecipientEmail, type AudienceSelection } from './recipients';
import { EmailAdminError, type EmailDb } from './template-store';
import type { ResolvedEmailTemplate } from './template-contract';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function emailOperationHash(value: unknown): string { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }

const campaignVariableTypes: Record<string, string> = {
  displayName: 'string', username: 'string', studioName: 'string', profileUrl: 'url', userEmail: 'email', email: 'email',
};
export function unsupportedCampaignVariables(template: ResolvedEmailTemplate): string[] {
  return Object.entries(template.variableSchema).filter(([key, type]) => {
    if (template.key === 'legacy-user-announcement' && key === 'resetPasswordUrl' && type === 'url') return false;
    const supported = campaignVariableTypes[key];
    return !supported || (supported !== type && !(type === 'string' && ['email', 'url'].includes(supported)));
  }).map(([key]) => key);
}
export function assertCampaignTemplate(template: ResolvedEmailTemplate): void {
  const unsupported = unsupportedCampaignVariables(template);
  if (unsupported.length) throw new EmailAdminError(`This template needs event-specific data (${unsupported.join(', ')}) and cannot be used for campaigns. Choose a campaign template.`, 400);
}

export async function resolveCampaignAudience(audience: AudienceSelection, template: ResolvedEmailTemplate, client: EmailDb = db) {
  assertCampaignTemplate(template);
  const withoutExclusions: AudienceSelection = audience.mode === 'filters'
    ? { mode: 'filters', filters: { ...audience.filters, excludedEmails: [] } }
    : { mode: 'selected', userIds: audience.userIds };
  const users = await client.users.findMany({
    where: buildRecipientWhere(withoutExclusions),
    select: { id: true, email: true, deletion_status: true, email_preferences: { select: { marketing_opt_in: true, unsubscribed_at: true } } },
    orderBy: { id: 'asc' }, take: MAX_CAMPAIGN_RECIPIENTS + 1,
  });
  if (users.length > MAX_CAMPAIGN_RECIPIENTS) throw new EmailAdminError(`A campaign can review at most ${MAX_CAMPAIGN_RECIPIENTS.toLocaleString()} users. Narrow the filters or selected audience.`, 413);
  const excludedAddresses = new Set((audience.mode === 'filters' ? audience.filters.excludedEmails : audience.excludedEmails)?.map(normalizeRecipientEmail) ?? []);
  const exclusions = { missingUsers: audience.mode === 'selected' ? audience.userIds.length - users.length : 0, explicit: 0, consent: 0, deletionHold: 0, invalidAddress: 0, duplicateAddress: 0 };
  const seen = new Set<string>();
  const recipients: { id: string; email: string }[] = [];
  for (const user of users) {
    const email = normalizeRecipientEmail(user.email);
    if (excludedAddresses.has(email)) { exclusions.explicit++; continue; }
    if (user.deletion_status !== 'ACTIVE') { exclusions.deletionHold++; continue; }
    if (template.isMarketing && !isMarketingEligible(user.email_preferences)) { exclusions.consent++; continue; }
    if (!z.email().safeParse(email).success) { exclusions.invalidAddress++; continue; }
    if (seen.has(email)) { exclusions.duplicateAddress++; continue; }
    seen.add(email);
    recipients.push({ id: user.id, email });
  }
  return {
    recipients, matchedCount: users.length, eligibleCount: recipients.length, exclusions,
    templateRevision: template.revision,
    audienceFingerprint: emailOperationHash({ recipients, key: template.key, revision: template.revision }),
  };
}
