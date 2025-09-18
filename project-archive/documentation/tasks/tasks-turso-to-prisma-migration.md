# Tasks: Turso to Prisma Database Migration

## Project Overview
Migrate all data from the legacy Turso database to the current Prisma database structure, replacing existing poor-quality data with clean legacy data. Create profile categories (studios, voiceovers, other) and establish shared database for two projects.

## Relevant Files

- `migration-scripts/turso-to-prisma-migrator.ts` - Main migration script orchestrating the data transformation
- `migration-scripts/utils/turso-client.ts` - Turso database connection utility with query methods
- `migration-scripts/utils/id-generator.ts` - CUID generation utility for converting legacy INTEGER IDs
- `migration-scripts/utils/data-validators.ts` - Data validation, cleanup, and profile categorization utilities
- `migration-scripts/utils/logger.ts` - Structured logging system for migration progress tracking
- `migration-scripts/data-mappers/user-mapper.ts` - Maps legacy user data to Prisma User model (pending)
- `migration-scripts/data-mappers/profile-mapper.ts` - Maps legacy profile data to Prisma UserProfile model (pending)
- `migration-scripts/data-mappers/studio-mapper.ts` - Extracts and maps studio data from profiles (pending)
- `migration-scripts/data-mappers/image-mapper.ts` - Maps legacy studio_gallery to StudioImage model (pending)
- `migration-scripts/data-mappers/message-mapper.ts` - Maps legacy messages to current Message model (pending)
- `migration-scripts/data-mappers/connection-mapper.ts` - Maps legacy contacts to UserConnection model (pending)
- `migration-scripts/backup/database-backup.ts` - Database backup utility (pending)
- `migration-scripts/verification/data-integrity-checker.ts` - Post-migration validation (pending)
- `docs/database-switch-guide.md` - Guide for switching other project to shared database (pending)

### Notes

- Migration scripts will be placed in `migration-scripts/` directory for organization
- Each data mapper handles transformation for specific legacy tables
- Backup current database before migration to prevent data loss
- Validation scripts ensure data integrity after migration

## Tasks

- [x] 1.0 Setup Migration Infrastructure
  - [x] 1.1 Create migration scripts directory structure (`migration-scripts/`)
  - [x] 1.2 Install and configure Turso client dependencies (`@libsql/client`)
  - [x] 1.3 Create Turso database connection utility (`utils/turso-client.ts`)
  - [x] 1.4 Create CUID generator utility for new record IDs (`utils/id-generator.ts`)
  - [x] 1.5 Create data validation and cleanup utilities (`utils/data-validators.ts`)
  - [x] 1.6 Set up logging system for migration progress tracking
  - [x] 1.7 Create main migration orchestrator script (`turso-to-prisma-migrator.ts`)

- [x] 2.0 Database Preparation and Backup
  - [x] 2.1 Create database backup utility (`backup/database-backup.ts`)
  - [x] 2.2 Backup current Prisma database to SQL dump file
  - [x] 2.3 Test backup restoration process to ensure backup integrity
  - [x] 2.4 Create database cleanup script to remove all existing data
  - [x] 2.5 Execute database cleanup (remove all current poor-quality data)
  - [x] 2.6 Verify database is in clean state with proper schema intact

- [x] 3.0 Core Data Migration (Users and Profiles)
  - [x] 3.1 Create user data mapper (`data-mappers/user-mapper.ts`)
  - [x] 3.2 Analyze legacy user tables (`users`, `shows_users`, `community_users`)
  - [x] 3.3 Map legacy user fields to Prisma User model (handle ID conversion)
  - [x] 3.4 Migrate password hashes and authentication data
  - [x] 3.5 Create profile data mapper (`data-mappers/profile-mapper.ts`)
  - [x] 3.6 Implement profile categorization logic (studio/voiceover/other)
  - [x] 3.7 Map legacy profile fields to Prisma UserProfile model
  - [x] 3.8 Handle social media links and contact preferences
  - [x] 3.9 Execute user and profile migration with progress logging
  - [x] 3.10 Verify user-profile relationships are correctly established

- [x] 4.0 Extended Data Migration (Studios, Images, Messages)
  - [x] 4.1 Create studio data mapper (`data-mappers/studio-mapper.ts`)
  - [x] 4.2 Extract studio information from legacy profile data
  - [x] 4.3 Create Studio records for profiles categorized as studios
  - [x] 4.4 Map location data (latitude/longitude) to studio addresses
  - [x] 4.5 Create image data mapper (`data-mappers/image-mapper.ts`)
  - [x] 4.6 Migrate studio gallery images from `studio_gallery` table
  - [x] 4.7 Handle Cloudinary URLs and image metadata
  - [x] 4.8 Create message data mapper (`data-mappers/message-mapper.ts`)
  - [x] 4.9 Migrate messages from legacy `messages` table
  - [x] 4.10 Create connection data mapper (`data-mappers/connection-mapper.ts`)
  - [x] 4.11 Migrate user connections from `shows_contacts` table
  - [x] 4.12 Handle connection acceptance status and relationships

- [x] 5.0 Validation and Documentation
  - [x] 5.1 Create data integrity checker (`verification/data-integrity-checker.ts`)
  - [x] 5.2 Verify all users were migrated correctly (count validation)
  - [x] 5.3 Verify all profiles have correct categories assigned
  - [x] 5.4 Verify studio records were created for appropriate profiles
  - [x] 5.5 Verify image associations and Cloudinary URLs are working
  - [x] 5.6 Verify message relationships and user connections
  - [x] 5.7 Test application functionality with migrated data
  - [x] 5.8 Create database switch guide (`docs/database-switch-guide.md`)
  - [x] 5.9 Document shared database connection setup for other project
  - [x] 5.10 Create rollback procedure documentation in case of issues
