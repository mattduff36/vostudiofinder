/**
 * Test Email Script
 * 
 * ⚠️ DEPRECATED: This script cannot authenticate with the API endpoint.
 * 
 * Please use the admin web interface instead:
 * 1. Navigate to http://localhost:3000/admin/test-email
 * 2. Sign in as admin
 * 3. Enter recipient email and click "Send Test Email"
 * 
 * This script is kept for reference only.
 */

const testEmail = async (recipientEmail) => {
  try {
    console.log('⚠️  WARNING: This script will fail due to authentication requirements.');
    console.log('Please use the admin panel at: http://localhost:3000/admin/test-email\n');
    console.log('🚀 Attempting to send test email to:', recipientEmail);
    
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

