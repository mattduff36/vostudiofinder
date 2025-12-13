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

### Step 1: Dry Run (Preview Changes) - ALWAYS RUN THIS FIRST

First, run in dry-run mode to see what will be changed without actually making changes:

```bash
npm run privacy:disable-visibility:dry
```

**Alternative commands:**
```bash
# Using tsx directly
tsx scripts/disable-all-visibility-settings.ts --dry-run
```

This will:
- ✅ Show which database you're connected to (with masked credentials)
- ✅ List all profiles that will be affected
- ✅ Show exactly which settings will be disabled
- ✅ **NOT make any changes** to the database

### Step 2: Review the Output

Carefully review the dry-run output to ensure you're:
- Connected to the correct database
- Updating the expected number of profiles
- Comfortable with the changes

### Step 3: Apply Changes

Once you've reviewed the dry-run output and are ready to apply changes:

```bash
npm run privacy:disable-visibility
```

**Alternative commands:**
```bash
# Using tsx directly
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
🔗 Connected to database:
   postgresql://user:***@host.neon.tech/database

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

## Running Locally

This script is designed to run locally in your development environment. It will:
1. Load environment variables from `.env.local` (or `.env`)
2. Connect to your database (Neon PostgreSQL)
3. Show which database it's connecting to (with masked password)
4. Apply changes to the connected database

**Important:** Since your dev and production environments share the same database, changes made locally will affect production data immediately.

## Environment Variables Required

Make sure your `.env.local` file has:
```env
DATABASE_URL="postgresql://..."
```

The script will automatically load this when you run it.

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
