import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email recipient is required' },
        { status: 400 }
      );
    }

    // Send test email
    const success = await emailService.sendEmail({
      to,
      subject: 'Test Email from VoiceoverStudioFinder',
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #d42027;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #d42027;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎙️ VoiceoverStudioFinder</h1>
              </div>
              <div class="content">
                <h2>Test Email Successful!</h2>
                <p>Hello,</p>
                <p>This is a test email from VoiceoverStudioFinder. If you're reading this, it means your Resend integration is working perfectly! ✅</p>
                <p><strong>Email Service Details:</strong></p>
                <ul>
                  <li>Provider: Resend</li>
                  <li>Status: Active</li>
                  <li>Sent at: ${new Date().toLocaleString()}</li>
                </ul>
                <p>You can now use this email service for:</p>
                <ul>
                  <li>User registration confirmations</li>
                  <li>Password reset emails</li>
                  <li>Studio listing notifications</li>
                  <li>Contact form submissions</li>
                  <li>System notifications</li>
                </ul>
                <a href="https://voiceoverstudiofinder.com" class="button">Visit VoiceoverStudioFinder</a>
              </div>
              <div class="footer">
                <p>This is an automated test email from VoiceoverStudioFinder</p>
                <p>&copy; ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

