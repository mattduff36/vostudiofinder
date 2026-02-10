/**
 * Bulk Verify Legacy User Emails
 * 
 * Marks all 490 legacy users (created on or before Sept 18, 2025) as email_verified = true
 * since they were migrated from the old system and should be considered verified.
 * 
 * This script:
 * 1. Finds all users with studio profiles who have unverified emails
 * 2. Filters to only legacy users (created_at <= 2025-09-18)
 * 3. Updates their email_verified status to true
 * 4. Provides detailed logging and confirmation
 */

import { db } from '../src/lib/db';

async function bulkVerifyLegacyEmails() {
  try {
    console.log('📊 Bulk Email Verification for Legacy Users');
    console.log('=' .repeat(80));
    console.log('');
    
    // Legacy cutoff date: Sept 18, 2025 (when the old system was migrated)
    const legacyCutoffDate = new Date('2025-09-18T23:59:59.999Z');
    
    console.log(`📅 Legacy cutoff date: ${legacyCutoffDate.toLocaleDateString()}`);
    console.log('🔍 Finding unverified legacy users with studio profiles...\n');
    
    // Find all unverified users with studio profiles created on or before the cutoff
    const unverifiedLegacyUsers = await db.users.findMany({
      where: {
        email_verified: false,
        created_at: {
          lte: legacyCutoffDate,
        },
        studio_profiles: {
          isNot: null,
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        created_at: true,
        studio_profiles: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    
    console.log(`Found ${unverifiedLegacyUsers.length} unverified legacy users\n`);
    
    if (unverifiedLegacyUsers.length === 0) {
      console.log('✅ No unverified legacy users found. All legacy emails are already verified!');
      return;
    }
    
    // Show first 10 as preview
    console.log('📋 Preview (first 10 users to be verified):');
    console.log('-'.repeat(80));
    unverifiedLegacyUsers.slice(0, 10).forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (@${user.username})`);
      console.log(`   Studio: ${user.studio_profiles?.name || 'N/A'}`);
      console.log(`   Created: ${user.created_at.toLocaleDateString()}`);
    });
    
    if (unverifiedLegacyUsers.length > 10) {
      console.log(`   ... and ${unverifiedLegacyUsers.length - 10} more`);
    }
    console.log('');
    
    // Confirm before proceeding
    console.log('⚠️  This will mark all these users as email_verified = true');
    console.log('⏳ Starting bulk update in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Perform bulk update
    console.log('🔄 Updating email_verified status...');
    
    const updateResult = await db.users.updateMany({
      where: {
        email_verified: false,
        created_at: {
          lte: legacyCutoffDate,
        },
        studio_profiles: {
          isNot: null,
        },
      },
      data: {
        email_verified: true,
        updated_at: new Date(),
      },
    });
    
    console.log(`✅ Successfully updated ${updateResult.count} users\n`);
    
    // Verify the update
    console.log('🔍 Verifying update...');
    
    const remainingUnverified = await db.users.count({
      where: {
        email_verified: false,
        created_at: {
          lte: legacyCutoffDate,
        },
        studio_profiles: {
          isNot: null,
        },
      },
    });
    
    const totalVerified = await db.users.count({
      where: {
        email_verified: true,
        studio_profiles: {
          isNot: null,
        },
      },
    });
    
    console.log(`✅ Remaining unverified legacy users: ${remainingUnverified}`);
    console.log(`✅ Total verified users with studios: ${totalVerified}\n`);
    
    console.log('=' .repeat(80));
    console.log('✅ BULK VERIFICATION COMPLETE!');
    console.log('=' .repeat(80));
    console.log(`📊 Updated: ${updateResult.count} users`);
    console.log(`📧 All legacy users can now receive system emails`);
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error during bulk verification:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
bulkVerifyLegacyEmails();
