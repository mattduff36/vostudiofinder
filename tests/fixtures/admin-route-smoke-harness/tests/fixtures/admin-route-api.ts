import type { Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { adminStudioFixture, adminProfileFixture } from './admin-studios';
import { resolvedEmailTemplateSchema } from '../../src/lib/email/template-contract';

export const fixtureOrigin = 'http://127.0.0.1:4217';
export const emailTemplate = {
  ...resolvedEmailTemplateSchema.parse({ key: 'fixture-template', name: 'Fixture Email Template', description: 'Synthetic browser template', layout: 'STANDARD',
    isMarketing: false, isSystem: false, subject: 'Hello {{displayName}}', heading: 'Fixture greeting', bodyParagraphs: ['Synthetic email for {{displayName}}'],
    variableSchema: { displayName: 'string' }, revision: 1 }), hasDbOverride: true, campaignSupported: true, defaultTemplate: null,
};
export const campaign = { id: 'fixture-campaign', name: 'Fixture Campaign', template_key: emailTemplate.key, status: 'SENT', filters: { mode: 'filters', filters: {} },
  processingEnabled: false, requiresLegacyReview: false, recipient_count: 1, sent_count: 1, failed_count: 0, auto_retry: false, max_retries: 3, retry_count: 0,
  retry_after: null, scheduled_at: null, started_at: '2026-10-12T12:00:00Z', completed_at: '2026-10-12T12:01:00Z', created_at: '2026-10-12T11:59:00Z',
  created_by: { display_name: 'Fixture Admin', email: 'admin@example.invalid' }, template: { key: emailTemplate.key, name: emailTemplate.name, is_marketing: false } };
export const payment = { id: 'fixture-payment', user_id: 'fixture_user_1', stripe_checkout_session_id: null, stripe_payment_intent_id: 'pi_fixture', amount: 3000,
  currency: 'gbp', status: 'SUCCEEDED', refunded_amount: 0, created_at: '2026-10-12T12:00:00Z', metadata: { purpose: 'membership' }, refunds: [],
  users: { id: 'fixture_user_1', role: 'USER', display_name: 'Fixture Payment Owner', username: 'fixturepayment', email: 'payment@example.invalid', created_at: '2026-10-12T00:00:00Z' } };
const errorGroup = { id: 'fixture-error', sentry_issue_id: 'fixture-sentry', title: 'Fixture application error', level: 'error', status: 'OPEN', source_status: 'OPEN', local_triage: null,
  first_seen_at: '2026-10-12T12:00:00Z', last_seen_at: '2026-10-12T12:00:00Z', event_count: 2, environment: 'fixture', release: null, last_event_id: null,
  created_at: '2026-10-12T12:00:00Z', updated_at: '2026-10-12T12:00:00Z' };

export async function installAdminRouteFixture(page: Page, options: { hold?: string; fail?: string } = {}) {
  const failures = new Set(options.fail ? [options.fail] : []), reads: string[] = [], forbidden: string[] = [], errors: string[] = [];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const sessionUser = { id: 'fixture_admin', username: 'fixtureadmin', email: 'admin@example.invalid', display_name: 'Fixture Admin', role: 'ADMIN', email_verified: true };
  const token = await encode({ token: { ...sessionUser, sub: sessionUser.id }, secret: 'vsf_admin_route_fixture_secret_only' });
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: fixtureOrigin, httpOnly: true }, { name: 'vsf_cookie_consent', value: 'decline', url: fixtureOrigin }]);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    if (url.origin !== fixtureOrigin) return route.abort();
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/auth/session') return json({ user: sessionUser, expires: '2099-01-01T00:00:00Z' });
    reads.push(path);
    if (path === options.hold) await gate;
    if (failures.has(path)) return json({ error: 'Synthetic read failure' }, 503);
    if (method !== 'GET') {
      // These two POST endpoints are read-only previews; test-send/create/start,
      // refund, content edits, and all other write endpoints are prohibited.
      if (path === '/api/admin/emails/preview') return json({ html: '<!doctype html><html><body><p>Rendered fixture email</p></body></html>', subject: 'Fixture preview subject' });
      if (path === '/api/admin/emails/recipients/preview') return json({ matchedCount: 1, eligibleCount: 1, exclusions: {}, audienceFingerprint: 'a'.repeat(64), templateRevision: 1 });
      forbidden.push(`${method} ${path}`); return json({ error: 'Write forbidden in route smoke' }, 500);
    }
    if (path === '/api/admin/studios') { const studio = adminStudioFixture(1); return json({ studios: [studio], pagination: { total: 1, limit: 80, offset: 0, returned: 1, hasMore: false, maxLimit: 400 } }); }
    if (path === '/api/admin/studios/fixture_studio_1') return json(adminProfileFixture(adminStudioFixture(1)));
    if (path === '/api/admin/sticky-notes') return json({ content: 'Synthetic admin notes', updatedAt: null });
    if (path === '/api/admin/payments') return json({ payments: [payment], subscriptions: [], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }, summary: { currencies: { gbp: { totalRevenue: 3000, oneTimeRevenue: 3000, subscriptionRevenue: 0 } }, activeSubscriptions: 0 } });
    if (path === '/api/admin/payments/fixture-payment') return json({ payment, subscriptions: [] });
    if (path === '/api/admin/payments/fixture-payment/refund') return json({ enabled: false, recoveryEnabled: false, reason: 'Refund processing is paused in the fixture.', balance: 0, benefit: null, billing: null, operations: [] });
    if (path === '/api/admin/reservations') return json({ users: [{ id: 'fixture-reservation', email: 'reservation@example.invalid', username: 'fixturereserved', display_name: 'Fixture Reservation Owner', status: 'PENDING', reservation_expires_at: '2027-12-01T00:00:00Z', payment_attempted_at: null, payment_retry_count: 0, created_at: '2026-10-12T12:00:00Z', _count: { payments: 0 } }], stats: { pending: 1, expiringSoon: 0, failedPayments: 0, expired: 0 } });
    if (path === '/api/admin/faq') return json({ faqs: [{ id: 'fixture-faq', question: 'Fixture FAQ question', answer: 'Synthetic FAQ answer.', sort_order: 0 }] });
    if (path === '/api/admin/message-templates') return json({ templates: [{ id: 'fixture-message', label: 'Fixture Message Template', body: 'Synthetic reusable message.', sort_order: 0 }] });
    if (path === '/api/admin/platform-updates') return json({ updates: [{ id: 'fixture-update', title: 'Fixture Platform Update', description: 'Synthetic release note.', category: 'IMPROVEMENT', release_date: '2026-10-12T12:00:00Z', is_highlighted: false }] });
    if (path === '/api/admin/error-log') return json({ errorLogGroups: [errorGroup], pagination: { page: 1, limit: 50, totalCount: 1, totalPages: 1 } });
    if (path === '/api/admin/support-tickets') return json({ tickets: [{ id: 'fixture-ticket', user_id: 'fixture_user_1', type: 'SUGGESTION', category: 'Fixture Suggestion', subject: 'Synthetic suggestion', message: 'Synthetic customer feedback.', status: 'OPEN', priority: 'MEDIUM', created_at: '2026-10-12T12:00:00Z', updated_at: '2026-10-12T12:00:00Z', resolved_at: null, users: { id: 'fixture_user_1', email: 'suggestion@example.invalid', username: 'fixturesuggestion', display_name: 'Fixture Suggestion Owner' } }] });
    if (path === '/api/admin/emails/templates') return json({ templates: [emailTemplate] });
    if (path === '/api/admin/emails/templates/fixture-template') return json({ template: emailTemplate });
    if (path === '/api/admin/emails/campaigns') return json({ campaigns: [campaign] });
    if (path === '/api/admin/emails/stats') return json({ campaigns: 1, sentToday: 1, optInUsers: 1 });
    if (path === '/api/admin/emails/users') return json({ users: [{ id: 'fixture-recipient', email: 'recipient@example.invalid', username: 'fixturerecipient', display_name: 'Fixture Recipient', email_verified: true, status: 'ACTIVE', created_at: '2026-10-12T12:00:00Z', last_login: null, studio_profiles: { id: 'fixture_studio_1', name: 'Fixture Studio', is_featured: false }, email_preferences: { marketing_opt_in: true, unsubscribed_at: null } }], pagination: { total: 1, totalPages: 1, page: 1, limit: 50 } });
    if (path === '/api/admin/emails/campaigns/fixture-campaign') return json({ campaign, deliveryStats: { pending: 0, sending: 0, sent: 1, failed: 0, bounced: 0, skipped: 0, uncertain: 0, retryable: 0 } });
    if (path === '/api/admin/emails/campaigns/fixture-campaign/deliveries') return json({ deliveries: [{ id: 'fixture-delivery', to_email: 'delivery@example.invalid', status: 'SENT', attempt_count: 1, sent_at: '2026-10-12T12:01:00Z', created_at: '2026-10-12T12:00:00Z', user: { display_name: 'Fixture Recipient', username: 'fixturerecipient' } }], pagination: { total: 1 } });
    forbidden.push(`${method} ${path}`); return json({ error: 'Unmatched synthetic API route' }, 500);
  });
  return { release, failures, reads, forbidden, errors };
}
