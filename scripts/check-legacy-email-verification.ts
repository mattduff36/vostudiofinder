/**
 * Check Email Verification Status for Legacy Users
 * 
 * Checks if legacy users (those who existed before the new system) have verified emails
 */

import { db } from '../src/lib/db';

async function checkLegacyEmailVerification() {
  try {
    console.log('📊 Checking email verification status for all users...\n');
    
    // Get all users with studio profiles
    const allUsers = await db.users.findMany({
      where: {
        studio_profiles: {
          isNot: null,
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        email_verified: true,
        created_at: true,
        membership_tier: true,
        studio_profiles: {
          select: {
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    
    console.log(`Total users with studio profiles: ${allUsers.length}\n`);
    
    const verified = allUsers.filter(u => u.email_verified);
    const unverified = allUsers.filter(u => !u.email_verified);
    
    console.log(`✅ Verified emails: ${verified.length}`);
    console.log(`❌ Unverified emails: ${unverified.length}\n`);
    
    if (unverified.length > 0) {
      console.log('❌ UNVERIFIED USERS:');
      console.log('=' .repeat(80));
      unverified.forEach(user => {
        console.log(`Email: ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Studio: ${user.studio_profiles?.name || 'N/A'}`);
        console.log(`Created: ${user.created_at.toLocaleDateString()}`);
        console.log(`Tier: ${user.membership_tier}`);
        console.log('-'.repeat(80));
      });
      
      // Check if Paul is in the unverified list
      const paul = unverified.find(u => u.email === 'paul@voiceoverpaul.co.uk');
      if (paul) {
        console.log('\n⚠️  FOUND: paul@voiceoverpaul.co.uk has email_verified = FALSE');
        console.log('⚠️  This may be blocking password reset emails!');
      }
    }
    
    if (verified.length > 0) {
      console.log('\n✅ VERIFIED USERS (first 10):');
      console.log('=' .repeat(80));
      verified.slice(0, 10).forEach(user => {
        console.log(`${user.email} (@${user.username}) - ${user.studio_profiles?.name || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking email verification:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
checkLegacyEmailVerification();
