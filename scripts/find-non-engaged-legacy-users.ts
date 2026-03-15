/**
 * Find Non-Engaged Legacy Users
 * 
 * Identifies legacy users who received the "Legacy User Announcement" email
 * (sent Feb 24–27, 2026) but have NOT engaged since (no login after email was sent).
 * 
 * Use this to build a follow-up email list for users who didn't respond.
 * 
 * Usage:
 *   npx tsx scripts/find-non-engaged-legacy-users.ts
 *   npx tsx scripts/find-non-engaged-legacy-users.ts --csv
 */

import { db } from '../src/lib/db';

const OUTPUT_CSV = process.argv.includes('--csv');

async function findNonEngagedLegacyUsers() {
  try {
    console.log('📊 Non-Engaged Legacy User Report');
    console.log('='.repeat(80));
    console.log('');

    // 1. Find the legacy-user-announcement campaign(s)
    const campaigns = await db.email_campaigns.findMany({
      where: { template_key: 'legacy-user-announcement' },
      select: {
        id: true,
        name: true,
        status: true,
        sent_count: true,
        failed_count: true,
        started_at: true,
        completed_at: true,
      },
    });

    if (campaigns.length === 0) {
      console.log('❌ No legacy-user-announcement campaigns found in the database.');
      console.log('   The campaign may have been sent through a different method.');
      process.exit(1);
    }

    console.log(`📧 Found ${campaigns.length} legacy announcement campaign(s):\n`);
    for (const c of campaigns) {
      console.log(`   • "${c.name}" — Status: ${c.status}`);
      console.log(`     Sent: ${c.sent_count} | Failed: ${c.failed_count}`);
      console.log(`     Started: ${c.started_at?.toISOString() ?? 'N/A'}`);
      console.log(`     Completed: ${c.completed_at?.toISOString() ?? 'N/A'}`);
      console.log('');
    }

    const campaignIds = campaigns.map(c => c.id);

    // 2. Get all SENT deliveries with user data
    const deliveries = await db.email_deliveries.findMany({
      where: {
        campaign_id: { in: campaignIds },
        status: 'SENT',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            last_login: true,
            password: true,
            email_verified: true,
            created_at: true,
            updated_at: true,
            membership_tier: true,
            deletion_status: true,
          },
        },
      },
    });

    console.log(`📬 Total emails sent successfully: ${deliveries.length}\n`);

    // 3. Classify users
    const engaged: typeof deliveries = [];
    const notEngaged: typeof deliveries = [];
    const deletedOrMissing: typeof deliveries = [];
    const noPassword: typeof deliveries = [];

    for (const d of deliveries) {
      if (!d.user || d.user.deletion_status !== 'ACTIVE') {
        deletedOrMissing.push(d);
        continue;
      }

      const emailSentAt = d.sent_at ?? d.created_at;
      const hasLoggedInSince = d.user.last_login && d.user.last_login >= emailSentAt;
      const hasSetPassword = d.user.password !== null;

      if (hasLoggedInSince) {
        engaged.push(d);
      } else if (!hasSetPassword) {
        noPassword.push(d);
        notEngaged.push(d);
      } else {
        notEngaged.push(d);
      }
    }

    // 4. Summary
    console.log('─'.repeat(80));
    console.log('📊 ENGAGEMENT SUMMARY');
    console.log('─'.repeat(80));
    console.log(`   ✅ Engaged (logged in after email):     ${engaged.length}`);
    console.log(`   ❌ Not engaged (no login after email):   ${notEngaged.length}`);
    console.log(`      └─ Never set a password:              ${noPassword.length}`);
    console.log(`   🗑️  Deleted/missing accounts:            ${deletedOrMissing.length}`);
    console.log(`   📧 Total sent:                           ${deliveries.length}`);
    console.log('');

    // 5. List non-engaged users
    if (notEngaged.length > 0) {
      console.log('─'.repeat(80));
      console.log('📋 NON-ENGAGED USERS (candidates for follow-up email)');
      console.log('─'.repeat(80));

      if (OUTPUT_CSV) {
        console.log('email,display_name,username,last_login,has_password,membership_tier,email_sent_at');
        for (const d of notEngaged) {
          const u = d.user!;
          const sentAt = d.sent_at ?? d.created_at;
          console.log([
            u.email,
            `"${u.display_name}"`,
            u.username,
            u.last_login?.toISOString() ?? 'never',
            u.password !== null ? 'yes' : 'no',
            u.membership_tier,
            sentAt.toISOString(),
          ].join(','));
        }
      } else {
        console.log('');
        for (let i = 0; i < notEngaged.length; i++) {
          const d = notEngaged[i]!;
          const u = d.user!;
          const sentAt = d.sent_at ?? d.created_at;
          console.log(`   ${i + 1}. ${u.display_name} (${u.email})`);
          console.log(`      Username: ${u.username} | Tier: ${u.membership_tier}`);
          console.log(`      Last login: ${u.last_login?.toISOString() ?? 'never'}`);
          console.log(`      Password set: ${u.password !== null ? 'yes' : 'no'}`);
          console.log(`      Email sent: ${sentAt.toISOString()}`);
          console.log('');
        }
      }
    }

    // 6. List engaged users for reference
    if (engaged.length > 0 && !OUTPUT_CSV) {
      console.log('─'.repeat(80));
      console.log('✅ ENGAGED USERS (logged in after email — no follow-up needed)');
      console.log('─'.repeat(80));
      console.log('');
      for (let i = 0; i < engaged.length; i++) {
        const d = engaged[i]!;
        const u = d.user!;
        console.log(`   ${i + 1}. ${u.display_name} (${u.email}) — Last login: ${u.last_login?.toISOString()}`);
      }
      console.log('');
    }

    console.log('─'.repeat(80));
    console.log('💡 TIP: Run with --csv flag for CSV output you can import into a spreadsheet.');
    console.log('   npx tsx scripts/find-non-engaged-legacy-users.ts --csv > non-engaged.csv');
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

findNonEngagedLegacyUsers();
