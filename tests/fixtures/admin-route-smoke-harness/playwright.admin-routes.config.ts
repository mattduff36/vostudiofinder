import { defineConfig } from '@playwright/test';
import path from 'node:path';
const port = 4217, outputDir = '../implementation-work/admin-route-browser-results';
export default defineConfig({ testDir: './tests/browser', testMatch: 'admin-routes-isolated.spec.ts', workers: 1, retries: 0,
  timeout: 60_000, outputDir, reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: { executablePath: path.resolve('../implementation-work/browser-runtime/chromium'), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'] } },
  webServer: { command: `node node_modules/next/dist/bin/next dev -p ${port} -H 127.0.0.1 --webpack`, cwd: process.cwd(), url: `http://127.0.0.1:${port}/component-validation`, reuseExistingServer: false, timeout: 120_000,
    env: { VSF_ADMIN_ROUTE_FIXTURE: '1', DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:59999/vsf_browser_fixture',
      NEXTAUTH_SECRET: 'vsf_admin_route_fixture_secret_only', NEXTAUTH_URL: `http://127.0.0.1:${port}`, NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      RESEND_API_KEY: 're_fixture_no_delivery', STRIPE_SECRET_KEY: 'sk_test_fixture_no_money', NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '', GOOGLE_MAPS_API_KEY: '',
      EMAIL_CAMPAIGNS_ENABLED: 'false', ADMIN_REFUNDS_ENABLED: 'false', REFUND_LIFECYCLE_ENABLED: 'false', REFUND_NOTIFICATIONS_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1' } },
});
