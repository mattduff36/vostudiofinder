import { defineConfig } from '@playwright/test';
import path from 'node:path';

const port = 4208;
const cwd = process.env.VSF_ADMIN_BASELINE_DIR || process.cwd();
const outputDir = process.env.VSF_ADMIN_BROWSER_OUTPUT_DIR || 'test-results/admin-reviewed-v2';
const serverMode = process.env.VSF_ADMIN_USE_BUILD === '1' ? 'start' : 'dev';
export default defineConfig({
  testDir: './tests/browser', testMatch: 'admin-studios-reviewed.spec.ts', workers: 1, retries: 0,
  timeout: 60_000, outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: process.env.VSF_ADMIN_CHROMIUM_PATH ? { executablePath: process.env.VSF_ADMIN_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'] } : {},
  },
  webServer: {
    command: `node "${path.join(cwd, 'node_modules/next/dist/bin/next')}" ${serverMode} -p ${port} -H 127.0.0.1${serverMode === 'dev' ? ' --webpack' : ''}`, cwd,
    url: `http://127.0.0.1:${port}/admin/studios`, reuseExistingServer: false, timeout: 120_000,
    env: { DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:59999/vsf_browser_fixture',
      NEXTAUTH_SECRET: 'vsf_local_browser_fixture_secret_only', NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`, RESEND_API_KEY: 're_fixture_no_delivery',
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '', STRIPE_SECRET_KEY: 'sk_test_fixture_no_money',
      ADMIN_REFUNDS_ENABLED: 'false', REFUND_LIFECYCLE_ENABLED: 'false', REFUND_NOTIFICATIONS_ENABLED: 'false',
      NEXT_TELEMETRY_DISABLED: '1' },
  },
});
