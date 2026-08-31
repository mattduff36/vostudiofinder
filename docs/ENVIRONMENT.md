# Environment Configuration

Status: canonical environment contract guide
Last reviewed: 31 August 2026

## Principle

Environment files contain deployment-specific values. Never commit real secrets. Exact variables required by a feature must be confirmed against current code/provider configuration, not copied from an old setup guide.

The audited `env.example` is stale and should be refreshed in a dedicated config/documentation workstream. The health checker reports code-referenced keys that are missing from it.

## Client-visible variables

Variables beginning with `NEXT_PUBLIC_` are exposed to browser code. Current code/config references include public base/site URL, Google Maps key, Stripe publishable key, Turnstile site key and build metadata. Never place server secrets in a `NEXT_PUBLIC_*` variable.

## Server-side categories

The current repository references server-side configuration for:

- PostgreSQL/Prisma
- NextAuth and OAuth providers
- Stripe secret/webhook/price identifiers
- Resend sending/webhook configuration
- Cloudinary
- Redis/cache
- Sentry sync/webhook/admin integration
- Neon administrative scripts
- Google Search Console tooling
- cron authentication
- Turnstile secret verification

Some tools/scripts may use variables that are not required by the application runtime itself. Keep environment requirements scoped by command/deployment surface rather than declaring every key mandatory everywhere.

## Environment separation

- Local development: use non-production databases/provider modes whenever possible.
- Preview/staging: use isolated non-production data/payment/email resources when available.
- Production: values live in the deployment platform/secure secret store, not committed files.

Before database, Stripe, real-email or destructive operations, identify the environment explicitly.

## Refreshing `env.example`

When the dedicated cleanup is performed:

1. inventory `process.env` usage plus framework/provider implicit requirements
2. remove genuinely retired Turso/PayPal/legacy variables only after confirming no scripts/operations still need them
3. add missing active variables with safe placeholders
4. group variables by runtime/tool and mark required vs optional
5. never copy real values from `.env*` into the example
6. run `npm run health` and verify the env-contract warning improves without hiding intentional implicit variables
