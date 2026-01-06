# Neon Branch Cleanup Script

This script helps you bulk-delete unused preview branches from your Neon database.

## Quick Start

### 1. Get Your Neon API Key

1. Go to [Neon Console](https://console.neon.tech)
2. Click on your profile (bottom left) → **Account Settings**
3. Go to **API keys** tab
4. Click **"Generate new API key"**
5. Give it a name like "Branch Cleanup Script"
6. Copy the key (it will only be shown once!)

### 2. Get Your Project ID

**Option A: From Dashboard URL**
- Go to [Neon Console](https://console.neon.tech)
- Select your project
- The URL will be: `console.neon.tech/app/projects/YOUR_PROJECT_ID`
- Copy the project ID from the URL

**Option B: From Your Screenshot**
- Looking at your Neon dashboard, the project name is: **neon-vo-studio**
- The project ID should be visible in the project settings or URL

### 3. Run the Script

```bash
# Set environment variables and run
NEON_API_KEY=your_api_key_here NEON_PROJECT_ID=your_project_id_here npm run cleanup:neon-branches
```

**Windows PowerShell:**
```powershell
$env:NEON_API_KEY="your_api_key_here"
$env:NEON_PROJECT_ID="your_project_id_here"
npm run cleanup:neon-branches
```

**Windows CMD:**
```cmd
set NEON_API_KEY=your_api_key_here
set NEON_PROJECT_ID=your_project_id_here
npm run cleanup:neon-branches
```

## What the Script Does

1. ✅ Lists all branches in your Neon project
2. ✅ Identifies preview/dependabot branches
3. ✅ Shows you what will be deleted
4. ✅ Deletes them safely (skips protected/primary branches)
5. ✅ Shows remaining branch count

## Safety Features

- ❌ **Will NOT delete** the main/primary branch
- ❌ **Will NOT delete** protected branches
- ✅ **Only deletes** branches starting with `preview/` or containing `dependabot`
- ✅ Includes a 500ms delay between deletions to avoid rate limiting

## Expected Output

```
🔍 Fetching branches from Neon...

Found 10 total branches:

📋 Preview branches to delete:
   - preview/dependabot/docker/... (idle) [ID: xxx]
   - preview/dependabot/npm_an... (idle) [ID: xxx]
   ... (more branches)

⚠️  About to delete 9 preview branches...
⏳ Starting deletion...

✅ Deleted: preview/dependabot/docker/...
✅ Deleted: preview/dependabot/npm_an...
... (more deletions)

🎉 Cleanup complete!
   ✅ Successfully deleted: 9
   ❌ Failed: 0

📊 Remaining branches:
   ⭐ main (active)
   📝 preview/dependabot/npm_and_yarn/next-16.0.10 (idle)

Total branches: 4/10
```

## Troubleshooting

### "Failed to list branches: 401"
- Your API key is invalid or expired
- Generate a new API key from Neon Console

### "Failed to list branches: 404"
- Your project ID is incorrect
- Check the project ID in your Neon dashboard URL

### "Failed to delete branch: 403"
- The branch is protected
- The script will skip protected branches automatically

## Alternative: Manual Deletion

If you prefer to delete branches manually:
1. Go to [Neon Console](https://console.neon.tech) → Branches
2. Click on each preview branch
3. Click **Delete** or **⋯** menu → **Delete branch**




























