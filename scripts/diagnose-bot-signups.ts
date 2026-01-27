#!/usr/bin/env tsx
/**
 * Production DB Bot Signup Diagnosis
 * 
 * READ-ONLY analysis of signup patterns to identify bot activity
 * Uses .env.production DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load production environment
const dotenv = await import('dotenv');
dotenv.config({ path: '.env.production' });

const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

interface SignupStats {
  totalUsers: number;
  byStatus: Record<string, number>;
  byEmailVerified: Record<string, number>;
  verificationRate: number;
  topDomains: Array<{ domain: string; count: number; verifiedCount: number }>;
  signupsOverTime: Array<{ date: string; count: number }>;
  medianTimeToVerify: number | null;
  suspiciousPatterns: {
    repeatedDisplayNames: Array<{ name: string; count: number }>;
    rapidSignups: Array<{ hour: string; count: number }>;
    neverVerifiedOldAccounts: number;
  };
}

async function diagnoseSignups(): Promise<SignupStats> {
  console.log('📊 Starting production DB analysis (READ-ONLY)...\n');

  // Get cutoff dates
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Total users
  const totalUsers = await db.users.count();
  console.log(`Total users in database: ${totalUsers}`);

  // By status
  const statusCounts = await db.users.groupBy({
    by: ['status'],
    _count: true,
  });
  const byStatus: Record<string, number> = {};
  statusCounts.forEach(s => {
    byStatus[s.status] = s._count;
  });
  console.log('By status:', byStatus);

  // By email verification
  const verifiedCount = await db.users.count({
    where: { email_verified: true },
  });
  const unverifiedCount = totalUsers - verifiedCount;
  const byEmailVerified = {
    verified: verifiedCount,
    unverified: unverifiedCount,
  };
  console.log('By email verification:', byEmailVerified);

  // Verification rate for PENDING/EXPIRED
  const pendingExpiredTotal = (byStatus.PENDING || 0) + (byStatus.EXPIRED || 0);
  const pendingExpiredVerified = await db.users.count({
    where: {
      status: { in: ['PENDING', 'EXPIRED'] },
      email_verified: true,
    },
  });
  const verificationRate = pendingExpiredTotal > 0 
    ? (pendingExpiredVerified / pendingExpiredTotal) * 100 
    : 0;
  console.log(`Verification rate for PENDING/EXPIRED: ${verificationRate.toFixed(1)}%\n`);

  // Top email domains (last 30 days)
  const recentUsers = await db.users.findMany({
    where: {
      created_at: { gte: last30Days },
    },
    select: {
      email: true,
      email_verified: true,
      status: true,
    },
  });

  const domainMap = new Map<string, { total: number; verified: number }>();
  recentUsers.forEach(user => {
    const domain = user.email.split('@')[1]?.toLowerCase();
    if (domain) {
      const existing = domainMap.get(domain) || { total: 0, verified: 0 };
      existing.total++;
      if (user.email_verified) existing.verified++;
      domainMap.set(domain, existing);
    }
  });

  const topDomains = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      count: stats.total,
      verifiedCount: stats.verified,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  console.log('Top 20 email domains (last 30 days):');
  topDomains.forEach(d => {
    const verifiedPct = d.count > 0 ? ((d.verifiedCount / d.count) * 100).toFixed(1) : '0.0';
    console.log(`  ${d.domain}: ${d.count} signups (${verifiedPct}% verified)`);
  });

  // Signups over time (last 30 days, by day)
  const signupsOverTime: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = await db.users.count({
      where: {
        created_at: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });
    
    signupsOverTime.push({
      date: dayStart.toISOString().split('T')[0],
      count,
    });
  }

  console.log('\nSignups per day (last 30 days):');
  signupsOverTime.forEach(s => {
    const bar = '█'.repeat(Math.ceil(s.count / 2));
    console.log(`  ${s.date}: ${s.count.toString().padStart(3)} ${bar}`);
  });

  // Median time to verify (for verified ACTIVE users created in last 30 days)
  const verifiedUsers = await db.users.findMany({
    where: {
      email_verified: true,
      status: 'ACTIVE',
      created_at: { gte: last30Days },
    },
    select: {
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  let medianTimeToVerify: number | null = null;
  if (verifiedUsers.length > 0) {
    const timeDeltas = verifiedUsers
      .map(u => u.updated_at.getTime() - u.created_at.getTime())
      .filter(delta => delta > 0)
      .sort((a, b) => a - b);
    
    if (timeDeltas.length > 0) {
      const medianIndex = Math.floor(timeDeltas.length / 2);
      medianTimeToVerify = timeDeltas[medianIndex] / (1000 * 60); // minutes
      console.log(`\nMedian time to verify (ACTIVE users): ${medianTimeToVerify.toFixed(1)} minutes`);
    }
  }

  // Suspicious patterns

  // 1. Repeated display names
  const displayNameCounts = await db.$queryRaw<Array<{ display_name: string; count: bigint }>>`
    SELECT display_name, COUNT(*) as count
    FROM users
    WHERE created_at >= ${last30Days}
      AND status IN ('PENDING', 'EXPIRED')
    GROUP BY display_name
    HAVING COUNT(*) > 2
    ORDER BY count DESC
    LIMIT 10
  `;
  const repeatedDisplayNames = displayNameCounts.map(d => ({
    name: d.display_name,
    count: Number(d.count),
  }));

  console.log('\nRepeated display names (PENDING/EXPIRED, last 30 days):');
  if (repeatedDisplayNames.length > 0) {
    repeatedDisplayNames.forEach(d => {
      console.log(`  "${d.name}": ${d.count} accounts`);
    });
  } else {
    console.log('  None detected');
  }

  // 2. Rapid signups (more than 5 in an hour)
  const rapidSignups = await db.$queryRaw<Array<{ hour: string; count: bigint }>>`
    SELECT 
      DATE_TRUNC('hour', created_at) as hour,
      COUNT(*) as count
    FROM users
    WHERE created_at >= ${last7Days}
    GROUP BY DATE_TRUNC('hour', created_at)
    HAVING COUNT(*) > 5
    ORDER BY count DESC
    LIMIT 10
  `;
  const rapidSignupsList = rapidSignups.map(r => ({
    hour: new Date(r.hour).toISOString(),
    count: Number(r.count),
  }));

  console.log('\nRapid signup hours (>5 signups/hour, last 7 days):');
  if (rapidSignupsList.length > 0) {
    rapidSignupsList.forEach(r => {
      console.log(`  ${r.hour}: ${r.count} signups`);
    });
  } else {
    console.log('  None detected');
  }

  // 3. Never-verified old accounts
  const neverVerifiedOldAccounts = await db.users.count({
    where: {
      email_verified: false,
      status: { in: ['PENDING', 'EXPIRED'] },
      created_at: { lte: last7Days },
    },
  });

  console.log(`\nNever-verified accounts older than 7 days: ${neverVerifiedOldAccounts}`);

  const stats: SignupStats = {
    totalUsers,
    byStatus,
    byEmailVerified,
    verificationRate,
    topDomains,
    signupsOverTime,
    medianTimeToVerify,
    suspiciousPatterns: {
      repeatedDisplayNames,
      rapidSignups: rapidSignupsList,
      neverVerifiedOldAccounts,
    },
  };

  return stats;
}

async function main() {
  try {
    const stats = await diagnoseSignups();

    // Generate report
    const reportPath = path.join(process.cwd(), 'BOT_SIGNUP_DIAGNOSIS_REPORT.md');
    const report = generateMarkdownReport(stats);
    fs.writeFileSync(reportPath, report, 'utf-8');

    console.log(`\n✅ Report generated: ${reportPath}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

function generateMarkdownReport(stats: SignupStats): string {
  const now = new Date().toISOString();
  
  let report = `# Bot Signup Diagnosis Report
Generated: ${now}

## Executive Summary

- **Total users**: ${stats.totalUsers}
- **Verification rate (PENDING/EXPIRED)**: ${stats.verificationRate.toFixed(1)}%
- **Never-verified old accounts (>7 days)**: ${stats.suspiciousPatterns.neverVerifiedOldAccounts}

### Key Findings

`;

  // Determine key findings
  const pendingExpired = (stats.byStatus.PENDING || 0) + (stats.byStatus.EXPIRED || 0);
  const activeUsers = stats.byStatus.ACTIVE || 0;
  const botSignalStrength = stats.verificationRate < 10 ? 'STRONG' : stats.verificationRate < 30 ? 'MODERATE' : 'LOW';

  report += `- **Bot signal strength**: ${botSignalStrength}\n`;
  report += `- **PENDING + EXPIRED accounts**: ${pendingExpired} (${((pendingExpired / stats.totalUsers) * 100).toFixed(1)}% of total)\n`;
  report += `- **ACTIVE accounts**: ${activeUsers} (${((activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total)\n`;
  
  if (stats.suspiciousPatterns.repeatedDisplayNames.length > 0) {
    report += `- **⚠️ Repeated display names detected**: Top repeated name appears ${stats.suspiciousPatterns.repeatedDisplayNames[0].count} times\n`;
  }
  
  if (stats.suspiciousPatterns.rapidSignups.length > 0) {
    report += `- **⚠️ Rapid signup bursts detected**: Peak of ${stats.suspiciousPatterns.rapidSignups[0].count} signups in one hour\n`;
  }

  report += `\n## Status Breakdown\n\n`;
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    const pct = ((count / stats.totalUsers) * 100).toFixed(1);
    report += `- **${status}**: ${count} (${pct}%)\n`;
  });

  report += `\n## Email Verification\n\n`;
  report += `- **Verified**: ${stats.byEmailVerified.verified} (${((stats.byEmailVerified.verified / stats.totalUsers) * 100).toFixed(1)}%)\n`;
  report += `- **Unverified**: ${stats.byEmailVerified.unverified} (${((stats.byEmailVerified.unverified / stats.totalUsers) * 100).toFixed(1)}%)\n`;

  if (stats.medianTimeToVerify) {
    report += `\n**Median time to verify** (legitimate users): ${stats.medianTimeToVerify.toFixed(1)} minutes\n`;
  }

  report += `\n## Top Email Domains (Last 30 Days)\n\n`;
  report += `| Domain | Signups | Verified | Verification Rate |\n`;
  report += `|--------|---------|----------|-------------------|\n`;
  stats.topDomains.slice(0, 15).forEach(d => {
    const verifiedPct = d.count > 0 ? ((d.verifiedCount / d.count) * 100).toFixed(1) : '0.0';
    report += `| ${d.domain} | ${d.count} | ${d.verifiedCount} | ${verifiedPct}% |\n`;
  });

  report += `\n## Signup Volume (Last 30 Days)\n\n`;
  report += `\`\`\`\n`;
  stats.signupsOverTime.forEach(s => {
    const bar = '█'.repeat(Math.ceil(s.count / 2));
    report += `${s.date}: ${s.count.toString().padStart(3)} ${bar}\n`;
  });
  report += `\`\`\`\n`;

  report += `\n## Suspicious Patterns\n\n`;
  
  if (stats.suspiciousPatterns.repeatedDisplayNames.length > 0) {
    report += `### Repeated Display Names (PENDING/EXPIRED)\n\n`;
    report += `| Display Name | Count |\n`;
    report += `|--------------|-------|\n`;
    stats.suspiciousPatterns.repeatedDisplayNames.forEach(d => {
      report += `| "${d.name}" | ${d.count} |\n`;
    });
    report += `\n`;
  }

  if (stats.suspiciousPatterns.rapidSignups.length > 0) {
    report += `### Rapid Signup Bursts (Last 7 Days)\n\n`;
    report += `| Hour | Signups |\n`;
    report += `|------|--------|\n`;
    stats.suspiciousPatterns.rapidSignups.forEach(r => {
      report += `| ${r.hour} | ${r.count} |\n`;
    });
    report += `\n`;
  }

  report += `### Old Never-Verified Accounts\n\n`;
  report += `**${stats.suspiciousPatterns.neverVerifiedOldAccounts}** accounts older than 7 days that have never verified their email.\n\n`;

  report += `## Recommendations\n\n`;
  
  if (botSignalStrength === 'STRONG' || botSignalStrength === 'MODERATE') {
    report += `### ⚠️ Bot Activity Detected\n\n`;
    report += `The low verification rate (${stats.verificationRate.toFixed(1)}%) and high number of PENDING/EXPIRED accounts strongly suggest bot activity.\n\n`;
    report += `**Immediate actions**:\n`;
    report += `1. Implement CAPTCHA (Cloudflare Turnstile) on signup form\n`;
    report += `2. Add rate limiting to prevent rapid automated signups\n`;
    report += `3. Add honeypot fields and timing checks\n`;
    report += `4. Consider requiring email verification before username reservation\n\n`;
  }

  if (stats.suspiciousPatterns.repeatedDisplayNames.length > 0) {
    report += `**Repeated display names** suggest either:\n`;
    report += `- Automated bot using same default values\n`;
    report += `- Manual testing/spam from same source\n\n`;
  }

  if (stats.suspiciousPatterns.rapidSignups.length > 0) {
    report += `**Rapid signup bursts** indicate:\n`;
    report += `- Automated bot attacks\n`;
    report += `- Need for stricter rate limiting (e.g., max 3 signups per IP per hour)\n\n`;
  }

  report += `## Next Steps\n\n`;
  report += `1. ✅ Review this report\n`;
  report += `2. ⏳ Implement Cloudflare Turnstile on signup\n`;
  report += `3. ⏳ Add rate limiting using Prisma-backed table\n`;
  report += `4. ⏳ Add honeypot + timing checks\n`;
  report += `5. ⏳ Monitor signup patterns after deployment\n`;
  report += `6. ⏳ Consider periodic cleanup of old EXPIRED accounts\n`;

  return report;
}

main();
