#!/usr/bin/env node

/**
 * Test script to send a sample booking enquiry email
 * This demonstrates the new professional email template format
 */

const API_URL = 'http://localhost:3000/api/contact/studio';

const testData = {
  studioId: 'test-studio-id',
  studioName: 'Test Studio (Email Template Preview)',
  ownerEmail: 'admin@mpdee.co.uk',
  senderName: 'John Smith',
  senderEmail: 'test-sender@example.com',
  message: 'Hi, I would like to book your studio for a voiceover recording session next week.\n\nI need approximately 2 hours for a commercial project. Do you have availability on Tuesday afternoon?\n\nLooking forward to hearing from you!\n\nBest regards,\nJohn'
};

async function sendTestEmail() {
  try {
    console.log('📧 Sending test booking enquiry email to admin@mpdee.co.uk...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success! Email sent.');
      console.log('📬 Check your inbox at admin@mpdee.co.uk\n');
      console.log('Result:', result);
    } else {
      console.error('❌ Failed to send email');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

sendTestEmail();
