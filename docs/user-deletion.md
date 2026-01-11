# User Deletion Script (Dev / Prod)

This repo includes a safe, parameterized script for deleting a user and all related data.

## Safety defaults

- **Dry-run by default** (no changes) — you must pass `--confirm` to actually delete.
- Uses `.env.local` by default (override with `--env-file=.env.production`, etc).

## Run (dry-run / preview)

```bash
npm run user:delete -- --email=someone@example.com
```

## Run (actually delete)

```bash
npm run user:delete -- --email=someone@example.com --confirm
```

## Use a different env file (example: production)

```bash
npm run user:delete -- --email=someone@example.com --env-file=.env.production --confirm
```

## Optional flags

- `--user-id=...`: delete by user id (instead of email)
- `--username=...` + `--include-username-match`: also match on username
- `--no-waitlist-delete`: do not delete `waitlist` entries by email

---

# Convenience command: `deletetestaccounts`

If you want to run an interactive “delete test accounts” menu by typing a simple command in Git Bash:

## One-time setup

From the repo root:

```bash
bash scripts/install-bash-commands.sh
```

Then restart Git Bash (or run `source ~/.bashrc`).

## Run

```bash
deletetestaccounts
```
