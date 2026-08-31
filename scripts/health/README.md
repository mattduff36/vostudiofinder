# Codebase Health Checker

The health checker is intentionally cheap and mostly static. It detects governance/config drift without requiring production credentials or network access.

Package scripts:

```json
"health": "node scripts/health/health.mjs --mode=quick",
"health:full": "node scripts/health/health.mjs --mode=full"
```

## Quick mode

Checks project governance files, environment-contract drift, EOL Node 25 Docker pin, Docker standalone mismatch, Next 16 middleware/proxy drift, disabled CI, production query logging, high-risk TODOs, large-file advisory hotspots, obvious tracked sensitive paths and `git diff --check`.

WARN is informational and does not fail the command. FAIL indicates a structural/security verification problem and returns non-zero.

## Full mode

When `node_modules` exists, full mode additionally runs:

- `npm run type-check`
- `npm run lint`
- Jest unit tests under `tests/unit` (`npx jest tests/unit --runInBand`)

Full mode does **not** run database integration tests or live-server HTTP tests. Those require `TEST_DATABASE_URL` or a listening app; see `docs/TESTING.md`.

A production build is intentionally opt-in because the current app may require environment/database access during build:

```bash
HEALTH_BUILD=1 npm run health:full
```

Do not interpret skipped environment-dependent checks as passed.
