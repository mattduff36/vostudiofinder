# Installing PostgreSQL Client Tools on Windows

You need `pg_dump` and `pg_restore` to export/import databases. Here are two options:

## Option 1: Install PostgreSQL (Recommended)

1. **Download PostgreSQL**:
   - Go to: https://www.postgresql.org/download/windows/
   - Download the Windows installer (latest version)
   - OR use direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run Installer**:
   - Run the `.exe` file
   - Choose components: **ONLY select "Command Line Tools"** (uncheck PostgreSQL Server if you don't need it)
   - Default installation path: `C:\Program Files\PostgreSQL\16\bin\`

3. **Add to PATH**:
   - Open System Properties → Environment Variables
   - Edit "Path" variable
   - Add: `C:\Program Files\PostgreSQL\16\bin`
   - Click OK

4. **Verify Installation**:
   ```bash
   # Close and reopen your terminal, then run:
   pg_dump --version
   pg_restore --version
   psql --version
   ```

## Option 2: Use Chocolatey (Package Manager)

If you have Chocolatey installed:

```bash
choco install postgresql
```

## Option 3: Alternative - Use Neon Console (No Install Required)

1. **Export from Production**:
   - Go to: https://console.neon.tech
   - Select your production project
   - Go to "Backups" tab
   - Click "Create backup" → Download the backup file

2. **Import to Dev**:
   - Select your dev project  
   - Go to "Restore" tab
   - Upload the backup file

**Note**: This method is slower but requires no local tools.

## After Installation

Once installed, run:

```bash
./scripts/export-production-to-dev.sh
```

This will automatically export production and import to dev database.



