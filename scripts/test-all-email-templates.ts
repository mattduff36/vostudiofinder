/**
 * Test All Email Templates
 * 
 * Sends a test email for each template in the registry to validate
 * that all emails work correctly with the new email system.
 * 
 * Usage: npx tsx scripts/test-all-email-templates.ts
 */

import { config } from 'dotenv';
import { getAllTemplateKeys, getTemplateDefinition } from '../src/lib/email/template-registry';
import { sendTemplatedEmail } from '../src/lib/email/send-templated';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Debug: Check if API key is loaded
console.log('🔑 RESEND_API_KEY loaded:', process.env.RESEND_API_KEY ? 'Yes (' + process.env.RESEND_API_KEY.substring(0, 10) + '...)' : 'No');
console.log('📧 DATABASE_URL loaded:', process.env.DATABASE_URL ? 'Yes' : 'No');

const TEST_EMAIL = 'admin@mpdee.co.uk';

// Sample variables for each template type
const getSampleVariables = (templateKey: string): Record<string, any> => {
  const template = getTemplateDefinition(templateKey);
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  // Generate sample data based on variable schema
  const variables: Record<string, any> = {};
  
  for (const [key, type] of Object.entries(template.variableSchema)) {
    switch (type) {
      case 'string':
        if (key === 'displayName') variables[key] = 'Test User';
        else if (key === 'username') variables[key] = 'testuser';
        else if (key === 'studioName') variables[key] = 'Test Studio';
        else if (key === 'studioOwnerName') variables[key] = 'Test Owner';
        else if (key === 'amount') variables[key] = '29.99';
        else if (key === 'currency') variables[key] = 'GBP';
        else if (key === 'paymentId') variables[key] = 'test_payment_12345';
        else if (key === 'planName') variables[key] = 'Annual Membership';
        else if (key === 'nextBillingDate') variables[key] = '2027-01-30';
        else if (key === 'reservationExpiresAt') variables[key] = 'February 6, 2026';
        else if (key === 'errorMessage') variables[key] = 'Card declined (test mode)';
        else if (key === 'refundAmount') variables[key] = '29.99';
        else if (key === 'paymentAmount') variables[key] = '29.99';
        else if (key === 'refundType') variables[key] = 'full';
        else if (key === 'isFullRefund') variables[key] = 'yes';
        else if (key === 'comment') variables[key] = 'This is a test refund for email validation purposes.';
        else if (key === 'refundDate') variables[key] = 'January 30, 2026';
        else if (key === 'profileCompletion') variables[key] = '95';
        else variables[key] = `Test ${key}`;
        break;
      
      case 'email':
        variables[key] = TEST_EMAIL;
        break;
      
      case 'url':
        if (key === 'verificationUrl') variables[key] = 'https://voiceoverstudiofinder.com/auth/verify-email?token=test_verification_token';
        else if (key === 'resetUrl' || key === 'resetPasswordUrl') variables[key] = 'https://voiceoverstudiofinder.com/auth/reset-password?token=test_reset_token';
        else if (key === 'signupUrl') variables[key] = 'https://voiceoverstudiofinder.com/auth/signup/recover?username=testuser';
        else if (key === 'retryUrl') variables[key] = 'https://voiceoverstudiofinder.com/auth/signup/retry-payment';
        else if (key === 'studioUrl') variables[key] = 'https://voiceoverstudiofinder.com/studios/testuser';
        else if (key === 'adminDashboardUrl') variables[key] = 'https://voiceoverstudiofinder.com/admin/studios';
        else variables[key] = 'https://voiceoverstudiofinder.com/test';
        break;
      
      case 'number':
        if (key === 'daysRemaining') variables[key] = 3;
        else if (key === 'profileCompletion') variables[key] = 95;
        else variables[key] = 0;
        break;
      
      case 'date':
        variables[key] = '2026-01-30';
        break;
    }
  }
  
  return variables;
};

async function testAllTemplates() {
  console.log('🧪 Testing all email templates...\n');
  console.log(`📧 Test emails will be sent to: ${TEST_EMAIL}\n`);
  
  const templateKeys = getAllTemplateKeys();
  console.log(`📋 Found ${templateKeys.length} templates to test\n`);
  
  const results: { template: string; status: 'success' | 'failed'; error?: string }[] = [];
  
  for (const templateKey of templateKeys) {
    const template = getTemplateDefinition(templateKey);
    if (!template) continue;
    
    process.stdout.write(`Testing: ${template.name} (${templateKey})... `);
    
    try {
      const variables = getSampleVariables(templateKey);
      
      const success = await sendTemplatedEmail({
        to: TEST_EMAIL,
        templateKey,
        variables,
        skipMarketingCheck: true, // Skip marketing check for testing
      });
      
      if (success) {
        console.log('✅ SUCCESS');
        results.push({ template: templateKey, status: 'success' });
      } else {
        console.log('❌ FAILED (returned false)');
        results.push({ template: templateKey, status: 'failed', error: 'Send returned false' });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ FAILED: ${errorMsg}`);
      results.push({ template: templateKey, status: 'failed', error: errorMsg });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   - ${r.template}`));
  }
  
  console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => console.log(`   - ${r.template}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed.length === 0) {
    console.log('🎉 All email templates are working correctly!');
    console.log(`📬 Check ${TEST_EMAIL} inbox for ${results.length} test emails`);
    process.exit(0);
  } else {
    console.log('⚠️  Some templates failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the test
testAllTemplates().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
