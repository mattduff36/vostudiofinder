/**
 * Validate Email Templates (Rendering Only)
 * 
 * Tests that all email templates render correctly without actually sending emails.
 * Saves rendered HTML to files for visual inspection.
 * 
 * Usage: npx tsx scripts/validate-email-templates.ts
 */

import { getAllTemplateKeys, getTemplateDefinition } from '../src/lib/email/template-registry';
import { renderEmailTemplate } from '../src/lib/email/render';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_EMAIL = 'admin@mpdee.co.uk';
const OUTPUT_DIR = path.join(__dirname, '../.email-test-output');

// Sample variables for each template type
const getSampleVariables = (templateKey: string): Record<string, any> => {
  const template = getTemplateDefinition(templateKey);
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

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

async function validateAllTemplates() {
  console.log('🔍 Validating all email templates (rendering only)...\n');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const templateKeys = getAllTemplateKeys();
  console.log(`📋 Found ${templateKeys.length} templates to validate\n`);
  
  const results: { 
    template: string; 
    status: 'success' | 'failed'; 
    error?: string;
    htmlPath?: string;
    textPath?: string;
  }[] = [];
  
  for (const templateKey of templateKeys) {
    const template = getTemplateDefinition(templateKey);
    if (!template) continue;
    
    process.stdout.write(`Validating: ${template.name} (${templateKey})... `);
    
    try {
      const variables = getSampleVariables(templateKey);
      
      // Render the template
      const rendered = await renderEmailTemplate(templateKey, variables);
      
      // Save HTML to file
      const htmlPath = path.join(OUTPUT_DIR, `${templateKey}.html`);
      fs.writeFileSync(htmlPath, rendered.html, 'utf8');
      
      // Save plain text to file
      const textPath = path.join(OUTPUT_DIR, `${templateKey}.txt`);
      fs.writeFileSync(textPath, rendered.text, 'utf8');
      
      console.log('✅ SUCCESS');
      results.push({ 
        template: templateKey, 
        status: 'success',
        htmlPath,
        textPath
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ FAILED: ${errorMsg}`);
      results.push({ template: templateKey, status: 'failed', error: errorMsg });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`\n✅ Successfully rendered: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   - ${r.template}`));
  }
  
  console.log(`\n❌ Failed to render: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => console.log(`   - ${r.template}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed.length === 0) {
    console.log('🎉 All email templates rendered successfully!');
    console.log(`📁 HTML files saved to: ${OUTPUT_DIR}`);
    console.log('\n💡 You can open these files in a browser to inspect the emails.');
    process.exit(0);
  } else {
    console.log('⚠️  Some templates failed to render. Please review the errors above.');
    process.exit(1);
  }
}

// Run the validation
validateAllTemplates().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
