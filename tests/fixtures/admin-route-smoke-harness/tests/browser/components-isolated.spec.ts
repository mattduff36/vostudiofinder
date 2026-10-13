import { test, expect, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { adminStudioFixture, adminProfileFixture } from '../fixtures/admin-studios';
import { adminProfileToProfileData } from '../../src/lib/profile/adminProfileAdapter';

async function fixture(page: Page, adminSelf = false) {
  const studio = adminStudioFixture(1), reads: string[] = [], writes: Array<{ url: string; body: any }> = [], errors: string[] = [];
  const user = { id: 'fixture_user_1', username: 'fixture1', email: 'fixture1@example.invalid', display_name: 'Fixture Owner 1', role: adminSelf ? 'ADMIN' : 'USER', email_verified: true };
  let owner = adminProfileToProfileData(adminProfileFixture(studio));
  owner.user.email_verified = true;
  if (owner.studio) owner.studio.images = [{ id: 'fixture_image', image_url: '/fixture.png', alt_text: 'Owner fixture image', sort_order: 0 }];
  const token = await encode({ token: { ...user, sub: user.id }, secret: 'vsf_components_fixture_secret_only' });
  await page.context().addCookies([{ name: 'next-auth.session-token', value: token, url: 'http://127.0.0.1:4216', httpOnly: true }, { name: 'vsf_cookie_consent', value: 'decline', url: 'http://127.0.0.1:4216' }]);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()), method = route.request().method();
    if (url.origin !== 'http://127.0.0.1:4216') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/session') return json({ user, expires: '2099-01-01T00:00:00Z' });
    if (method !== 'GET') {
      let body: any = {}; try { body = route.request().postDataJSON(); } catch { /* no real uploads */ }
      writes.push({ url: url.pathname, body });
      if (url.pathname === '/api/user/profile') owner = { ...owner, user: { ...owner.user, ...body.user }, profile: { ...owner.profile, ...body.profile }, studio: { ...owner.studio!, ...body.studio } };
      return json({ success: true });
    }
    reads.push(url.pathname);
    if (url.pathname === '/api/user/profile') return json({ data: { ...owner, user: { ...owner.user, id: user.id }, studio: { ...owner.studio, studio_types: owner.studio_types } } });
    if (url.pathname === '/api/admin/studios/by-username/fixture1') return json({ studio: { id: studio.id } });
    if (url.pathname === `/api/admin/studios/${studio.id}`) return json(adminProfileFixture(studio));
    if (url.pathname === '/api/platform-updates') return json({ updates: [{ id: 'fixture_update', title: 'Fixture update', description: 'Synthetic product update for overlay verification.', category: 'IMPROVEMENT', release_date: '2026-10-12T00:00:00Z', is_highlighted: false }] });
    return json({ data: [], success: true });
  });
  await page.goto('/component-validation');
  await expect(page.getByRole('heading', { name: 'Isolated component verification' })).toBeVisible();
  return { reads, writes, errors };
}

test('owner editing retains section draft, nested crop cancel focus/scroll, and saves through owner API', async ({ page }, info) => {
  const { reads, writes, errors } = await fixture(page);
  const trigger = page.getByRole('button', { name: 'Edit own profile', exact: true }); await trigger.click();
  const editor = page.getByRole('dialog', { name: 'Edit Profile', exact: true });
  await editor.getByLabel('Studio Name', { exact: true }).fill('Owner browser draft');
  await editor.getByRole('button', { name: 'Images', exact: true }).filter({ visible: true }).click();
  await editor.getByRole('checkbox').check();
  await editor.locator('input[type=file][accept="image/png,image/jpeg,image/jpg,image/webp"]').setInputFiles('public/fixture.png');
  const cropper = page.getByRole('dialog', { name: 'Crop image', exact: true }); await expect(cropper).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape'); await expect(cropper).toHaveCount(0); await expect(editor).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await editor.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('image-modal-open'))).toBe(false);
  await editor.getByRole('button', { name: 'Basic Info', exact: true }).filter({ visible: true }).click();
  await expect(editor.getByLabel('Studio Name', { exact: true })).toHaveValue('Owner browser draft');
  await page.keyboard.press('Escape');
  const decision = page.getByRole('dialog', { name: /unsaved/i }); await expect(decision).toBeVisible();
  await decision.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor.getByLabel('Studio Name', { exact: true })).toHaveValue('Owner browser draft');
  await editor.getByRole('button', { name: 'Save Changes', exact: true }).filter({ visible: true }).click();
  await expect.poll(() => writes.filter(write => write.url === '/api/user/profile').length).toBe(1);
  await expect(editor.getByRole('button', { name: 'Save Changes', exact: true }).filter({ visible: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath('owner-editor-desktop.png') });
  await editor.getByRole('button', { name: 'Close profile editor' }).click(); await expect(editor).toHaveCount(0);
  await expect(trigger).toBeFocused(); expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(writes.every(write => !write.url.startsWith('/api/admin/'))).toBe(true);
  expect(reads.every(read => !read.startsWith('/api/admin/'))).toBe(true); expect(errors).toEqual([]);
});

test('an admin editing self resolves its own studio without falling into another editor target', async ({ page }) => {
  const { reads, writes, errors } = await fixture(page, true);
  await page.getByRole('button', { name: 'Edit admin self profile', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Edit Profile', exact: true });
  await expect(editor.getByLabel('Studio Name', { exact: true })).toHaveValue('Fixture Studio 0001');
  expect(reads).toContain('/api/admin/studios/by-username/fixture1');
  expect(reads).toContain('/api/admin/studios/fixture_studio_1');
  const count = reads.length; await editor.getByRole('button', { name: 'Close profile editor' }).click();
  await expect(editor).toHaveCount(0); expect(reads.length).toBe(count); expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('mobile public images and Whats New release focus, scroll and document classes', async ({ page }, info) => {
  const { writes, errors } = await fixture(page); await page.setViewportSize({ width: 390, height: 844 });
  const imagesTrigger = page.getByRole('button', { name: 'Open public images', exact: true }); await imagesTrigger.click();
  const viewer = page.getByRole('dialog', { name: 'Studio images', exact: true }); await expect(viewer).toBeVisible();
  await expect(viewer.getByAltText('First fixture image')).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await page.evaluate(() => document.documentElement.classList.contains('image-modal-open'))).toBe(true);
  await viewer.getByRole('button', { name: 'Go to image 2' }).click(); await expect(viewer.getByAltText('Second fixture image')).toBeVisible();
  await page.screenshot({ path: info.outputPath('public-images-mobile.png') });
  await page.keyboard.press('Escape'); await expect(viewer).toHaveCount(0); await expect(imagesTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(''); expect(await page.evaluate(() => document.documentElement.classList.contains('image-modal-open'))).toBe(false);
  const newsTrigger = page.getByRole('button', { name: "Open what's new", exact: true }); await newsTrigger.click();
  const news = page.getByRole('dialog'); await expect(news.getByRole('heading', { name: "What's New", exact: true })).toBeVisible();
  await expect(news.getByText('Fixture update', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab'); expect(await news.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(news).toHaveCount(0); await expect(newsTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.getByRole('link', { name: 'Fixture navigation' }).click(); await expect(page).toHaveURL(/component-validation\/destination$/);
  await expect(page.getByRole('heading', { name: 'Fixture destination' })).toBeVisible();
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});
