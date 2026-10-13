# Reviewed admin implementation evidence

These files record the completed local verification of the approved reviewed v2 plan. The full contracts, route inventory, release dependencies and limitations are in [the implementation report](../ADMIN_REVIEW_IMPLEMENTATION_2026-10-13.md).

## Machine-readable results

- [Combined verification summary](verification-summary.json): 568 unit/compatibility tests, 51 actual PostgreSQL tests, 6 production-runtime studio browser scenarios, 3 isolated shared-component scenarios and 34 admin route/recovery checks, with each gate's boundary recorded separately.
- [Admin route and recovery outcomes](admin-route-browser-final-summary.json): every one of the 22 routes and 12 recovery checks.
- [Browser source manifest](admin-route-browser-source-check.json): 516 matching source files and the two intentional isolated fixture overrides.
- [Shared component source manifest](components-browser-source-check.json): exact component/style checks for the earlier owner, admin-self and public overlay gate.
- [PostgreSQL suite outcomes](sql-evidence-summary.json): six suites and 51 passing assertions, aggregated from the resolved final runs after targeted fixes. This is not a single all-green invocation, and it does not represent populated production history.

The [portable isolated harness](../../../tests/fixtures/admin-route-smoke-harness/README.md) supplies the route and component tests and reproduction instructions. It belongs under tests. Its isolated layout/database replacements and component routes must never be enabled in application source.

## Controlled screenshots

All studios, customer identities and profile details are invented fixtures. The collapsed reference used the original source in the development runtime; the revised screenshots used the production build. Development tooling is outside the visual contract. Fixed navigation can appear inside the tall expanded element captures; those captures are evidence of the actual component, not presentation mockups.

| Viewport width | Original collapsed view | Revised collapsed view |
|---:|---|---|
| 1440 px | [Original desktop](baseline-collapsed-1440.png) | [Revised desktop](revised-collapsed-1440.png) |
| 1024 px | [Original 1024](baseline-collapsed-1024.png) | [Revised 1024](revised-collapsed-1024.png) |
| 768 px | [Original 768](baseline-collapsed-768.png) | [Revised 768](revised-collapsed-768.png) |
| 390 px | [Original mobile](baseline-collapsed-390.png) | [Revised mobile](revised-collapsed-390.png) |

Additional captures: [expanded desktop details](revised-expanded-desktop.png), [expanded mobile details](revised-expanded-mobile.png), [owner editor](owner-editor-desktop.png), and [public image modal](public-images-mobile.png).

## Interpretation

The browser runs used Chromium, controlled viewports, invented sessions and synthetic API/provider responses. The route matrix additionally used a guarded read-only server database adapter in a disposable checkout. The PostgreSQL suites separately exercised real transactions, locks, constraints and migrations against an owned local fixture with providers mocked. No customer data, live provider request, campaign, refund or deployed login was used. Physical devices, Safari, live maps and populated production migration history are outside this evidence.
