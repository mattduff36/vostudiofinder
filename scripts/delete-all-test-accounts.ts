import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

interface ScriptOptions {
  envFile: string;
  mode: 'preview' | 'delete' | 'delete-matt';
}

function maskDbUrl(url: string | undefined): string {
  if (!url) return '(not set)';
  return url.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
}

function parseScriptOptions(argv: string[]): Partial<ScriptOptions> {
  const options: Partial<ScriptOptions> = {};

  for (const rawArg of argv) {
    if (!rawArg.startsWith('--')) continue;

    const [rawKey, ...rest] = rawArg.slice(2).split('=');
    const key = rawKey.trim();
    const value = rest.join('=').trim();

    if (key === 'env-file' && value) options.envFile = value;
    if (key === 'mode' && (value === 'preview' || value === 'delete' || value === 'delete-matt')) options.mode = value;
  }

  return options;
}

async function promptOptions(parsed: Partial<ScriptOptions>): Promise<ScriptOptions> {
  const envFile = parsed.envFile || (await (async () => {
    console.log('\nSelect environment:');
    console.log('  1) Dev (.env.local)');
    console.log('  2) Production (.env.production)');
    console.log('  3) Custom path');

    const choice = (await question('\nChoose 1/2/3: ')).trim();
    if (choice === '2') return '.env.production';
    if (choice === '3') {
      const custom = (await question('Enter env file path (e.g. .env.staging): ')).trim();
      return custom || '.env.local';
    }
    return '.env.local';
  })());

  const mode = parsed.mode || (await (async () => {
    console.log('\nSelect action:');
    console.log('  1) Preview only (no changes)');
    console.log('  2) Delete all test accounts (DANGEROUS)');
    console.log('  3) Delete all \'Matt\' test accounts');

    const choice = (await question('\nChoose 1/2/3: ')).trim();
    if (choice === '2') return 'delete';
    if (choice === '3') return 'delete-matt';
    return 'preview';
  })());

  return { envFile, mode };
}

/**
 * Check if an email or username indicates a test account
 */
function isTestAccount(email: string, username: string): boolean {
  const emailLower = email.toLowerCase();
  const usernameLower = username.toLowerCase();
  
  return (
    emailLower.includes('test') ||
    emailLower.includes('temp') ||
    emailLower.endsWith('@test.com') ||
    usernameLower.startsWith('test') ||
    usernameLower.startsWith('temp') ||
    usernameLower.startsWith('expired_')
  );
}

async function deleteAllTestAccounts() {
  const parsed = parseScriptOptions(process.argv.slice(2));
  const options = await promptOptions(parsed);

  dotenv.config({ path: options.envFile });
  const db = new PrismaClient();

  try {
    console.log('\n🧹 Delete test accounts script\n');
    console.log(`Mode: ${options.mode === 'delete' ? 'DELETE' : options.mode === 'delete-matt' ? 'DELETE MATT ACCOUNTS' : 'PREVIEW'}`);
    console.log(`Env file: ${options.envFile}`);
    console.log(`Database: ${maskDbUrl(process.env.DATABASE_URL)}\n`);

    // Handle delete-matt mode: delete specific Matt email addresses immediately
    if (options.mode === 'delete-matt') {
      const mattEmails = ['matt.mpdee@gmail.com', 'mattduff36@hotmail.com'];
      console.log('🗑️  Deleting Matt test accounts...\n');

      for (const email of mattEmails) {
        const users = await db.users.findMany({
          where: {
            email: {
              equals: email,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            studio_profiles: {
              select: { id: true },
            },
          },
        });

        if (users.length === 0) {
          console.log(`  ⚠️  No user found with email: ${email}`);
          continue;
        }

        for (const user of users) {
          console.log(`  Deleting: ${user.email} (@${user.username})...`);

          await db.$transaction(async (tx) => {
            // Delete studio-related data if exists
            // Note: studio_profiles is a relation array, not a single object
            if (user.studio_profiles && user.studio_profiles.length > 0) {
              // Handle all studio profiles (users typically have 0 or 1, but handle multiple)
              for (const studioProfile of user.studio_profiles) {
                const studioId = studioProfile.id;
                await tx.studio_studio_types.deleteMany({ where: { studio_id: studioId } });
                await tx.studio_images.deleteMany({ where: { studio_id: studioId } });
                await tx.studio_services.deleteMany({ where: { studio_id: studioId } });
                await tx.reviews.deleteMany({ where: { studio_id: studioId } });
                await tx.studio_profiles.delete({ where: { id: studioId } });
              }
            }

            // Get payment IDs for refund deletion
            const userPayments = await tx.payments.findMany({
              where: { user_id: user.id },
              select: { id: true },
            });
            const paymentIds = userPayments.map(p => p.id);

            // Delete all related data
            if (paymentIds.length > 0) {
              await tx.refunds.deleteMany({
                where: {
                  OR: [
                    { user_id: user.id },
                    { payment_id: { in: paymentIds } },
                  ],
                },
              });
            }
            await tx.payments.deleteMany({ where: { user_id: user.id } });
            await tx.subscriptions.deleteMany({ where: { user_id: user.id } });
            await tx.pending_subscriptions.deleteMany({ where: { user_id: user.id } });
            await tx.sessions.deleteMany({ where: { user_id: user.id } });
            await tx.accounts.deleteMany({ where: { user_id: user.id } });
            await tx.messages.deleteMany({
              where: {
                OR: [
                  { sender_id: user.id },
                  { receiver_id: user.id },
                ],
              },
            });
            await tx.user_connections.deleteMany({
              where: {
                OR: [
                  { user_id: user.id },
                  { connected_user_id: user.id },
                ],
              },
            });
            await tx.user_metadata.deleteMany({ where: { user_id: user.id } });
            await tx.notifications.deleteMany({ where: { user_id: user.id } });
            await tx.content_reports.deleteMany({
              where: {
                OR: [
                  { reporter_id: user.id },
                  { reported_user_id: user.id },
                  { reviewed_by_id: user.id },
                ],
              },
            });
            await tx.review_responses.deleteMany({ where: { author_id: user.id } });
            await tx.saved_searches.deleteMany({ where: { user_id: user.id } });
            await tx.support_tickets.deleteMany({ where: { user_id: user.id } });
            await tx.waitlist.deleteMany({
              where: {
                email: {
                  equals: email,
                  mode: 'insensitive',
                },
              },
            });

            // Finally delete user
            await tx.users.delete({ where: { id: user.id } });
          });

          console.log(`  ✅ Deleted: ${user.email}\n`);
        }
      }

      console.log('✅ Matt test accounts deletion complete.\n');
      return;
    }

    console.log('🔍 Finding all test accounts...\n');

    // Find all users
    const allUsers = await db.users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        studio_profiles: {
          select: { id: true },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter test accounts
    const testAccounts = allUsers.filter(user => 
      isTestAccount(user.email, user.username)
    );

    if (testAccounts.length === 0) {
      console.log('✅ No test accounts found. Database is clean!');
      rl.close();
      await db.$disconnect();
      return;
    }

    console.log(`Found ${testAccounts.length} test accounts:\n`);
    console.log('─'.repeat(100));
    
    // Group by type
    // Note: studio_profiles is a relation array, never null (empty array if none)
    const withStudios = testAccounts.filter(u => u.studio_profiles && u.studio_profiles.length > 0);
    const withoutStudios = testAccounts.filter(u => !u.studio_profiles || u.studio_profiles.length === 0);
    
    console.log(`\n📊 Breakdown:`);
    console.log(`   Total test accounts: ${testAccounts.length}`);
    console.log(`   With studios: ${withStudios.length}`);
    console.log(`   Without studios: ${withoutStudios.length}\n`);

    // Show first 20
    const toShow = testAccounts.slice(0, 20);
    toShow.forEach((user, index) => {
      console.log(`${index + 1}. ${user.display_name} (${user.email})`);
      console.log(`   Username: @${user.username}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at.toLocaleDateString()}`);
      console.log(`   Has Studio: ${user.studio_profiles && user.studio_profiles.length > 0 ? 'Yes' : 'No'}`);
      console.log(`   Payments: ${user._count.payments}`);
      console.log('─'.repeat(100));
    });

    if (testAccounts.length > 20) {
      console.log(`\n... and ${testAccounts.length - 20} more test accounts\n`);
    }

    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE all these test accounts and their data:');
    console.log('   - User accounts');
    console.log('   - Payment records');
    console.log('   - Refund records');
    console.log('   - Studio profiles (if any)');
    console.log('   - Studio images');
    console.log('   - Studio types');
    console.log('   - All related data\n');

    if (options.mode !== 'delete') {
      console.log('✅ Preview complete. Re-run and choose "Delete" to actually remove these accounts.\n');
      return;
    }

    const answer = await question('Type "DELETE ALL TEST ACCOUNTS" to confirm: ');
    if (answer !== 'DELETE ALL TEST ACCOUNTS') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }

    console.log('\n🗑️  Deleting test accounts...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of testAccounts) {
      try {
        await db.$transaction(async (tx) => {
          // 1. Delete studio-related data if exists
          // Note: studio_profiles is a relation array, not a single object
          if (user.studio_profiles && user.studio_profiles.length > 0) {
            // Handle all studio profiles (users typically have 0 or 1, but handle multiple)
            for (const studioProfile of user.studio_profiles) {
              const studioId = studioProfile.id;
              
              // Delete studio types
              await tx.studio_studio_types.deleteMany({
                where: { studio_id: studioId },
              });

              // Delete studio images
              await tx.studio_images.deleteMany({
                where: { studio_id: studioId },
              });

              // Delete studio services
              await tx.studio_services.deleteMany({
                where: { studio_id: studioId },
              });

              // Delete reviews for this studio
              await tx.reviews.deleteMany({
                where: { studio_id: studioId },
              });

              // Delete studio profile
              await tx.studio_profiles.delete({
                where: { id: studioId },
              });
            }
          }

          // 2. Get payment IDs for refund deletion
          const userPayments = await tx.payments.findMany({
            where: { user_id: user.id },
            select: { id: true },
          });
          const paymentIds = userPayments.map(p => p.id);

          // 3. Delete refunds
          await tx.refunds.deleteMany({
            where: {
              OR: [
                { user_id: user.id },
                { payment_id: { in: paymentIds } },
              ],
            },
          });

          // 4. Delete payments
          await tx.payments.deleteMany({
            where: { user_id: user.id },
          });

          // 5. Delete subscriptions
          await tx.subscriptions.deleteMany({
            where: { user_id: user.id },
          });

          // 6. Delete sessions
          await tx.sessions.deleteMany({
            where: { user_id: user.id },
          });

          // 7. Delete OAuth accounts
          await tx.accounts.deleteMany({
            where: { user_id: user.id },
          });

          // 8. Delete messages
          await tx.messages.deleteMany({
            where: {
              OR: [
                { sender_id: user.id },
                { receiver_id: user.id },
              ],
            },
          });

          // 9. Delete user connections
          await tx.user_connections.deleteMany({
            where: {
              OR: [
                { user_id: user.id },
                { connected_user_id: user.id },
              ],
            },
          });

          // 10. Delete user metadata
          await tx.user_metadata.deleteMany({
            where: { user_id: user.id },
          });

          // 11. Finally, delete the user
          await tx.users.delete({
            where: { id: user.id },
          });
        });

        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`   Deleted ${deletedCount}/${testAccounts.length}...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error deleting ${user.email}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '═'.repeat(100));
    console.log('✅ Deletion Complete!');
    console.log(`   Successfully deleted: ${deletedCount} test accounts`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} accounts`);
    }
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    rl.close();
    try {
      await db.$disconnect();
    } catch {
      // ignore
    }
  }
}

deleteAllTestAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

