import * as dotenv from 'dotenv';
import { sendEmail } from '../src/lib/email/email-service';
import { generateAiSeoSummaryEmail } from '../src/lib/email/templates/ai-seo-summary';

dotenv.config({ path: '.env.local' });

async function sendAiSeoSummaryEmail() {
  console.log('📧 Sending AI SEO Copy Assistant summary email...');
  
  const { html, text } = generateAiSeoSummaryEmail();

  const success = await sendEmail({
    to: 'matt.mpdee@gmail.com',
    subject: 'AI SEO Copy Assistant - Feature Plan Summary',
    html,
    text
  });

  if (success) {
    console.log('✅ Email sent successfully to matt.mpdee@gmail.com');
  } else {
    console.error('❌ Failed to send email');
    process.exit(1);
  }
}

sendAiSeoSummaryEmail()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
