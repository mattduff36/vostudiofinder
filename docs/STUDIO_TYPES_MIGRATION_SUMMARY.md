# Studio Types Migration Summary

## Overview
This document summarizes the changes made to support multiple studio types per profile instead of a single studio type.

## Database Changes

### 1. Prisma Schema Updates
- **Removed**: Single `studioType` field from `Studio` model
- **Added**: `StudioStudioType` junction table for many-to-many relationship
- **Added**: `studioTypes` relation to `Studio` model

### 2. New Models
```prisma
model StudioStudioType {
  id        String     @id @default(cuid())
  studioId  String     @map("studio_id")
  studioType StudioType @map("studio_type")
  studio    Studio     @relation(fields: [studioId], references: [id], onDelete: Cascade)

  @@unique([studioId, studioType])
  @@map("studio_studio_types")
}
```

## API Changes

### 1. Validation Schemas
- **Updated**: `createStudioSchema` to use `studioTypes` array instead of `studioType`
- **Updated**: `updateStudioSchema` to use `studioTypes` array
- **Updated**: `studioSearchSchema` to use `studioTypes` array

### 2. API Routes
- **Studio Create Route**: Now creates multiple studio type relationships
- **Studio Update Route**: Now handles updating studio types with delete/create pattern
- **Search Route**: Now filters by multiple studio types using `some` clause

### 3. Search Parameters
- **Updated**: Search API now accepts `studioTypes` parameter (comma-separated)
- **Backward Compatible**: Still accepts `studioType` parameter for backward compatibility

## Frontend Changes

### 1. Studio Form
- **Updated**: Changed from single select dropdown to multi-select checkboxes
- **Added**: All available studio types (VOICEOVER, RECORDING, PODCAST, PRODUCTION, MOBILE, HOME)
- **Updated**: Form validation to require at least one studio type

### 2. Search Filters
- **Updated**: Changed from single studio type filter to multiple checkbox selection
- **Updated**: Filter state management to handle arrays
- **Updated**: Clear filters functionality

### 3. Studio Display Components
- **StudiosList**: Now displays up to 2 studio type badges with "+N" indicator for more
- **StudioInfo**: Now displays all studio types as individual badges
- **StudiosPage**: Updated interfaces and state management

## Migration Scripts

### 1. Data Migration
- **File**: `scripts/migrate-studio-types.ts`
- **Purpose**: Migrates existing single studio types to the new many-to-many structure
- **Usage**: Run after database schema migration

### 2. Test Script
- **File**: `scripts/test-studio-types.ts`
- **Purpose**: Verifies the new functionality works correctly
- **Tests**: Create, query, and update operations with multiple studio types

## Breaking Changes

### 1. API Response Format
- Studio objects now return `studioTypes` array instead of `studioType` string
- Search results include `studioTypes` in map markers

### 2. Form Data
- Studio creation/update forms now expect `studioTypes` array
- Search forms now use `studioTypes` array

## Backward Compatibility

### 1. Search API
- Still accepts `studioType` parameter (single value)
- Automatically converts to `studioTypes` array internally

### 2. URL Parameters
- Search URLs can still use `studioType` parameter
- Automatically converted to `studioTypes` array in components

## Testing

### 1. Manual Testing
1. Create a new studio with multiple types
2. Search for studios by multiple types
3. Update studio types
4. Verify display components show multiple types correctly

### 2. Automated Testing
- Run `scripts/test-studio-types.ts` to verify database operations
- Run existing test suite to ensure no regressions

## Deployment Steps

1. **Database Migration**: Run Prisma migration to update schema
2. **Data Migration**: Run `scripts/migrate-studio-types.ts` to migrate existing data
3. **Deploy Code**: Deploy updated application code
4. **Verify**: Run test script to verify functionality

## Notes

- All existing studio data will be preserved during migration
- The migration script creates one studio type relationship for each existing studio
- Search functionality is backward compatible with existing URLs
- UI components gracefully handle both single and multiple studio types

