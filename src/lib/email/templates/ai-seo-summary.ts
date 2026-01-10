/**
 * AI SEO Copy Assistant Summary Template
 * 
 * Purpose: Share feature plan summary
 */

export function generateAiSeoSummaryEmail() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>AI SEO Copy Assistant - Feature Summary</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px;">
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <div style="margin-bottom: 32px;">
                <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-logo-email-white-bg.png" alt="Voiceover Studio Finder" width="200" height="auto" style="max-width: 200px; height: auto; display: block;" />
              </div>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">AI SEO Copy Assistant</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Feature Plan Summary</p>
            </td>
          </tr>
          
          <!-- Purpose Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Purpose</h2>
              <p style="margin: 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Add AI help inside the studio profile editor. Focus on SEO guidance and text drafting. User stays in control. Costs stay bounded.</p>
            </td>
          </tr>
          
          <!-- Core Features Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Core Features</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">Generate draft text for profile fields</p>
                    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                      <li>short_about</li>
                      <li>about</li>
                    </ul>
                    
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">Review SEO after profile save</p>
                    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                      <li>title</li>
                      <li>description</li>
                      <li>keywords</li>
                      <li>content suggestions</li>
                    </ul>
                    
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                      <li>User accepts or dismisses every suggestion</li>
                      <li>Nothing publishes automatically</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Safety and Control Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Safety and Control</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>No new claims added by AI</li>
                <li>AI only rephrases or structures user input</li>
                <li>No silent changes</li>
                <li>Minimal data sent to AI</li>
                <li>Strict output validation</li>
                <li>Graceful failure handling</li>
              </ul>
            </td>
          </tr>
          
          <!-- Architecture Decisions Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Architecture Decisions</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Provider-agnostic AI layer</li>
                <li>Swap OpenAI, Anthropic, or Google later</li>
                <li>Default to fast, low-cost models</li>
                <li>Optional fallback to stronger models</li>
                <li>One shared adapter for all AI use</li>
              </ul>
            </td>
          </tr>
          
          <!-- Backend Work Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Backend Work</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Build AI client layer</li>
                <li>Define prompts for field drafting and SEO review</li>
                <li>Enforce schemas on AI output</li>
                <li>Add API routes (field draft, SEO review)</li>
                <li>Add rate limiting and caching with Redis</li>
                <li>Optional database table to store suggestions</li>
              </ul>
            </td>
          </tr>
          
          <!-- Frontend Work Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Frontend Work</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Add Generate buttons beside text fields</li>
                <li>Show draft in a dialog</li>
                <li>Actions: insert, retry, cancel</li>
                <li>After save, trigger SEO review in background</li>
                <li>Show SEO suggestions as diffs</li>
                <li>Accept or decline per item</li>
              </ul>
            </td>
          </tr>
          
          <!-- SEO Refactor Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">SEO Refactor</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Extract SEO logic into one shared helper</li>
                <li>Use same logic for live profile pages and AI review display</li>
                <li>One source of truth</li>
              </ul>
            </td>
          </tr>
          
          <!-- Data Flow Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Data Flow</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">1. User edits profile</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">2. User saves</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">3. Profile updates</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">4. AI SEO review runs asynchronously</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">5. Suggestions returned</p>
                    <p style="margin: 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">6. User reviews and decides</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Rate Limiting Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Rate Limiting and Cost Control</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Per-user limits per hour or day</li>
                <li>Cache identical requests</li>
                <li>AI runs only on explicit user actions</li>
              </ul>
            </td>
          </tr>
          
          <!-- Observability Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Observability and Quality</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Logging and metrics</li>
                <li>Abuse detection</li>
                <li>Prompt and version tracking</li>
                <li>Support A/B testing later</li>
              </ul>
            </td>
          </tr>
          
          <!-- Rollout Plan Section -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Rollout Plan</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">Phase 0</p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">Adapter and one endpoint, local testing</p>
                    
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">Phase 1</p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">Draft generation for text fields</p>
                    
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">Phase 2</p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">SEO review after save</p>
                    
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">Phase 3</p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">Limits, telemetry, analytics</p>
                    
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">Future</p>
                    <p style="margin: 0; font-size: 14px; color: #4a4a4a; line-height: 1.8;">Opt-in bulk improvements, admin discovery via official APIs only</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Success Criteria Section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Success Criteria</h2>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
                <li>Users generate and insert drafts</li>
                <li>Users receive SEO suggestions after save</li>
                <li>All AI output validated</li>
                <li>Rate limits prevent abuse</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">Voiceover Studio Finder</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.</p>
              <p style="margin: 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">Questions? <a href="mailto:support@voiceoverstudiofinder.com" style="color: #d42027; text-decoration: underline;">support@voiceoverstudiofinder.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
AI SEO COPY ASSISTANT - FEATURE PLAN SUMMARY

Purpose
Add AI help inside the studio profile editor. Focus on SEO guidance and text drafting. User stays in control. Costs stay bounded.

Core Features
• Generate draft text for profile fields
  - short_about
  - about
• Review SEO after profile save
  - title
  - description
  - keywords
  - content suggestions
• User accepts or dismisses every suggestion
• Nothing publishes automatically

Safety and Control
• No new claims added by AI
• AI only rephrases or structures user input
• No silent changes
• Minimal data sent to AI
• Strict output validation
• Graceful failure handling

Architecture Decisions
• Provider-agnostic AI layer
• Swap OpenAI, Anthropic, or Google later
• Default to fast, low-cost models
• Optional fallback to stronger models
• One shared adapter for all AI use

Backend Work
• Build AI client layer
• Define prompts for field drafting and SEO review
• Enforce schemas on AI output
• Add API routes (field draft, SEO review)
• Add rate limiting and caching with Redis
• Optional database table to store suggestions

Frontend Work
• Add Generate buttons beside text fields
• Show draft in a dialog
• Actions: insert, retry, cancel
• After save, trigger SEO review in background
• Show SEO suggestions as diffs
• Accept or decline per item

SEO Refactor
• Extract SEO logic into one shared helper
• Use same logic for live profile pages and AI review display
• One source of truth

Data Flow
1. User edits profile
2. User saves
3. Profile updates
4. AI SEO review runs asynchronously
5. Suggestions returned
6. User reviews and decides

Rate Limiting and Cost Control
• Per-user limits per hour or day
• Cache identical requests
• AI runs only on explicit user actions

Observability and Quality
• Logging and metrics
• Abuse detection
• Prompt and version tracking
• Support A/B testing later

Rollout Plan
Phase 0: Adapter and one endpoint, local testing
Phase 1: Draft generation for text fields
Phase 2: SEO review after save
Phase 3: Limits, telemetry, analytics
Future: Opt-in bulk improvements, admin discovery via official APIs only

Success Criteria
• Users generate and insert drafts
• Users receive SEO suggestions after save
• All AI output validated
• Rate limits prevent abuse

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
  `.trim();

  return { html, text };
}
