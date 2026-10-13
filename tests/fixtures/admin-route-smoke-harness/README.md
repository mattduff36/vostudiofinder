# Isolated admin route browser smoke fixture

This bundle exercises all 22 admin route components with current application styles, real admin navigation, synthetic session cookies, controlled API responses, and a read-only substitute for server-side database reads. It must be used in a disposable checkout. **Do not copy `isolated-overrides` into the application checkout or deploy it.**

## Reproduce

1. Create a fresh disposable copy of the current working source, including `src`, `public`, Prisma types, package files, and the Next/TypeScript/PostCSS configuration. Do not copy environment files, build output, or the application's `.git` directory. The tested copy was `vostudiofinder-components-validation`, next to the application checkout.
2. Use the application's existing installed dependencies in the disposable copy. The recorded run used a symlink to its `node_modules`; it did not install packages or generate a new Prisma client.
3. Copy this bundle's `tests` files and `playwright.admin-routes.config.ts` to the matching paths in the disposable copy. Preserve any other test files already there.
4. Copy only the contents of `isolated-overrides` into the disposable copy. These replace the root layout and `src/lib/db.ts`, and add the isolated component fixture used as the local server readiness URL.
5. Set the Chromium executable location in the copied Playwright config if necessary. The recorded runtime is resolved relative to the disposable checkout at `../implementation-work/browser-runtime/chromium`. Port 4217 must be free. The config starts Next and Chromium in the same process namespace and uses a separate `.next` directory.
6. Run `npx playwright test --config=playwright.admin-routes.config.ts` in the disposable copy. The configuration supplies only synthetic loopback database and provider settings, disables delivery/refund activation, and uses one worker without retries.
7. Read `../implementation-work/admin-route-browser-results/results.json`. Its expected final inventory is 34 tests: 22 route smokes, ten client-page recovery tests, one server Analytics recovery test, and one campaign refresh regression.

## Exact fixture boundaries

- `src/app/layout.tsx` supplies a synthetic ADMIN session through the actual application SessionProvider and mounts the actual ToastProvider, ConfirmDialog, and UnsavedChangesDialog with current global CSS and the exact production main wrapper spacing (`pt-16 pb-40 md:pt-[72px] md:pb-0`). This intentionally omits unrelated production root providers and third-party instrumentation; those are outside this route smoke gate.
- `src/lib/db.ts` re-exports `tests/fixtures/admin-route-db.ts`. Its import guard requires `VSF_ADMIN_ROUTE_FIXTURE=1` and database URL host `127.0.0.1`, port `59999`. It never constructs Prisma, has no mutation methods, and has no database or network fallback. It serves synthetic reads for the actual server-rendered overview, waitlist, and analytics implementations. A fixture cookie triggers Analytics unavailability.
- `/component-validation` and `/component-validation/destination` are isolated-only fixture routes from the separate owner/public modal verification. The admin suite uses the former solely for server readiness. Neither exists in the application source.
- All 22 actual admin page source files, their actual admin layout/navigation, the auth guards, client components, and styles remain unchanged. The source equality manifest records 516 matching source files and the two intentional overrides.
- `admin-route-api.ts` signs a synthetic NextAuth cookie and intercepts client API calls. It aborts all external browser traffic. Any unmatched API call or write fails the test; the two explicitly allowed POST calls only return preview fixtures. Sending, starting a campaign, content edits, refunds, image uploads, and database mutations are prohibited.
- Client-page smokes hold the primary GET response to observe the initial loading state before releasing fixture data. Every route then uses actual page navigation. Server pages exercise their real server component and rendering path against synthetic reads; this is not a live database integration or login test.
- Preview and test-email routes use the real sandboxed iframe UI and a synthetic preview response. No test email is submitted.

The campaign detail regression is paired with `tests/unit/email/campaign-detail-ui.test.tsx` in the application checkout. Those four tests cover initial retry pending state, retained loaded content, read-error recovery, and preservation of durable or action-related uncertainty notices.

## Earlier owner, admin-self and public overlay gate

The bundle also retains the exact recorded `playwright.components.config.ts` and `tests/browser/components-isolated.spec.ts`, together with `public/fixture.png` and both component fixture routes. Copy the image into the disposable copy's `public` directory. Run the following separately from the admin route suite:

```sh
npx playwright test --config=playwright.components.config.ts
```

That configuration uses port 4216 and writes `../implementation-work/components-browser-results/results.json`. Its recorded run passed **3 / 3 scenarios in 22.9 seconds**: owner draft/section navigation, cropper cancel/focus/scroll and mocked owner save; admin self-target resolution and clean close; mobile public image switching, What's New focus/close, and normal navigation. The recorded result and source manifest are retained separately as `components-browser-results/results.json` and `components-browser-source-check.json`.

The earlier component run used a minimal root layout without the later admin route fixture's session wrapper, main header inset, or server database substitute. Those were fixture additions for this admin inventory; no production component changed as a result. The bundled current root layout retains explicit fixture sessions and the production main spacing. The component page supplies its own owner/admin-self SessionProvider and uses its own synthetic API/cookie configuration. The component routes never query a server database. The historical result is not presented as a rerun against these later fixture wrapper additions.

The tests run actual component code and CSS in desktop Chromium and a mobile-size Chromium viewport. APIs are synthetic, including the owner save response; selecting the solid-color image opens the real client cropper and then cancels it. No actual image upload, email, refund, provider request, or database write occurs. The checks do not establish full `/dashboard` route integration, mobile hardware or Safari behavior, touch pinch/swipe gestures, map overlays, or live authentication/provider/database behavior.
