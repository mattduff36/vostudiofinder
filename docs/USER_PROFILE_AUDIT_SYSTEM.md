# User Profile Audit System

**Status**: ✅ Implemented (January 2026)

## Quick Start

### Prerequisites

1. **Database Setup**: Ensure `.env.local` (dev) and `.env.production` (prod) files exist
2. **Prisma Client**: Run `npx prisma generate` to generate new models
3. **Database Migration**: Push schema changes to dev database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to dev database
npx prisma db push
```

### Complete Workflow

```bash
# 1. Clone production data to dev
ts-node scripts/sync-production-to-dev.ts

# 2. Run audit on dev database
ts-node scripts/audit/user-profile-audit.ts

# 3. Run enrichment to generate suggestions
ts-node scripts/audit/enrich-profiles.ts

# 4. Review and approve suggestions in admin UI
# Navigate to: http://localhost:3000/admin/audit/users

# 5. Apply approved suggestions (in UI or via script)
# Click "Apply Approved" button in the UI

# 6. Promote approved changes to production (future)
# ts-node scripts/audit/promote-to-production.ts
```

## Overview

Comprehensive system for auditing user accounts and studio profiles, identifying issues, enriching missing data, and safely updating profiles.

### What Problems Does This Solve?

1. **Data Quality**: Identifies incomplete, outdated, or inconsistent profiles
2. **Data Enrichment**: Automatically discovers missing information from online sources
3. **Account Classification**: Categorizes accounts (JUNK, NEEDS_UPDATE, NOT_ADVERTISING, etc.)
4. **Safe Updates**: Controlled, auditable updates with before/after logging
5. **Staging Workflow**: Test changes in dev before promoting to production

## System Components

### 1. Database Models (Prisma)

#### profile_audit_findings
Stores classification results for each user/profile.

Fields:
- `classification`: JUNK | NEEDS_UPDATE | NOT_ADVERTISING | EXCEPTION | HEALTHY
- `completeness_score`: 0-100% profile completion
- `reasons`: Array of classification reasons
- `recommended_action`: Suggested next steps
- `metadata`: Additional classification data

#### profile_enrichment_suggestions
Field-level update proposals with confidence scores.

Fields:
- `field_name`: Which field to update
- `current_value`: Existing value (or null)
- `suggested_value`: Proposed new value
- `confidence`: HIGH | MEDIUM | LOW
- `status`: PENDING | APPROVED | REJECTED | APPLIED
- `evidence_url`: Source of the suggestion
- `evidence_type`: Type of evidence (website, social, etc.)

#### profile_audit_log
Audit trail of all approved changes.

Fields:
- `action`: FIELD_UPDATE | STATUS_CHANGE | VISIBILITY_CHANGE | BULK_UPDATE | MANUAL_REVIEW
- `field_name`: Which field was changed
- `old_value`: Value before change
- `new_value`: Value after change
- `performed_by_id`: Admin who made the change

### 2. Scripts

#### `scripts/audit/user-profile-audit.ts`
Main audit script that classifies all users/profiles.

**Features:**
- Queries all users with related data
- Applies classification rules
- Calculates completeness scores
- Stores findings in database
- Exports to JSON/CSV

**Usage:**
```bash
# Full audit
ts-node scripts/audit/user-profile-audit.ts

# Dry run (no DB writes)
ts-node scripts/audit/user-profile-audit.ts --dry-run

# Export only (from existing findings)
ts-node scripts/audit/user-profile-audit.ts --export-only
```

#### `scripts/audit/enrich-profiles.ts`
Enrichment script that discovers missing data.

**Features:**
- Fetches websites and extracts structured data
- Discovers social media links
- Normalizes URLs (https, twitter→x, remove tracking)
- Generates field-level suggestions
- Confidence scoring

**Usage:**
```bash
# Enrich all NEEDS_UPDATE/EXCEPTION
ts-node scripts/audit/enrich-profiles.ts

# Enrich specific classification
ts-node scripts/audit/enrich-profiles.ts --classification=NEEDS_UPDATE

# Enrich single user
ts-node scripts/audit/enrich-profiles.ts --user-id=clx123

# Limit profiles processed
ts-node scripts/audit/enrich-profiles.ts --limit=20

# Dry run
ts-node scripts/audit/enrich-profiles.ts --dry-run
```

### 3. API Endpoints

#### `GET /api/admin/audit/users`
List audit findings with filtering and pagination.

Query params:
- `classification`: Filter by classification
- `minScore` / `maxScore`: Completeness score range
- `hasStudio`: Filter by studio existence
- `search`: Search username/email/display name
- `limit` / `offset`: Pagination

#### `GET /api/admin/audit/suggestions`
List enrichment suggestions.

Query params:
- `findingId`: Filter by specific audit finding
- `status`: PENDING | APPROVED | REJECTED | APPLIED
- `confidence`: HIGH | MEDIUM | LOW
- `fieldName`: Filter by field

#### `PATCH /api/admin/audit/suggestions`
Approve or reject suggestions.

Body:
```json
{
  "suggestionIds": ["id1", "id2"],
  "action": "APPROVE" | "REJECT"
}
```

#### `POST /api/admin/audit/suggestions`
Apply approved suggestions to profiles.

Body:
```json
{
  "suggestionIds": ["id1", "id2"]
}
```

### 4. Admin UI

Location: `/admin/audit/users`

**Two Views:**

1. **Findings View**
   - See all classified accounts
   - Filter by classification
   - View completeness scores
   - See reasons and recommendations
   - Click "View Details" to see suggestions

2. **Suggestions View**
   - Review enrichment suggestions
   - See current vs. suggested values
   - Check confidence scores
   - Bulk approve/reject/apply
   - Filter by status/confidence

## Classification Rules

### JUNK (Likely abandoned/fake accounts)
- No studio profile + PENDING/EXPIRED status + no activity for 30+ days
- Test account patterns (email/username contains "test")
- Unusually short usernames or display names

**Recommended Action**: Flag for deletion after manual review

### NEEDS_UPDATE (Real accounts with incomplete data)
- Missing key fields: city, coordinates, contact info, services, studio types
- Profile not updated in 1+ years
- Broken/unnormalized URLs (missing https, twitter→x migration)

**Recommended Action**: Enrich with missing data

### NOT_ADVERTISING (Users without intent to list studio)
- Active user with no studio profile and no subscription
- Studio profile exists but DRAFT/INACTIVE and not visible

**Recommended Action**: No action needed (potential clients/browsers)

### EXCEPTION (Inconsistent/suspicious data)
- Payment/subscription without studio profile
- Deletion requested but still active
- Geodata inconsistencies (coords but no city, or vice versa)
- Duplicate/near-duplicate profiles

**Recommended Action**: Manual review required

### HEALTHY (Complete, up-to-date profiles)
- All key fields present
- Recent updates
- No data quality issues

**Recommended Action**: None

## Completeness Scoring (0-100%)

### Essential Fields (60 points)
- Studio name (10pts)
- City (10pts)
- Coordinates (10pts)
- About/description (10pts)
- Studio types (10pts)
- Services (10pts)

### Important Fields (25 points)
- Phone (5pts)
- Website (5pts)
- Images (5pts)
- Equipment (5pts)
- Social links (5pts)

### Nice to Have (15 points)
- Rates (5pts)
- Connection methods (5pts)
- User avatar (5pts)

## Enrichment Sources

### 1. Website Extraction
- **Schema.org / JSON-LD**: Structured business data
- **OpenGraph**: Social sharing metadata
- **Contact patterns**: Regex matching for phone/email

### 2. Social Profile Discovery
Extracts social links from website HTML:
- Facebook, Twitter/X, LinkedIn
- Instagram, YouTube, Vimeo
- SoundCloud, TikTok, Threads

### 3. URL Normalization
- Adds `https://` if missing
- Migrates `twitter.com` → `x.com`
- Removes tracking parameters
- Canonicalizes domains

### 4. Future: Google Places API
When configured:
- Reverse geocode (coords → city/address)
- Forward geocode (address → coords)
- Extract phone/website from listings

## Safety Features

### 1. Dev → Prod Workflow
- Never audit production directly
- Clone prod data to dev
- Test all changes in dev
- Promote only approved patches to prod

### 2. Allowlisted Fields
Only specific fields can be auto-updated:

**Studio Profile:**
- `website_url`
- Social links: `facebook_url`, `twitter_url`, `x_url`, `linkedin_url`, `instagram_url`, etc.
- `phone`
- `city`
- `abbreviated_address`

**User:**
- None (currently)

### 3. Audit Logging
Every change logs:
- Before/after values
- Evidence URL
- Admin who performed action
- Timestamp

### 4. Rollback Capability
Audit log contains `old_value` for every change:
- Revert specific changes
- Bulk rollback
- Compliance with data regulations

## Best Practices

### 1. Regular Audits
Run monthly full audits:
```bash
ts-node scripts/audit/user-profile-audit.ts
ts-node scripts/audit/enrich-profiles.ts --limit=50
```

### 2. Review by Confidence
- **HIGH**: Often safe to bulk-approve
- **MEDIUM**: Review individually
- **LOW**: Verify evidence carefully

### 3. Incremental Application
- Test with 5-10 profiles first
- Verify no unexpected side effects
- Then scale to larger batches

### 4. Monitor Metrics
- Track average completeness score
- Set targets (e.g., 80%+ for active studios)
- Monitor classification distribution

### 5. Archive Old Data
```sql
-- Archive findings older than 90 days
DELETE FROM profile_audit_findings 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete rejected suggestions older than 30 days
DELETE FROM profile_enrichment_suggestions 
WHERE status = 'REJECTED' 
AND reviewed_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### No findings found
```bash
# Run audit first
ts-node scripts/audit/user-profile-audit.ts
```

### No suggestions found
```bash
# Run enrichment
ts-node scripts/audit/enrich-profiles.ts
```

### Prisma client errors
```bash
# Regenerate client
npx prisma generate
```

### Database connection issues
Verify:
- `.env.local` exists with dev DATABASE_URL
- `.env.production` exists with prod DATABASE_URL
- Both URLs are different
- Databases are accessible

### Website fetch failures
- Check site's robots.txt
- Increase timeout in script
- Check SSL certificates
- Reduce rate (increase delay)

## Future Enhancements

### Phase 1: Basic Improvements
- [ ] Promotion script for dev → prod
- [ ] Google Places API integration
- [ ] Duplicate profile detection
- [ ] Email notifications for admins

### Phase 2: Advanced Features
- [ ] ML-based confidence scoring
- [ ] Automated scheduling (cron)
- [ ] Batch operation webhooks
- [ ] Historical trending reports

### Phase 3: Self-Service
- [ ] Studio owner self-audit dashboard
- [ ] Owner-initiated enrichment requests
- [ ] Automated enrichment (with opt-in)
- [ ] Profile quality badges

## Technical Details

### Dependencies
- `@prisma/client` - Database ORM
- `csv-writer` - CSV export
- `dotenv` - Environment config
- Node.js built-ins: `https`, `http`, `fs`, `path`, `readline`

### Database Indexes
```prisma
@@index([user_id])
@@index([classification])
@@index([completeness_score])
@@index([status])
@@index([confidence])
@@index([field_name])
@@index([created_at])
```

### Rate Limiting
- 1 second delay between profile enrichments
- 10-15 second timeout per website fetch
- Respects robots.txt (User-Agent: VoiceoverStudioFinder-Bot/1.0)

## Support & Documentation

- **Script README**: `scripts/audit/README.md`
- **Admin UI**: `/admin/audit/users`
- **API Docs**: See API endpoint comments in code

## License

Part of VoiceoverStudioFinder platform.

---

**Last Updated**: January 16, 2026  
**Status**: ✅ Fully Implemented  
**Version**: 1.0.0
