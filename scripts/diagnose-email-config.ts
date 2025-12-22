#!/usr/bin/env tsx
/**
 * Email Configuration Diagnostic Tool
 * 
 * Checks Resend configuration and email deliverability settings
 */

import { Resend } from 'resend';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

interface DiagnosticResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

const results: Record<string, DiagnosticResult> = {};

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');

  // Check RESEND_API_KEY
  if (!process.env.RESEND_API_KEY) {
    results.apiKey = {
      status: 'fail',
      message: '❌ RESEND_API_KEY is not set',
      fix: 'Add RESEND_API_KEY to your .env.local file',
    };
  } else if (process.env.RESEND_API_KEY.startsWith('re_')) {
    results.apiKey = {
      status: 'pass',
      message: '✅ RESEND_API_KEY is set correctly',
    };
  } else {
    results.apiKey = {
      status: 'warn',
      message: '⚠️  RESEND_API_KEY format looks unusual',
      fix: 'Verify your API key starts with "re_"',
    };
  }

  // Check RESEND_FROM_EMAIL
  if (!process.env.RESEND_FROM_EMAIL) {
    results.fromEmail = {
      status: 'warn',
      message: '⚠️  RESEND_FROM_EMAIL is not set (will use default)',
      fix: 'Set RESEND_FROM_EMAIL="VoiceoverStudioFinder <noreply@voiceoverstudiofinder.com>"',
    };
  } else {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (fromEmail.includes('voiceoverstudiofinder.com')) {
      results.fromEmail = {
        status: 'pass',
        message: `✅ RESEND_FROM_EMAIL is set to: ${fromEmail}`,
      };
    } else if (fromEmail.includes('resend.dev')) {
      results.fromEmail = {
        status: 'fail',
        message: '❌ Using resend.dev domain (not verified)',
        fix: 'Change to noreply@voiceoverstudiofinder.com',
      };
    } else {
      results.fromEmail = {
        status: 'warn',
        message: `⚠️  FROM email uses unexpected domain: ${fromEmail}`,
      };
    }
  }

  // Check NEXT_PUBLIC_SITE_URL
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    results.siteUrl = {
      status: 'warn',
      message: '⚠️  NEXT_PUBLIC_SITE_URL is not set',
      fix: 'Set NEXT_PUBLIC_SITE_URL for proper email links',
    };
  } else {
    results.siteUrl = {
      status: 'pass',
      message: `✅ NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL}`,
    };
  }
}

async function checkResendConnection() {
  console.log('\n🔗 Testing Resend Connection...\n');

  if (!process.env.RESEND_API_KEY) {
    results.connection = {
      status: 'fail',
      message: '❌ Cannot test connection - no API key',
    };
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Try to get domain information
    const domains = await resend.domains.list();
    
    if (domains.data && domains.data.length > 0) {
      results.connection = {
        status: 'pass',
        message: '✅ Successfully connected to Resend',
      };

      // Check domain verification
      const voiceoverDomain = domains.data.find((d: { name: string }) => 
        d.name.includes('voiceoverstudiofinder')
      );

      if (voiceoverDomain) {
        const domainStatus = (voiceoverDomain as { status: string }).status;
        if (domainStatus === 'verified') {
          results.domainVerification = {
            status: 'pass',
            message: `✅ Domain ${(voiceoverDomain as { name: string }).name} is VERIFIED`,
          };
        } else {
          results.domainVerification = {
            status: 'warn',
            message: `⚠️  Domain ${(voiceoverDomain as { name: string }).name} status: ${domainStatus}`,
            fix: 'Complete DNS verification in Resend dashboard',
          };
        }
      } else {
        results.domainVerification = {
          status: 'warn',
          message: '⚠️  voiceoverstudiofinder.com domain not found',
          fix: 'Add and verify your domain in Resend dashboard',
        };
      }

      console.log(`   Found ${domains.data.length} domain(s):`);
      domains.data.forEach((domain: { name: string; status: string }) => {
        console.log(`   - ${domain.name} (${domain.status})`);
      });
    } else {
      results.connection = {
        status: 'warn',
        message: '⚠️  Connected but no domains found',
        fix: 'Add voiceoverstudiofinder.com in Resend dashboard',
      };
    }
  } catch (error) {
    results.connection = {
      status: 'fail',
      message: `❌ Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fix: 'Check your RESEND_API_KEY is valid',
    };
  }
}

async function checkEmailConfiguration() {
  console.log('\n📧 Email Configuration Analysis...\n');

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
  
  // Check for best practices
  const checks = [
    {
      name: 'senderName',
      condition: fromEmail.includes('<') && fromEmail.includes('>'),
      pass: '✅ Sender name included (good for deliverability)',
      fail: '⚠️  Consider adding sender name: "Name <email@domain.com>"',
    },
    {
      name: 'noreplyAddress',
      condition: fromEmail.includes('noreply') || fromEmail.includes('no-reply'),
      pass: '✅ Using no-reply address (appropriate for transactional)',
      fail: '✅ Using reply-able address (good for engagement)',
    },
    {
      name: 'domainMatch',
      condition: fromEmail.includes('voiceoverstudiofinder.com'),
      pass: '✅ Sender domain matches website domain',
      fail: '⚠️  Sender domain should match your website domain',
    },
  ];

  checks.forEach(check => {
    if (check.condition) {
      console.log(`   ${check.pass}`);
    } else {
      console.log(`   ${check.fail}`);
    }
  });
}

async function checkSpamTriggers() {
  console.log('\n🚨 Spam Trigger Analysis...\n');

  const commonSpamWords = [
    'FREE!!!', 'CLICK HERE!!!', 'ACT NOW', 'LIMITED TIME', 
    'URGENT!!!', '$$$', 'MAKE MONEY', '100% FREE', 
    'GUARANTEED', 'NO COST', 'RISK FREE', 'CALL NOW'
  ];

  console.log('   Common spam triggers to avoid:');
  commonSpamWords.forEach(word => {
    console.log(`   ❌ Avoid: "${word}"`);
  });

  console.log('\n   ✅ Your emails should use:');
  console.log('   - Clear, professional language');
  console.log('   - Proper grammar and punctuation');
  console.log('   - Both HTML and plain text versions');
  console.log('   - Relevant, personalized content');
  console.log('   - Consistent branding');
}

async function provideRecommendations() {
  console.log('\n💡 Recommendations for Better Deliverability...\n');

  const recommendations = [
    '1. ✅ Domain Verified - Keep your domain verified in Resend',
    '2. 📊 Monitor bounce rate in Resend dashboard',
    '3. 📝 Always include plain text version of emails',
    '4. 🔗 Use absolute URLs (not relative) in email links',
    '5. 📱 Test emails on multiple devices/clients',
    '6. ⚡ Keep email file size under 102KB',
    '7. 🎯 Maintain good text-to-image ratio (60:40 or better)',
    '8. 📧 Add physical address in footer (optional but helps)',
    '9. 🔄 Include unsubscribe link for marketing emails',
    '10. 📈 Gradually increase sending volume (warmup)',
  ];

  recommendations.forEach(rec => console.log(`   ${rec}`));
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60) + '\n');

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  Object.entries(results).forEach(([key, result]) => {
    console.log(`${result.message}`);
    if (result.fix) {
      console.log(`   💡 Fix: ${result.fix}`);
    }
    console.log();

    if (result.status === 'pass') passCount++;
    if (result.status === 'warn') warnCount++;
    if (result.status === 'fail') failCount++;
  });

  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passCount} | ⚠️  Warnings: ${warnCount} | ❌ Failed: ${failCount}`);
  console.log('='.repeat(60) + '\n');

  if (failCount === 0 && warnCount === 0) {
    console.log('🎉 Perfect! Your email configuration looks great!\n');
  } else if (failCount === 0) {
    console.log('✅ Good! Address warnings above for optimal deliverability.\n');
  } else {
    console.log('⚠️  Action required! Fix failed checks above.\n');
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('📧 EMAIL DELIVERABILITY DIAGNOSTIC TOOL');
  console.log('   VoiceoverStudioFinder - Resend Configuration');
  console.log('='.repeat(60));

  await checkEnvironmentVariables();
  await checkResendConnection();
  await checkEmailConfiguration();
  await checkSpamTriggers();
  await provideRecommendations();
  
  printSummary();
}

main().catch(console.error);

