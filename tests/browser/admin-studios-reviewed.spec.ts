import { test, expect, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { adminStudioFixture, adminProfileFixture } from '../fixtures/admin-studios';

const baseline = !!process.env.VSF_ADMIN_BASELINE_DIR;
async function fixture(page: Page) {
  const rows = Array.from({ length: 480 }, (_, index) => adminStudioFixture(index + 1));
  const reads: string[] = [], writes: Array<{ url: string; body: any }> = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const token = await encode({ token: { sub: 'fixture_admin', email: 'admin@example.invalid', username: 'fixtureadmin', display_name: 'Fixture Admin', role: 'ADMIN', email_verified: true }, secret: 'vsf_local_browser_fixture_secret_only' });
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: 'http://127.0.0.1:4208', httpOnly: true }, { name: 'vsf_cookie_consent', value: 'decline', url: 'http://127.0.0.1:4208' }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()), method = route.request().method();
    if (url.origin !== 'http://127.0.0.1:4208') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/session') return json({ user: { id: 'fixture_admin', email: 'admin@example.invalid', username: 'fixtureadmin', display_name: 'Fixture Admin', role: 'ADMIN', email_verified: true }, expires: '2099-01-01T00:00:00Z' });
    // Production-only page-view telemetry is intercepted separately from the
    // profile/admin writes whose absence the clean-close assertions prove.
    if (url.pathname === '/api/track') return json({ success: true });
    if (method !== 'GET') {
      let body: any = {}; try { body = route.request().postDataJSON(); } catch { /* upload fixture */ }
      writes.push({ url: url.pathname, body });
      const match = url.pathname.match(/^\/api\/admin\/studios\/(fixture_studio_\d+)$/);
      if (match) {
        const row = rows.find(item => item.id === match[1])!;
        if (body._meta?.studio_name) row.name = body._meta.studio_name;
        if (body._meta?.short_about) row.short_about = body._meta.short_about;
        if (body.display_name) row.users.display_name = body.display_name;
        return json({ success: true });
      }
      if (url.pathname.endsWith('/verify-email')) { const row = rows.find(item => url.pathname.includes(item.id)); if (row) row.users.email_verified = true; }
      return json({ success: true, data: {} });
    }
    if (url.pathname === '/api/admin/studios') {
      reads.push(url.search);
      const target = url.searchParams.get('studioId'), search = url.searchParams.get('search') ?? '';
      const matches = rows.filter(row => target ? row.id === target : !search || row.name.toLowerCase().includes(search.toLowerCase()));
      const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 80);
      return json({ studios: matches.slice(offset, offset + limit), pagination: { total: matches.length, limit, offset, returned: Math.min(limit, Math.max(0, matches.length - offset)), hasMore: offset + limit < matches.length, maxLimit: 400 } });
    }
    const detail = url.pathname.match(/^\/api\/admin\/studios\/(fixture_studio_\d+)$/);
    if (detail) return json(adminProfileFixture(rows.find(row => row.id === detail[1])!));
    if (url.pathname === '/api/user/profile') return json({ data: { user: { id: 'fixture_admin', username: 'fixtureadmin', display_name: 'Fixture Admin', email: 'admin@example.invalid' }, profile: {}, studio: { is_profile_visible: false, studio_types: [], images: [] } } });
    if (url.pathname === '/api/admin/sticky-notes') return json({ content: '', version: null });
    if (url.pathname === '/api/admin/support-tickets') return json({ tickets: [{ id: 'fixture_ticket', user_id: 'fixture_user_1', type: 'SUGGESTION', category: 'Fixture suggestion', subject: 'Fixture', message: 'A synthetic request for browser verification.', status: 'OPEN', priority: 'MEDIUM', created_at: '2026-10-12T12:00:00Z', updated_at: '2026-10-12T12:00:00Z', resolved_at: null, users: { id: 'fixture_user_1', email: 'fixture1@example.invalid', username: 'fixture1', display_name: 'Fixture Owner 1' } }] });
    if (url.pathname === '/api/admin/support-tickets/fixture_ticket/reply') return json({ operation: null });
    return json({ success: true, data: [], count: 0, hasNew: false });
  });
  await page.goto('/admin/studios');
  await expect(page.getByRole('heading', { name: 'Studio Management' })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  return { rows, reads, writes, errors };
}

test('collapsed layouts at desktop, tablet and mobile', async ({ page }, info) => {
  const { errors } = await fixture(page);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('heading', { name: 'Studio Management' })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${baseline ? 'baseline' : 'revised'}-collapsed-${width}.png`) });
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    await info.attach(`width-${width}`, { body: JSON.stringify(geometry), contentType: 'application/json' });
    // The baseline is evidence, including its existing overflow. The revised
    // page must satisfy the bound at every viewport.
    if (!baseline) expect(geometry.document <= geometry.viewport + 1).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('native focus, nested Escape and browser Back/Forward retain the correct draft', async ({ page }) => {
  test.skip(baseline, 'Revised overlay and navigation contract.');
  const { errors, writes } = await fixture(page);
  await page.goto('/admin/studios?previous=1');
  await page.goto('/admin/studios');
  const row = page.locator('table tbody tr').first();
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Edit Profile', exact: true });
  await expect(modal.getByLabel('Studio Name', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => { document.querySelector<HTMLInputElement>('#search')!.focus(); return !!document.querySelector('[role=dialog]')?.contains(document.activeElement); })).toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await modal.getByLabel('Studio Name', { exact: true }).fill('Navigation draft');
  await page.keyboard.press('Escape');
  const decision = page.getByRole('dialog', { name: /unsaved/i });
  await expect(decision).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(decision).toHaveCount(0);
  await expect(modal.getByLabel('Studio Name', { exact: true })).toHaveValue('Navigation draft');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.evaluate(() => history.back());
  await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal.getByLabel('Studio Name', { exact: true })).toHaveValue('Navigation draft');
  await page.evaluate(() => history.back());
  await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: /don't save/i }).click();
  await expect(page).toHaveURL(/previous=1$/);
  await expect(modal).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.goForward();
  await expect(page).toHaveURL(/\/admin\/studios$/);
  expect(await page.evaluate(() => history.state?.__vsf_unsaved_navigation)).toBeUndefined();
  await page.locator('table tbody tr').first().getByRole('button', { name: 'Edit', exact: true }).click();
  await modal.getByLabel('Studio Name', { exact: true }).fill('Another navigation draft');
  await page.evaluate(() => history.back());
  await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: 'Cancel', exact: true }).click();
  await modal.getByRole('button', { name: 'Close profile editor' }).click();
  await decision.getByRole('button', { name: /don't save/i }).click();
  await expect(modal).toHaveCount(0);
  expect(writes).toHaveLength(0); expect(errors).toEqual([]);
});

test('tablet suggestion drawer releases focus and scroll at its real desktop breakpoint', async ({ page }) => {
  test.skip(baseline, 'Revised shared drawer contract.');
  const { errors, writes } = await fixture(page);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/admin/suggestions');
  const card = page.getByRole('button', { name: /Fixture suggestion OPEN/ });
  await card.click();
  const drawer = page.getByRole('dialog', { name: 'Suggestion Details', exact: true });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('textbox', { name: 'Reply message' }).fill('Retained fixture draft');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(drawer).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  await expect(page.getByRole('textbox', { name: 'Reply message' })).toHaveValue('Retained fixture draft');
  expect(await page.evaluate(() => document.activeElement?.closest('[inert]'))).toBeNull();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Close drawer' }).click();
  const decision = page.getByRole('dialog', { name: /unsaved/i });
  await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: /don't save/i }).click();
  await expect(drawer).toHaveCount(0);
  await expect(card).toBeFocused();
  expect(writes).toHaveLength(0); expect(errors).toEqual([]);
});

test('expand, checklist, clean close, save, dirty-close protection and independent privacy save', async ({ page }, info) => {
  test.skip(baseline, 'The original page has no expansion interaction.');
  const { reads, writes, errors } = await fixture(page);
  const expand = page.getByRole('button', { name: 'Expand Fixture Studio 0001', exact: true }).filter({ visible: true });
  const before = reads.length;
  await expand.click();
  await expect(page.locator('#studio-desktop-fixture_studio_1')).toBeVisible();
  await expect(page.locator('#studio-desktop-fixture_studio_1').getByText('Required 11/11 · Optional 0/7')).toBeVisible();
  expect(reads.length).toBe(before);
  await page.getByRole('button', { name: 'Expand Fixture Studio 0002', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('#studio-desktop-fixture_studio_1')).toBeVisible();
  await page.screenshot({ path: info.outputPath('revised-expanded-desktop.png') });
  const detail = page.locator('#studio-desktop-fixture_studio_1');
  await expect(detail.getByRole('button', { name: /^Edit/ })).toHaveCount(0);
  const rowEdit = page.locator('tr[data-studio-id="fixture_studio_1"]').getByRole('button', { name: 'Edit', exact: true });
  await rowEdit.click();
  const modal = page.getByRole('dialog', { name: 'Edit Profile', exact: true });
  await expect(modal.getByLabel('Studio Name', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Close profile editor' }).click();
  await expect(modal).toHaveCount(0); expect(reads.length).toBe(before); expect(writes).toHaveLength(0);
  await expect(page.locator('#studio-desktop-fixture_studio_1')).toBeVisible();

  await rowEdit.click();
  await modal.getByLabel('Studio Name', { exact: true }).fill('Fixture Studio amended');
  await modal.getByRole('button', { name: 'Close profile editor' }).click();
  const decision = page.getByRole('dialog', { name: /unsaved/i });
  await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal.getByLabel('Studio Name', { exact: true })).toHaveValue('Fixture Studio amended');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await modal.getByRole('button', { name: 'Privacy Settings', exact: false }).filter({ visible: true }).click();
  await modal.getByRole('switch', { name: 'Enable Messages', exact: true }).click();
  await expect.poll(() => writes.filter(write => write.body._meta?.showemail !== undefined).length).toBe(1);
  expect(writes.every(write => write.url !== '/api/user/profile')).toBe(true);
  await modal.getByRole('button', { name: 'Basic Info', exact: false }).filter({ visible: true }).click();
  await expect(modal.getByLabel('Studio Name', { exact: true })).toHaveValue('Fixture Studio amended');
  await modal.getByRole('button', { name: 'Save Changes', exact: true }).filter({ visible: true }).first().click();
  await expect.poll(() => writes.filter(write => write.body._meta?.studio_name === 'Fixture Studio amended').length).toBe(1);
  await expect(modal.getByLabel('Studio Name', { exact: true })).toHaveValue('Fixture Studio amended');
  await modal.getByRole('button', { name: 'Close profile editor' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Collapse Fixture Studio amended' }).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(errors).toEqual([]);
});

test('mobile expansion and bounded 80/160/400-row navigation', async ({ page }, info) => {
  test.skip(baseline, 'New bounded navigation.');
  const { reads, errors } = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Expand Fixture Studio 0001', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('#studio-mobile-fixture_studio_1')).toBeVisible();
  await page.locator('#studio-mobile-fixture_studio_1').screenshot({ path: info.outputPath('revised-expanded-mobile.png') });
  for (const limit of [160, 240, 320, 400]) {
    await page.getByRole('button', { name: 'Load More Studios', exact: true }).filter({ visible: true }).click();
    await expect.poll(() => reads.some(read => new URLSearchParams(read).get('limit') === String(limit))).toBe(true);
    await expect(page.getByRole('button', { name: limit === 400 ? 'Next Studios' : 'Load More Studios', exact: true }).filter({ visible: true })).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Next Studios', exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Showing 401–480 of 480')).toBeVisible();
  await page.getByRole('button', { name: 'Previous studios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Expand Fixture Studio 0001', exact: true }).filter({ visible: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('summary click and keyboard disclosure stay independent of the existing row controls', async ({ page }) => {
  test.skip(baseline, 'Revised summary interaction.');
  const { reads, writes, errors } = await fixture(page);
  const row = page.locator('tr[data-studio-id="fixture_studio_1"]');
  const detail = page.locator('#studio-desktop-fixture_studio_1');
  const initialReads = reads.length;
  await row.locator('[data-column="studio"]').getByText('Fixture Studio 0001', { exact: true }).click();
  await expect(detail).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Edit Profile', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Collapse Fixture Studio 0001' }).focus();
  await page.keyboard.press('Enter');
  await expect(detail).toBeHidden();
  await page.keyboard.press('Space');
  await expect(detail).toBeVisible();
  await page.getByRole('button', { name: '14/14', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Type', exact: true }).uncheck();
  await expect(detail.locator('td')).toHaveAttribute('colspan', String(await page.locator('thead th').count()));
  await page.getByRole('checkbox', { name: 'Type', exact: true }).check();
  await page.getByRole('button', { name: '14/14', exact: true }).click();
  await row.getByRole('button', { name: 'Collapse Fixture Studio 0001' }).click();
  expect(reads.length).toBe(initialReads);

  await row.getByRole('checkbox', { name: 'Select Fixture Studio 0001' }).check();
  await expect(detail).toBeHidden();
  await row.getByRole('checkbox', { name: 'Select Fixture Studio 0001' }).uncheck();
  await page.evaluate(() => { (window as any).__fixtureOpened = []; window.open = ((url: string, target: string) => { (window as any).__fixtureOpened.push([url, target]); return null; }) as typeof window.open; });
  await row.getByRole('button', { name: 'View', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__fixtureOpened)).toEqual([['/fixture1', '_blank']]);
  await expect(detail).toBeHidden();
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Edit Profile', exact: true });
  await expect(editor.getByLabel('Studio Name', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Close profile editor' }).click();
  await expect(editor).toHaveCount(0);
  await expect(detail).toBeHidden();
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog', { name: 'Delete Studio?', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(detail).toBeHidden();
  await row.locator('[data-column="featured"] button').click();
  const expiry = page.getByRole('dialog', { name: 'Set Featured expiry date', exact: true });
  await expect(expiry.getByLabel('Featured Until', { exact: false })).toBeVisible();
  await expiry.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(expiry).toHaveCount(0);
  expect(writes).toHaveLength(0);

  for (const column of ['adminReview', 'status', 'visible', 'verified']) {
    const button = row.locator(`[data-column="${column}"] button`).first();
    const before = writes.length;
    await button.click();
    await expect.poll(() => writes.length).toBe(before + 1);
    await expect(button).toBeEnabled();
    await expect(detail).toBeHidden();
  }
  expect(writes.every(write => write.url.startsWith('/api/admin/studios/fixture_studio_1/'))).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.locator('div[data-studio-id="fixture_studio_1"]').filter({ visible: true });
  await mobile.locator('h3').click({ position: { x: 12, y: 8 } });
  await expect(page.locator('#studio-mobile-fixture_studio_1')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Edit Profile', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
