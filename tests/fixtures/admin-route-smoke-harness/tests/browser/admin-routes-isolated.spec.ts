import { test, expect, type Page } from '@playwright/test';
import { installAdminRouteFixture, fixtureOrigin } from '../fixtures/admin-route-api';

type RouteCase = { route: string; heading: string | RegExp; endpoint?: string; loaded?: string; loadingText?: string | RegExp; server?: boolean; navigate?: 'payment' | 'studios' };
export const adminRouteCases: RouteCase[] = [
  { route: '/admin', heading: 'Admin Dashboard', server: true, navigate: 'studios' },
  { route: '/admin/studios', heading: 'Studio Management', endpoint: '/api/admin/studios', loaded: 'Fixture Studio 0001' },
  { route: '/admin/analytics', heading: 'Analytics', server: true },
  { route: '/admin/payments', heading: 'Payment Management', endpoint: '/api/admin/payments', loaded: 'Fixture Payment Owner' },
  { route: '/admin/payments/fixture-payment', heading: 'Payment Details', endpoint: '/api/admin/payments/fixture-payment', loaded: 'Fixture Payment Owner', navigate: 'payment' },
  { route: '/admin/reservations', heading: 'Username Reservations', endpoint: '/api/admin/reservations', loaded: 'Fixture Reservation Owner', loadingText: 'Loading reservations…' },
  { route: '/admin/waitlist', heading: 'Waitlist Management', loaded: 'Fixture Waitlist Owner', server: true },
  { route: '/admin/faq', heading: 'Manage FAQs', endpoint: '/api/admin/faq', loaded: 'Fixture FAQ question', loadingText: 'Loading…' },
  { route: '/admin/message-templates', heading: 'Message Templates', endpoint: '/api/admin/message-templates', loaded: 'Fixture Message Template', loadingText: 'Loading…' },
  { route: '/admin/platform-updates', heading: "Manage What's New", endpoint: '/api/admin/platform-updates', loaded: 'Fixture Platform Update', loadingText: 'Loading…' },
  { route: '/admin/error-log', heading: 'Error Log', endpoint: '/api/admin/error-log', loaded: 'Fixture application error' },
  { route: '/admin/suggestions', heading: 'Suggestions', endpoint: '/api/admin/support-tickets', loaded: 'Fixture Suggestion' },
  { route: '/admin/support', heading: 'Suggestions', endpoint: '/api/admin/support-tickets', loaded: 'Fixture Suggestion' },
  { route: '/admin/sandbox', heading: 'Admin Test Sandbox' },
  { route: '/admin/emails', heading: 'Email Management', endpoint: '/api/admin/emails/campaigns', loaded: 'Fixture Campaign' },
  { route: '/admin/emails/recipients', heading: 'Recipients', endpoint: '/api/admin/emails/users', loaded: 'recipient@example.invalid' },
  { route: '/admin/emails/campaigns/create', heading: 'Create Campaign', endpoint: '/api/admin/emails/templates', loaded: 'Fixture Email Template', loadingText: 'Loading templates...' },
  { route: '/admin/emails/campaigns/fixture-campaign', heading: 'Fixture Campaign', endpoint: '/api/admin/emails/campaigns/fixture-campaign', loaded: 'delivery@example.invalid', loadingText: 'Loading campaign...' },
  { route: '/admin/emails/template/new', heading: 'Create Custom Template' },
  { route: '/admin/emails/template/fixture-template', heading: 'Fixture Email Template', endpoint: '/api/admin/emails/templates/fixture-template', loadingText: 'Loading template...' },
  { route: '/admin/emails/template/fixture-template/preview', heading: /Email preview — saved content/, endpoint: '/api/admin/emails/templates/fixture-template', loadingText: 'Loading saved template…' },
  { route: '/admin/emails/template/fixture-template/test', heading: /Test email — saved content/, endpoint: '/api/admin/emails/templates/fixture-template', loadingText: 'Loading saved template…' },
];

const visibleText = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true }).first();
async function assertLoaded(page: Page, row: RouteCase) {
  await expect(page.getByRole('heading', { name: row.heading, exact: typeof row.heading === 'string' })).toBeVisible();
  if (row.route === '/admin/emails') await page.getByRole('button', { name: 'Campaigns', exact: true }).click();
  if (row.loaded) await expect(visibleText(page, row.loaded)).toBeVisible();
  if (row.route.endsWith('/preview') || row.route.endsWith('/test')) {
    await expect(page.frameLocator('iframe[title="Rendered email preview"]').getByText('Rendered fixture email')).toBeVisible();
  }
}
for (const row of adminRouteCases) test(`smoke ${row.route}`, async ({ page }, info) => {
  const state = await installAdminRouteFixture(page, row.endpoint ? { hold: row.endpoint } : {});
  try {
    await page.goto(row.route, { waitUntil: 'domcontentloaded' });
    if (row.endpoint) {
      await expect.poll(() => state.reads.includes(row.endpoint!)).toBe(true);
      if (row.loadingText) await expect(page.getByText(row.loadingText, { exact: typeof row.loadingText === 'string' })).toBeVisible();
      else if (row.route !== '/admin/emails') await expect(page.locator('.animate-spin').filter({ visible: true }).first()).toBeVisible();
      if (row.loaded) await expect(visibleText(page, row.loaded)).toHaveCount(0);
      state.release();
    }
    await assertLoaded(page, row);
    if (row.route === '/admin/support') await expect(page).toHaveURL(`${fixtureOrigin}/admin/suggestions`);
    await expect(page.getByRole('alert').filter({ hasText: /Synthetic|unavailable|failed|Request failed/i })).toHaveCount(0);
    if (row.navigate === 'payment') {
      await page.getByRole('button', { name: /Back to Payments/ }).click();
      await expect(page.getByRole('heading', { name: 'Payment Management' })).toBeVisible();
    } else {
      const target = row.navigate === 'studios' ? '/admin/studios' : '/admin';
      await page.locator(`a[href="${target}"]`).filter({ visible: true }).first().click();
      await expect(page.getByRole('heading', { name: row.navigate === 'studios' ? 'Studio Management' : 'Admin Dashboard' })).toBeVisible();
    }
    expect(state.forbidden).toEqual([]); expect(state.errors).toEqual([]);
    await info.attach('route-result', { body: JSON.stringify({ route: row.route, data: row.server ? 'server read-only fixture' : row.endpoint ? 'held API initial-to-loaded' : 'local form state', navigation: 'passed', reads: state.reads }), contentType: 'application/json' });
  } finally { state.release(); }
});

const recoveries = [
  { route: '/admin/faq', endpoint: '/api/admin/faq', loaded: 'Fixture FAQ question', retry: 'Retry loading' },
  { route: '/admin/payments', endpoint: '/api/admin/payments', loaded: 'Fixture Payment Owner', retry: 'Retry' },
  { route: '/admin/payments/fixture-payment', endpoint: '/api/admin/payments/fixture-payment', loaded: 'Fixture Payment Owner', retry: 'Retry' },
  { route: '/admin/reservations', endpoint: '/api/admin/reservations', loaded: 'Fixture Reservation Owner', retry: 'Retry' },
  { route: '/admin/error-log', endpoint: '/api/admin/error-log', loaded: 'Fixture application error', retry: 'Retry' },
  { route: '/admin/suggestions', endpoint: '/api/admin/support-tickets', loaded: 'Fixture Suggestion', retry: 'Retry' },
  { route: '/admin/emails', endpoint: '/api/admin/emails/stats', loaded: 'Fixture Campaign', retry: 'Retry' },
  { route: '/admin/emails/recipients', endpoint: '/api/admin/emails/users', loaded: 'recipient@example.invalid', retry: 'Retry' },
  { route: '/admin/emails/template/fixture-template/preview', endpoint: '/api/admin/emails/templates/fixture-template', loaded: 'Subject: Fixture preview subject', retry: 'Retry' },
  { route: '/admin/emails/campaigns/fixture-campaign', endpoint: '/api/admin/emails/campaigns/fixture-campaign/deliveries', loaded: 'delivery@example.invalid', retry: 'Retry loading deliveries' },
];
for (const row of recoveries) test(`error recovery ${row.route}`, async ({ page }) => {
  const state = await installAdminRouteFixture(page, { fail: row.endpoint });
  await page.goto(row.route); await expect(page.getByRole('alert').filter({ hasText: /Synthetic|failed|unavailable/i }).first()).toBeVisible();
  if (row.route === '/admin/emails') {
    await page.getByRole('button', { name: 'Campaigns', exact: true }).click();
    await expect(visibleText(page, 'Fixture Campaign')).toBeVisible();
  }
  state.failures.delete(row.endpoint);
  await page.getByRole('button', { name: row.retry, exact: true }).click();
  await expect(visibleText(page, row.loaded)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /Synthetic|failed|unavailable/i })).toHaveCount(0);
  expect(state.forbidden).toEqual([]); expect(state.errors).toEqual([]);
});

test('server Analytics unavailable response recovers after reload without masquerading as zero', async ({ page }) => {
  const state = await installAdminRouteFixture(page);
  await page.context().addCookies([{ name: 'vsf_fixture_analytics_error', value: '1', url: fixtureOrigin }]);
  await page.goto('/admin/analytics'); await expect(page.getByRole('heading', { name: 'Analytics Unavailable' })).toBeVisible();
  await page.context().addCookies([{ name: 'vsf_fixture_analytics_error', value: '', url: fixtureOrigin, expires: 1 }]);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Analytics Unavailable' })).toHaveCount(0);
  await expect(page.getByText('Visitors (24h)', { exact: true })).toBeVisible();
  expect(state.forbidden).toEqual([]); expect(state.errors).toEqual([]);
});

test('campaign refresh clears a recovered read error', async ({ page }) => {
  const state = await installAdminRouteFixture(page);
  const path = '/api/admin/emails/campaigns/fixture-campaign';
  await page.goto('/admin/emails/campaigns/fixture-campaign');
  await expect(page.getByRole('heading', { name: 'Fixture Campaign', exact: true })).toBeVisible();
  state.failures.add(path);
  await page.getByRole('button', { name: 'Refresh campaign and deliveries' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic read failure' })).toBeVisible();
  state.failures.delete(path);
  await page.getByRole('button', { name: 'Refresh campaign and deliveries' }).click();
  await expect.poll(() => state.reads.filter(read => read === path).length).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic read failure' })).toHaveCount(0);
  expect(state.forbidden).toEqual([]); expect(state.errors).toEqual([]);
});
