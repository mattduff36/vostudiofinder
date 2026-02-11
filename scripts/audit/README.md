# User Profile Audit System

Comprehensive audit and enrichment system for user accounts and studio profiles.

## Overview

This system provides automated classification, enrichment suggestions, and safe profile updates for the VoiceoverStudioFinder platform.

### Features

- **Automated Classification**: Categorizes accounts into JUNK, NEEDS_UPDATE, NOT_ADVERTISING, EXCEPTION, or HEALTHY
- **Completeness Scoring**: Calculates profile completion percentage (0-100%)
- **Online Enrichment**: Discovers missing data from websites, social profiles, and other sources
- **Admin Review**: Web UI for reviewing and approving suggestions
- **Safe Updates**: Allowlisted fields with before/after audit logging
- **Dev → Prod Workflow**: Test changes in dev before promoting to production

## Architecture

### Database Models

1. **profile_audit_findings** - Classification results and metadata
2. **profile_enrichment_suggestions** - Field-level update proposals with confidence scores
3. **profile_audit_log** - Before/after snapshots of approved changes

### Classification Rules

#### JUNK
- No studio profile + PENDING/EXPIRED status + no activity for 30+ days
- Test account patterns (email/username contains "test")
- Unusually short usernames or display names

#### NEEDS_UPDATE
- Missing key fields (city, coordinates, contact info, services)
- Profile not updated in 1+ years
- Broken/unnormalized URLs (missing https, twitter→x migration needed)

#### NOT_ADVERTISING
- Active user account with no studio profile and no subscription
- Studio profile exists but status=DRAFT/INACTIVE and not visible

#### EXCEPTION
- Payment/subscription without studio profile
- Deletion requested but still active
- Geodata inconsistencies (coords but no city, or vice versa)

#### HEALTHY
- Complete profile with recent updates and no issues

## Workflow

### Step 1: Clone Production to Dev

**⚠️ IMPORTANT: Production database is READ-ONLY during audit**

Use the existing sync script:

```bash
# Clone production data to dev database
ts-node scripts/sync-production-to-dev.ts
```

Or use the full sync:

```bash
ts-node scripts/full-sync-production-to-dev.ts
```

This ensures:
- Production database is never modified
- You have realistic test data
- Changes can be reviewed safely

### Step 2: Run the Audit

```bash
# Full audit (recommended first run)
ts-node scripts/audit/user-profile-audit.ts

# Dry run (no database writes)
ts-node scripts/audit/user-profile-audit.ts --dry-run

# Export existing findings only
ts-node scripts/audit/user-profile-audit.ts --export-only
```

**Output:**
- Database: Stores findings in `profile_audit_findings`
- JSON: `scripts/audit/output/audit-results-YYYY-MM-DDTHH-MM-SS.json`
- CSV: `scripts/audit/output/audit-results-YYYY-MM-DDTHH-MM-SS.csv`

**Example output:**
```
📊 Classification Summary:
  - HEALTHY: 45
  - NEEDS_UPDATE: 28
  - NOT_ADVERTISING: 15
  - JUNK: 8
  - EXCEPTION: 4
```

### Step 3: Run Enrichment

```bash
# Enrich all NEEDS_UPDATE and EXCEPTION accounts (default)
ts-node scripts/audit/enrich-profiles.ts

# Enrich specific classification
ts-node scripts/audit/enrich-profiles.ts --classification=NEEDS_UPDATE

# Enrich single user
ts-node scripts/audit/enrich-profiles.ts --user-id=clx123abc456

# Dry run (no database writes)
ts-node scripts/audit/enrich-profiles.ts --dry-run

# Limit profiles to process
ts-node scripts/audit/enrich-profiles.ts --limit=20
```

**What it does:**
- Fetches websites and extracts structured data (schema.org, OpenGraph)
- Discovers social media links from website HTML
- Normalizes URLs (adds https, migrates twitter→x, removes tracking params)
- Stores suggestions in `profile_enrichment_suggestions` with confidence scores

**Rate limiting:**
- Waits 1 second between profiles to avoid being blocked
- Set custom timeout for slow sites (default: 10-15 seconds)

### Step 4: Review via API or Database

**⚠️ NOTE: The admin UI for this feature has been removed (end of life).**

Review findings and suggestions using the API endpoints (see below) or by querying the database directly:

```sql
-- View findings summary
SELECT classification, COUNT(*) 
FROM profile_audit_findings 
GROUP BY classification;

-- View pending suggestions
SELECT * FROM profile_enrichment_suggestions 
WHERE status = 'PENDING' 
ORDER BY confidence DESC;
```

**Workflow:**
1. Query findings from database or API
2. Review suggestions for specific accounts
3. Manually approve/reject via API (see endpoints below)
4. Apply approved suggestions via API

### Step 5: Apply Updates (Dev)

Changes are applied **in dev database only** when you click "Apply Approved" in the UI.

**What happens:**
- Only allowlisted fields are updated (see below)
- Before/after values are logged in `profile_audit_log`
- Suggestion status changes to "APPLIED"
- Profile `updated_at` timestamp is updated

**Allowlisted Fields:**

Studio Profile:
- `website_url`
- `facebook_url`, `twitter_url`, `x_url`, `linkedin_url`, `instagram_url`
- `youtube_url`, `vimeo_url`, `soundcloud_url`, `tiktok_url`, `threads_url`
- `phone`
- `city`
- `abbreviated_address`

User:
- (Currently none - can add `avatar_url` if needed)

### Step 6: Promote to Production

**⚠️ CRITICAL: This writes to production - verify changes carefully!**

After reviewing changes in dev, promote **only the approved patches** back to production.

```bash
# Coming soon: Promotion script
ts-node scripts/audit/promote-to-production.ts --finding-ids=id1,id2,id3
```

**Safety measures:**
- Only promotes explicitly approved suggestions
- Re-validates allowlisted fields before writing
- Logs all production changes
- Provides rollback data

**Alternative: Manual promotion**
1. Export approved suggestions from dev
2. Review the SQL update statements
3. Apply manually to production database
4. Update audit log in production

## API Endpoints

### GET `/api/admin/audit/users`

**⚠️ DEPRECATED: This endpoint has been removed as part of feature end-of-life.**

Use direct database queries instead to access audit findings data.

**Query params:**
- `classification` - Filter by classification
- `minScore` / `maxScore` - Completeness score range
- `hasStudio` - true/false
- `search` - Search username, email, display name
- `limit` / `offset` - Pagination

**Response:**
```json
{
  "findings": [...],
  "pagination": { "total": 100, "hasMore": true },
  "summary": { "HEALTHY": 45, "NEEDS_UPDATE": 28, ... }
}
```

### GET `/api/admin/audit/suggestions`

List enrichment suggestions.

**Query params:**
- `findingId` - Filter by audit finding
- `status` - PENDING, APPROVED, REJECTED, APPLIED
- `confidence` - HIGH, MEDIUM, LOW
- `fieldName` - Filter by field

### PATCH `/api/admin/audit/suggestions`

Approve or reject suggestions.

**Body:**
```json
{
  "suggestionIds": ["id1", "id2"],
  "action": "APPROVE" | "REJECT"
}
```

### POST `/api/admin/audit/suggestions`

Apply approved suggestions to profiles.

**Body:**
```json
{
  "suggestionIds": ["id1", "id2"]
}
```

**Returns:**
```json
{
  "applied": 2,
  "total": 2,
  "errors": []
}
```

## Database Schema

### profile_audit_findings

```prisma
model profile_audit_findings {
  id                    String
  user_id               String
  studio_profile_id     String?
  classification        AuditClassification
  reasons               Json
  completeness_score    Int
  recommended_action    String?
  metadata              Json?
  created_at            DateTime
  updated_at            DateTime
}
```

### profile_enrichment_suggestions

```prisma
model profile_enrichment_suggestions {
  id                String
  audit_finding_id  String
  field_name        String
  current_value     String?
  suggested_value   String
  confidence        EnrichmentConfidence
  evidence_url      String?
  evidence_type     String?
  status            SuggestionStatus
  reviewed_by_id    String?
  reviewed_at       DateTime?
  applied_at        DateTime?
}
```

### profile_audit_log

```prisma
model profile_audit_log {
  id                String
  suggestion_id     String?
  user_id           String
  studio_profile_id String?
  action            AuditLogAction
  field_name        String?
  old_value         String?
  new_value         String?
  evidence_url      String?
  performed_by_id   String
  notes             String?
  created_at        DateTime
}
```

## Safety Features

### Read-Only Production Access

During audit and enrichment, production is **never written to**.

Environment setup:
- `.env.local` - Dev database (read/write)
- `.env.production` - Production database (read-only for sync)

### Allowlisted Fields

Only specific fields can be auto-updated. This prevents:
- Accidental status changes
- Role escalation
- Breaking critical relationships

### Audit Logging

Every change is logged with:
- Before/after values
- Evidence URL (source of suggestion)
- Admin who performed the action
- Timestamp

### Rollback Capability

Audit log contains `old_value` for every change, enabling:
- Revert specific changes
- Bulk rollback of bad updates
- Compliance with data protection regulations

## Enrichment Sources

### Website Extraction

- **Schema.org / JSON-LD**: Structured business data
- **OpenGraph**: Social sharing metadata
- **Contact patterns**: Email/phone regex matching

### Social Profile Discovery

Extracts social links from website HTML:
- Facebook
- Twitter/X
- LinkedIn
- Instagram
- YouTube
- Vimeo
- SoundCloud

### URL Normalization

- Adds `https://` if missing
- Migrates `twitter.com` → `x.com`
- Removes tracking parameters (utm_*, fbclid, gclid)
- Canonicalizes domain (www/non-www)

### Future: Google Places API

When configured, can:
- Reverse geocode (coords → city/address)
- Forward geocode (address → coords)
- Extract phone/website from business listings

## Troubleshooting

### "No findings found"

Run the audit script first:
```bash
ts-node scripts/audit/user-profile-audit.ts
```

### "No suggestions found"

Run the enrichment script:
```bash
ts-node scripts/audit/enrich-profiles.ts
```

### "Failed to fetch website"

Common causes:
- Site blocks User-Agent (check robots.txt)
- Timeout too short (increase in script)
- SSL certificate issues
- Rate limiting (increase delay between requests)

### Prisma client not generated

```bash
npx prisma generate
```

### Database connection issues

Verify environment files exist:
- `.env.local` (dev)
- `.env.production` (prod)

Check DATABASE_URL is set correctly.

## Best Practices

1. **Always start with dev database clone**
   - Never run audit directly on production
   - Sync production → dev before each audit cycle

2. **Review high-confidence suggestions first**
   - HIGH confidence: Often safe to bulk-approve
   - MEDIUM confidence: Review individually
   - LOW confidence: Verify evidence before approving

3. **Apply changes incrementally**
   - Test with 5-10 profiles first
   - Verify no unexpected side effects
   - Then scale to larger batches

4. **Monitor completeness scores**
   - Track average score over time
   - Set targets (e.g., 80%+ for active studios)
   - Re-run enrichment periodically

5. **Keep audit log clean**
   - Archive old findings after 90 days
   - Purge rejected suggestions monthly
   - Maintain applied logs indefinitely for compliance

## Maintenance

### Re-run audit periodically

```bash
# Monthly full audit recommended
ts-node scripts/audit/user-profile-audit.ts
ts-node scripts/audit/enrich-profiles.ts --limit=50
```

### Clean up old findings

```sql
-- Delete findings older than 90 days
DELETE FROM profile_audit_findings WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete rejected suggestions older than 30 days
DELETE FROM profile_enrichment_suggestions 
WHERE status = 'REJECTED' AND reviewed_at < NOW() - INTERVAL '30 days';
```

### Monitor enrichment success rate

```sql
SELECT 
  confidence,
  status,
  COUNT(*) as count
FROM profile_enrichment_suggestions
GROUP BY confidence, status
ORDER BY confidence DESC, status;
```

## Support

For issues or questions:
1. Check this README
2. Review audit logs in database
3. Check console output for error messages
4. Verify environment setup (.env.local and .env.production)

## License

This audit system is part of the VoiceoverStudioFinder platform.
