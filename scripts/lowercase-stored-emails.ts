/**
 * Lowercase Stored Emails
 *
 * Finds and normalises all email addresses stored in the database to lowercase.
 *
 * Modes:
 *   --report   (default) List every row with uppercase email characters, per table.
 *   --apply    Actually update those rows to lowercase.
 *
 * Target columns (from prisma/schema.prisma):
 *   users.email                       (UNIQUE — collision-safe handling)
 *   waitlist.email                    (compound UNIQUE with type)
 *   email_deliveries.to_email
 *   email_templates.from_email
 *   email_templates.reply_to_email
 *   email_template_versions.from_email
 *   email_template_versions.reply_to_email
 *
 * Usage:
 *   npx tsx scripts/lowercase-stored-emails.ts            # report mode
 *   npx tsx scripts/lowercase-stored-emails.ts --report   # report mode (explicit)
 *   npx tsx scripts/lowercase-stored-emails.ts --apply    # apply mode
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ log: ['warn', 'error'] });

const applyMode = process.argv.includes('--apply');

interface UppercaseRow {
  id: string;
  column: string;
  currentValue: string;
  lowercasedValue: string;
}

// ─── helpers ──────────────────────────────────────────────────────────

function hasUppercase(value: string | null | undefined): boolean {
  if (!value) return false;
  return value !== value.toLowerCase();
}

function printTable(label: string, rows: UppercaseRow[]) {
  console.log(`\n┌─ ${label} (${rows.length} row${rows.length === 1 ? '' : 's'})`);
  if (rows.length === 0) {
    console.log('│  No uppercase values found.');
    return;
  }
  const preview = rows.slice(0, 20);
  for (const r of preview) {
    console.log(`│  [${r.id}] ${r.column}: "${r.currentValue}" → "${r.lowercasedValue}"`);
  }
  if (rows.length > 20) {
    console.log(`│  ... and ${rows.length - 20} more`);
  }
}

// ─── per-table scanners ───────────────────────────────────────────────

async function scanUsersEmail(): Promise<UppercaseRow[]> {
  const all = await db.users.findMany({ select: { id: true, email: true } });
  return all
    .filter(u => hasUppercase(u.email))
    .map(u => ({
      id: u.id,
      column: 'email',
      currentValue: u.email,
      lowercasedValue: u.email.toLowerCase(),
    }));
}

async function scanWaitlistEmail(): Promise<UppercaseRow[]> {
  const all = await db.waitlist.findMany({ select: { id: true, email: true } });
  return all
    .filter(w => hasUppercase(w.email))
    .map(w => ({
      id: w.id,
      column: 'email',
      currentValue: w.email,
      lowercasedValue: w.email.toLowerCase(),
    }));
}

async function scanEmailDeliveries(): Promise<UppercaseRow[]> {
  const all = await db.email_deliveries.findMany({ select: { id: true, to_email: true } });
  return all
    .filter(d => hasUppercase(d.to_email))
    .map(d => ({
      id: d.id,
      column: 'to_email',
      currentValue: d.to_email,
      lowercasedValue: d.to_email.toLowerCase(),
    }));
}

async function scanEmailTemplates(): Promise<UppercaseRow[]> {
  const all = await db.email_templates.findMany({
    select: { id: true, from_email: true, reply_to_email: true },
  });
  const rows: UppercaseRow[] = [];
  for (const t of all) {
    if (hasUppercase(t.from_email)) {
      rows.push({
        id: t.id,
        column: 'from_email',
        currentValue: t.from_email!,
        lowercasedValue: t.from_email!.toLowerCase(),
      });
    }
    if (hasUppercase(t.reply_to_email)) {
      rows.push({
        id: t.id,
        column: 'reply_to_email',
        currentValue: t.reply_to_email!,
        lowercasedValue: t.reply_to_email!.toLowerCase(),
      });
    }
  }
  return rows;
}

async function scanEmailTemplateVersions(): Promise<UppercaseRow[]> {
  const all = await db.email_template_versions.findMany({
    select: { id: true, from_email: true, reply_to_email: true },
  });
  const rows: UppercaseRow[] = [];
  for (const v of all) {
    if (hasUppercase(v.from_email)) {
      rows.push({
        id: v.id,
        column: 'from_email',
        currentValue: v.from_email!,
        lowercasedValue: v.from_email!.toLowerCase(),
      });
    }
    if (hasUppercase(v.reply_to_email)) {
      rows.push({
        id: v.id,
        column: 'reply_to_email',
        currentValue: v.reply_to_email!,
        lowercasedValue: v.reply_to_email!.toLowerCase(),
      });
    }
  }
  return rows;
}

// ─── apply functions ──────────────────────────────────────────────────

async function applyUsersEmail(rows: UppercaseRow[]): Promise<{ updated: number; skipped: UppercaseRow[] }> {
  const existingEmails = new Set(
    (await db.users.findMany({ select: { email: true } })).map(u => u.email.toLowerCase()),
  );

  // Detect collisions: two different rows that map to the same lowercase email
  const targetMap = new Map<string, UppercaseRow[]>();
  for (const r of rows) {
    const key = r.lowercasedValue;
    if (!targetMap.has(key)) targetMap.set(key, []);
    targetMap.get(key)!.push(r);
  }

  const skipped: UppercaseRow[] = [];
  let updated = 0;

  for (const r of rows) {
    const siblings = targetMap.get(r.lowercasedValue)!;
    // If another row already exists at the lowercase email (and it isn't this row), skip
    const wouldCollide =
      siblings.length > 1 ||
      (existingEmails.has(r.lowercasedValue) && r.currentValue.toLowerCase() === r.lowercasedValue && r.currentValue !== r.lowercasedValue);

    // More precise collision: check if a *different* user already owns the target email
    const ownerOfTarget = await db.users.findUnique({
      where: { email: r.lowercasedValue },
      select: { id: true },
    });

    if (ownerOfTarget && ownerOfTarget.id !== r.id) {
      console.log(`  ⚠️  SKIP ${r.currentValue} → ${r.lowercasedValue} (conflicts with existing user ${ownerOfTarget.id})`);
      skipped.push(r);
      continue;
    }

    await db.users.update({
      where: { id: r.id },
      data: { email: r.lowercasedValue, updated_at: new Date() },
    });
    updated++;
  }

  return { updated, skipped };
}

async function applyWaitlistEmail(rows: UppercaseRow[]): Promise<{ updated: number; skipped: UppercaseRow[] }> {
  const skipped: UppercaseRow[] = [];
  let updated = 0;

  for (const r of rows) {
    // Waitlist has @@unique([email, type]) — check for collision
    const entry = await db.waitlist.findUnique({ where: { id: r.id }, select: { type: true } });
    if (!entry) continue;

    const existingAtTarget = await db.waitlist.findFirst({
      where: { email: r.lowercasedValue, type: entry.type, NOT: { id: r.id } },
    });

    if (existingAtTarget) {
      console.log(`  ⚠️  SKIP waitlist ${r.currentValue} → ${r.lowercasedValue} (conflicts with existing entry ${existingAtTarget.id})`);
      skipped.push(r);
      continue;
    }

    await db.waitlist.update({
      where: { id: r.id },
      data: { email: r.lowercasedValue },
    });
    updated++;
  }

  return { updated, skipped };
}

async function applySimpleColumn(
  rows: UppercaseRow[],
  updateFn: (id: string, column: string, value: string) => Promise<void>,
): Promise<number> {
  let updated = 0;
  for (const r of rows) {
    await updateFn(r.id, r.column, r.lowercasedValue);
    updated++;
  }
  return updated;
}

// ─── main ─────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('='.repeat(80));
    console.log(applyMode
      ? '🔧 LOWERCASE STORED EMAILS — APPLY MODE'
      : '📊 LOWERCASE STORED EMAILS — REPORT MODE');
    console.log('='.repeat(80));

    // 1. Scan all tables
    console.log('\n🔍 Scanning all email columns for uppercase characters...');

    const [usersRows, waitlistRows, deliveriesRows, templatesRows, versionsRows] = await Promise.all([
      scanUsersEmail(),
      scanWaitlistEmail(),
      scanEmailDeliveries(),
      scanEmailTemplates(),
      scanEmailTemplateVersions(),
    ]);

    const totalRows = usersRows.length + waitlistRows.length + deliveriesRows.length + templatesRows.length + versionsRows.length;

    printTable('users.email', usersRows);
    printTable('waitlist.email', waitlistRows);
    printTable('email_deliveries.to_email', deliveriesRows);
    printTable('email_templates (from_email / reply_to_email)', templatesRows);
    printTable('email_template_versions (from_email / reply_to_email)', versionsRows);

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 TOTAL: ${totalRows} value${totalRows === 1 ? '' : 's'} with uppercase characters`);
    console.log('-'.repeat(80));

    if (!applyMode) {
      if (totalRows === 0) {
        console.log('\n✅ All stored emails are already lowercase. Nothing to do!');
      } else {
        console.log('\n💡 Run with --apply to update these values to lowercase.');
      }
      return;
    }

    // 2. Apply updates
    if (totalRows === 0) {
      console.log('\n✅ All stored emails are already lowercase. Nothing to apply!');
      return;
    }

    console.log('\n🔄 Applying lowercase updates...\n');

    // users.email (collision-safe)
    if (usersRows.length > 0) {
      console.log('  Updating users.email...');
      const usersResult = await applyUsersEmail(usersRows);
      console.log(`  ✅ users.email: ${usersResult.updated} updated, ${usersResult.skipped.length} skipped (conflicts)`);
      if (usersResult.skipped.length > 0) {
        console.log('  ⚠️  Skipped rows (manual resolution required):');
        for (const s of usersResult.skipped) {
          console.log(`     [${s.id}] "${s.currentValue}" → "${s.lowercasedValue}"`);
        }
      }
    }

    // waitlist.email (collision-safe)
    if (waitlistRows.length > 0) {
      console.log('  Updating waitlist.email...');
      const waitlistResult = await applyWaitlistEmail(waitlistRows);
      console.log(`  ✅ waitlist.email: ${waitlistResult.updated} updated, ${waitlistResult.skipped.length} skipped (conflicts)`);
    }

    // email_deliveries.to_email (no unique constraint)
    if (deliveriesRows.length > 0) {
      console.log('  Updating email_deliveries.to_email...');
      const count = await applySimpleColumn(deliveriesRows, async (id, _col, value) => {
        await db.email_deliveries.update({ where: { id }, data: { to_email: value } });
      });
      console.log(`  ✅ email_deliveries.to_email: ${count} updated`);
    }

    // email_templates (from_email / reply_to_email)
    if (templatesRows.length > 0) {
      console.log('  Updating email_templates...');
      const count = await applySimpleColumn(templatesRows, async (id, col, value) => {
        await db.email_templates.update({
          where: { id },
          data: { [col]: value, updated_at: new Date() },
        });
      });
      console.log(`  ✅ email_templates: ${count} updated`);
    }

    // email_template_versions (from_email / reply_to_email)
    if (versionsRows.length > 0) {
      console.log('  Updating email_template_versions...');
      const count = await applySimpleColumn(versionsRows, async (id, col, value) => {
        await db.email_template_versions.update({ where: { id }, data: { [col]: value } });
      });
      console.log(`  ✅ email_template_versions: ${count} updated`);
    }

    // 3. Post-update verification
    console.log('\n🔍 Post-update verification...');

    const [postUsers, postWaitlist, postDeliveries, postTemplates, postVersions] = await Promise.all([
      scanUsersEmail(),
      scanWaitlistEmail(),
      scanEmailDeliveries(),
      scanEmailTemplates(),
      scanEmailTemplateVersions(),
    ]);

    const remaining = postUsers.length + postWaitlist.length + postDeliveries.length + postTemplates.length + postVersions.length;

    console.log(`\n  users.email:              ${postUsers.length} remaining`);
    console.log(`  waitlist.email:            ${postWaitlist.length} remaining`);
    console.log(`  email_deliveries.to_email: ${postDeliveries.length} remaining`);
    console.log(`  email_templates:           ${postTemplates.length} remaining`);
    console.log(`  email_template_versions:   ${postVersions.length} remaining`);

    console.log('\n' + '='.repeat(80));
    if (remaining === 0) {
      console.log('✅ ALL STORED EMAILS ARE NOW LOWERCASE!');
    } else {
      console.log(`⚠️  ${remaining} value(s) still contain uppercase (likely skipped due to conflicts).`);
      console.log('   These require manual resolution — check the logs above.');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
