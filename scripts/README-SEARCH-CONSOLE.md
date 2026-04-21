# Search Console API Export Script

This project includes a local script that pulls indexing and sitemap data from Google Search Console using OAuth.

## What It Exports

- Indexed vs not-indexed totals
- Not-indexed reasons with affected URL lists
- Sitemap status and crawl metadata

Output files are written to `reports/search-console/<timestamp>/`:

- `summary.json`
- `sitemaps.csv`
- `url-inspections.csv`
- `indexed-urls.csv`
- `not-indexed-urls.csv`
- `not-indexed-reasons.csv`
- `not-indexed-urls-by-reason.json`

## One-Time Setup

1. In Google Cloud Console, create a project (or reuse one).
2. Enable **Search Console API**.
3. Configure OAuth consent screen (External or Internal as needed).
4. Create OAuth Client ID of type **Desktop app**.
5. Download credentials JSON and save as:
   - `google-search-console-oauth.json` in the project root, or
   - any path, then pass `--credentials <path>`, or
   - set `GSC_OAUTH_CLIENT_PATH` in `.env.local`

## Run

```bash
npm run seo:gsc -- --site-url "sc-domain:voiceoverstudiofinder.com"
```

Or URL-prefix property:

```bash
npm run seo:gsc -- --site-url "https://voiceoverstudiofinder.com/"
```

Optional flags:

- `--max-urls 300` (default `250`)
- `--concurrency 4` (default `3`)
- `--sitemap-filter "sitemap.xml"` (inspect only matching sitemap paths)
- `--output-dir "reports/search-console"` (default shown)

Full help:

```bash
npm run seo:gsc:help
```

## Notes

- On first run, a browser window opens for Google OAuth authorization.
- Refresh token is cached at `.cache/search-console/token.json` for future runs.
- URL inspection has quota/rate limits; use `--max-urls` for controlled batches.
