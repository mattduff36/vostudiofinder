/**
 * Test Email Script
 * 
 * This script sends a test email to verify Resend integration.
 * 
 * Usage:
 *   node test-email.js your-email@example.com
 */

const testEmail = async (recipientEmail) => {
  try {
    console.log('🚀 Sending test email to:', recipientEmail);
    
    const response = await fetch('http://localhost:3000/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS:', data.message);
      console.log('📧 Check your inbox at:', recipientEmail);
    } else {
      console.error('❌ FAILED:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Make sure the dev server is running: npm run dev');
  }
};

// Get email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node test-email.js your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

testEmail(recipientEmail);

