# Disable All Visibility Settings Script

## Overview

This script disables all visibility settings for all user profiles in the database.

## What It Does

Sets the following fields to `false` for ALL user profiles:
- `show_email` - Hides email from public profile
- `show_phone` - Hides phone number from public profile  
- `show_address` - Hides full address from public profile
- `show_directions` - Hides directions link from public profile

## Usage

### Dry Run (Preview Changes)

First, run in dry-run mode to see what will be changed without actually making changes:

```bash
npm run tsx scripts/disable-all-visibility-settings.ts -- --dry-run
```

or

```bash
tsx scripts/disable-all-visibility-settings.ts --dry-run
```

### Apply Changes

Once you've reviewed the dry-run output and are ready to apply changes:

```bash
npm run tsx scripts/disable-all-visibility-settings.ts
```

or

```bash
tsx scripts/disable-all-visibility-settings.ts
```

**Note:** The script will show a 5-second countdown before applying changes. Press `Ctrl+C` to cancel.

## Output

The script will show:
1. Total number of user profiles found
2. Number of profiles with visibility settings currently enabled
3. List of affected users and which settings will be changed
4. Total count of changes
5. Confirmation of updates applied

### Example Output

```
🔍 Checking user profiles...

Found 150 user profiles

📊 Profiles with visibility settings enabled: 45

Settings that will be disabled:

1. JohnStudio - show_email, show_phone, show_address
2. SarahVoice - show_phone, show_directions
3. MikeAudio - show_email, show_address, show_directions
...

📝 Total changes: 178 settings across 45 profiles

🔄 Updating profiles...

✅ Successfully updated 45 profiles

📋 Summary:
   - show_email: disabled for all
   - show_phone: disabled for all
   - show_address: disabled for all
   - show_directions: disabled for all

✨ All visibility settings have been disabled!
```

## Safety Features

1. **Dry Run Mode** - Preview changes before applying
2. **Detailed Preview** - Shows exactly which profiles and settings will be affected
3. **5-Second Countdown** - Time to cancel before changes are applied
4. **Database Transaction** - Uses Prisma's updateMany for consistency
5. **Error Handling** - Rolls back on errors and shows clear error messages

## When to Use

Use this script when you need to:
- Bulk privacy update for all users
- Prepare for a privacy policy change
- Reset visibility settings to default (private) state
- Comply with data protection requirements

## Reverting Changes

If you need to restore visibility settings, you'll need to either:
1. Have users manually re-enable settings in their profile
2. Restore from a database backup taken before running this script

**Important:** This script does NOT create a backup. Make sure you have a database backup before running!

## Database Backup Recommendation

Before running this script on production:

```bash
# Example backup command (adjust for your database)
pg_dump -h your-host -U your-user -d your-database > backup_before_visibility_changes.sql
```

## Environment Variables Required

Make sure your `.env` file has:
```env
DATABASE_URL="postgresql://..."
```

## Technical Details

- **Table:** `user_profiles`
- **Fields Updated:** `show_email`, `show_phone`, `show_address`, `show_directions`
- **Update Method:** Prisma `updateMany`
- **Filters:** Only updates profiles where at least one visibility setting is currently `true`

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npm install
npm run db:generate
```

### "Environment variables loaded from .env" but connection fails
- Check your `DATABASE_URL` in `.env`
- Verify database is running and accessible
- Test connection: `npm run db:studio`

### Script hangs during countdown
- Press `Ctrl+C` to cancel
- This is intentional - gives you time to cancel before applying changes

## Related Scripts

- `scripts/migrate-studio-types.ts` - Migrate studio type data
- `scripts/seed-database.ts` - Seed initial database data
- `scripts/geocode-missing-studios.ts` - Add geocoding to studios

---

**⚠️ WARNING:** This script affects ALL user profiles. Always test in development first!
