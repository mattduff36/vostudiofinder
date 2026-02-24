/**
 * Hero Email Layout Renderer
 * 
 * This is the LOCKED layout with a hero image section (used by legacy-user-announcement).
 * Structure: Hero Image/Text > Content > CTA(s) > Footer
 * 
 * Admins can only edit the COPY (text content), not the HTML structure.
 */

export interface HeroLayoutProps {
  subject: string;
  preheader?: string;
  heroImageUrl?: string; // Optional hero image URL
  heroImageAlt?: string; // Alt text for hero image
  /** @deprecated No longer used — image scales to natural aspect ratio */
  heroImageHeight?: number;
  heading: string;
  bodyParagraphs: string[]; // Plain text paragraphs
  bulletItems?: string[];
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  footerText?: string;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Convert plain text paragraphs to HTML <p> tags
 */
function renderParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map(p => {
      const escaped = escapeHtml(p);
      const withLineBreaks = escaped.replace(/\n/g, '<br>');
      return `              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">${withLineBreaks}</p>`;
    })
    .join('\n');
}

/**
 * Render bullet list
 */
function renderBullets(items: string[]): string {
  if (!items || items.length === 0) return '';
  
  const listItems = items
    .map(item => `                      <li>${escapeHtml(item)}</li>`)
    .join('\n');
  
  return `          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6a6a6a; line-height: 1.8;">
${listItems}
              </ul>
            </td>
          </tr>`;
}

/**
 * Render CTA button with Outlook MSO fallback
 */
function renderButton(label: string, url: string, backgroundColor: string = '#d42027'): string {
  const escapedLabel = escapeHtml(label);
  const escapedUrl = escapeHtml(url);
  
  return `              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${escapedUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%"
                      stroke="f" fillcolor="${backgroundColor}">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        ${escapedLabel}
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${escapedUrl}"
                      style="background:${backgroundColor};border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">${escapedLabel}</span>
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>`;
}

/**
 * Render hero email layout with optional hero image
 */
export function renderHeroLayout(props: HeroLayoutProps): { html: string; text: string } {
  const {
    subject,
    preheader,
    heroImageUrl,
    heroImageAlt = 'Hero Image',
    heading,
    bodyParagraphs,
    bulletItems,
    ctaPrimaryLabel,
    ctaPrimaryUrl,
    ctaSecondaryLabel,
    ctaSecondaryUrl,
    footerText,
  } = props;

  const escapedHeading = escapeHtml(heading);
  const currentYear = new Date().getFullYear();
  const defaultFooter = `Voiceover Studio Finder\n© ${currentYear} Voiceover Studio Finder. All rights reserved.\nQuestions? support@voiceoverstudiofinder.com`;
  const finalFooter = footerText || defaultFooter;
  
  // Convert footer text to HTML
  const footerHtml = finalFooter
    .split('\n')
    .map(line => {
      const escaped = escapeHtml(line);
      // Convert URLs to clickable links
      const withUrls = escaped.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color: #d42027; text-decoration: underline; word-break: break-all;">$1</a>'
      );
      // Convert email addresses to mailto links (only those not already inside an href)
      const withLinks = withUrls.replace(
        /(?<!["=])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<a href="mailto:$1" style="color: #d42027; text-decoration: underline;">$1</a>'
      );
      return `              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">${withLinks}</p>`;
    })
    .join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(subject)}</title>${preheader ? `\n  <meta name="description" content="${escapeHtml(preheader)}">` : ''}
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px; overflow: hidden;">
          ${heroImageUrl ? `<!-- Hero Section -->
          <tr>
            <td style="padding: 0; background-color: #1a1a1a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0;">
                    <img src="${escapeHtml(heroImageUrl)}" alt="${escapeHtml(heroImageAlt)}" width="600" style="max-width: 600px; width: 100%; height: auto; display: block; margin: 0; border: 0; outline: none; text-decoration: none;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}<!-- Content Section -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">${escapedHeading}</h1>
${renderParagraphs(bodyParagraphs)}
            </td>
          </tr>
${bulletItems && bulletItems.length > 0 ? renderBullets(bulletItems) + '\n' : ''}${ctaPrimaryLabel && ctaPrimaryUrl ? `          <tr>
            <td style="padding: 0 40px 32px 40px;">
${renderButton(ctaPrimaryLabel, ctaPrimaryUrl)}
            </td>
          </tr>
` : ''}${ctaSecondaryLabel && ctaSecondaryUrl ? `          <tr>
            <td style="padding: 0 40px 32px 40px;">
${renderButton(ctaSecondaryLabel, ctaSecondaryUrl, '#22c55e')}
            </td>
          </tr>
` : ''}          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Generate plain text version
  const textParagraphs = bodyParagraphs.join('\n\n');
  const textBullets = bulletItems && bulletItems.length > 0
    ? '\n\n' + bulletItems.map(item => `• ${item}`).join('\n')
    : '';
  const textCtas = [
    ctaPrimaryLabel && ctaPrimaryUrl ? `\n${ctaPrimaryLabel}:\n${ctaPrimaryUrl}` : '',
    ctaSecondaryLabel && ctaSecondaryUrl ? `\n${ctaSecondaryLabel}:\n${ctaSecondaryUrl}` : '',
  ].filter(Boolean).join('\n');

  const text = `
${heading}

${textParagraphs}${textBullets}${textCtas}

---
${finalFooter}
  `.trim();

  return { html, text };
}
