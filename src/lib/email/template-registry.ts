/**
 * Email Template Registry
 * 
 * Maps all existing email templates into the new system with:
 * - Default copy for each editable field
 * - Variable schema (allowed placeholders)
 * - Layout type
 * - Marketing/system flags
 */

import { EmailLayout } from '@prisma/client';

export interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
  layout: EmailLayout;
  isMarketing: boolean;
  isSystem: boolean;
  
  // Sender defaults
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  
  // Default copy
  subject: string;
  preheader?: string;
  heading: string;
  bodyParagraphs: string[];
  bulletItems?: string[];
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string; // Can include {{placeholders}}
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  footerText?: string;
  
  // For hero layout
  heroImageUrl?: string;
  heroImageAlt?: string;
  heroImageHeight?: number;
  
  // Variable schema - defines what placeholders are allowed
  variableSchema: Record<string, 'string' | 'url' | 'email' | 'number' | 'date'>;
}

/**
 * Registry of all email templates
 */
export const EMAIL_TEMPLATES: TemplateDefinition[] = [
  // ============================================
  // TRANSACTIONAL / SYSTEM EMAILS
  // ============================================
  {
    key: 'email-verification',
    name: 'Email Verification',
    description: 'Sent when a new user signs up to verify their email address',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Verify your email address',
    preheader: 'Complete your account setup by verifying your email',
    heading: 'Verify your email address',
    bodyParagraphs: [
      'Hi {{displayName}},',
      'We received a request to create an account for {{userEmail}}. Verify your email to activate your account.',
      'If the button doesn\'t work, copy and paste this link:\n{{verificationUrl}}',
      'This link expires in 24 hours. If you didn\'t create an account, you can ignore this email.',
    ],
    ctaPrimaryLabel: 'Verify email address',
    ctaPrimaryUrl: '{{verificationUrl}}',
    variableSchema: {
      displayName: 'string',
      userEmail: 'email',
      verificationUrl: 'url',
    },
  },
  
  {
    key: 'password-reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Reset your password',
    heading: 'Reset your password',
    bodyParagraphs: [
      'We received a request to reset the password for {{userEmail}}. Click the button below to set a new password.',
      'If the button doesn\'t work, copy and paste this link:\n{{resetUrl}}',
      'This link expires in 1 hour. If you didn\'t request a password reset, you can ignore this email.',
    ],
    ctaPrimaryLabel: 'Reset password',
    ctaPrimaryUrl: '{{resetUrl}}',
    variableSchema: {
      userEmail: 'email',
      resetUrl: 'url',
    },
  },
  
  {
    key: 'payment-success',
    name: 'Payment Success',
    description: 'Sent when a membership payment is successfully processed',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Payment received',
    heading: 'Payment received',
    bodyParagraphs: [
      'We\'ve successfully processed your payment. Your Premium membership is now active.',
      'Amount: {{amount}} {{currency}}',
      'Payment ID: {{paymentId}}',
      'Plan: {{planName}}',
      'Next billing date: {{nextBillingDate}}',
    ],
    ctaPrimaryLabel: 'View dashboard',
    ctaPrimaryUrl: 'https://voiceoverstudiofinder.com/dashboard',
    variableSchema: {
      customerName: 'string',
      amount: 'string',
      currency: 'string',
      paymentId: 'string',
      planName: 'string',
      nextBillingDate: 'string',
    },
  },
  
  {
    key: 'refund-processed',
    name: 'Refund Processed',
    description: 'Sent when a refund has been processed',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Refund processed',
    heading: 'Refund processed',
    bodyParagraphs: [
      'Hi {{displayName}},',
      'We\'ve processed a {{refundType}} refund of {{refundAmount}} {{currency}} for your payment of {{paymentAmount}} {{currency}}.',
      'Refund Details:\nAmount: {{refundAmount}} {{currency}}\nDate: {{refundDate}}\nType: {{refundType}}',
      '{{comment}}',
      'The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.',
    ],
    ctaPrimaryLabel: 'View Dashboard',
    ctaPrimaryUrl: 'https://voiceoverstudiofinder.com/dashboard',
    variableSchema: {
      displayName: 'string',
      refundAmount: 'string',
      currency: 'string',
      paymentAmount: 'string',
      refundType: 'string',
      isFullRefund: 'string',
      comment: 'string',
      refundDate: 'string',
    },
  },
  
  {
    key: 'verification-request',
    name: 'Verification Request (Admin)',
    description: 'Sent to admins when a studio owner requests verified status',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Verification Request - {{studioName}} (@{{username}})',
    heading: 'Verification Request Received',
    bodyParagraphs: [
      'A studio owner has requested verified status for their profile.',
      'Studio Name: {{studioName}}',
      'Owner: {{studioOwnerName}}',
      'Username: @{{username}}',
      'Email: {{email}}',
      'Profile Completion: {{profileCompletion}}%',
    ],
    bulletItems: [
      'Profile is at least 85% complete',
      'Studio information is accurate and professional',
      'Contact details are valid',
      'Images meet quality standards',
      'No policy violations',
    ],
    ctaPrimaryLabel: 'View studio profile',
    ctaPrimaryUrl: '{{studioUrl}}',
    ctaSecondaryLabel: 'Review in admin',
    ctaSecondaryUrl: '{{adminDashboardUrl}}',
    variableSchema: {
      studioOwnerName: 'string',
      studioName: 'string',
      username: 'string',
      email: 'email',
      profileCompletion: 'number',
      studioUrl: 'url',
      adminDashboardUrl: 'url',
    },
  },
  
  {
    key: 'reservation-reminder-day2',
    name: 'Username Reservation - Day 2 Reminder',
    description: 'Sent 2 days after signup to remind users to complete payment',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Complete Your Signup - @{{username}} is Reserved for You',
    heading: 'Complete your signup',
    bodyParagraphs: [
      'You started signing up but didn\'t complete your payment. Your username @{{username}} is reserved until {{reservationExpiresAt}}.',
      'Reserved username: @{{username}}',
      '{{daysRemaining}} days remaining',
    ],
    ctaPrimaryLabel: 'Complete signup',
    ctaPrimaryUrl: '{{signupUrl}}',
    variableSchema: {
      displayName: 'string',
      username: 'string',
      reservationExpiresAt: 'string',
      daysRemaining: 'number',
      signupUrl: 'url',
    },
  },
  
  {
    key: 'reservation-urgency-day5',
    name: 'Username Reservation - Day 5 Urgency',
    description: 'Sent 5 days after signup with urgency messaging',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: '⏰ Only {{daysRemaining}} Days Left to Claim @{{username}}',
    heading: 'Your username reservation expires in {{daysRemaining}} days',
    bodyParagraphs: [
      'Complete your signup before {{reservationExpiresAt}} to keep @{{username}}. After this date, the username will become available to others.',
      'Reserved username: @{{username}}',
      'Expires {{reservationExpiresAt}}',
    ],
    ctaPrimaryLabel: 'Complete signup',
    ctaPrimaryUrl: '{{signupUrl}}',
    variableSchema: {
      displayName: 'string',
      username: 'string',
      reservationExpiresAt: 'string',
      daysRemaining: 'number',
      signupUrl: 'url',
    },
  },
  
  {
    key: 'reservation-expired',
    name: 'Username Reservation Expired',
    description: 'Sent when a username reservation expires',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Your @{{username}} Reservation Has Expired',
    heading: 'Your username reservation has expired',
    bodyParagraphs: [
      'The reservation for @{{username}} has expired and is now available to others. Your signup data has been removed.',
      'If you\'d like to join Voiceover Studio Finder, you can sign up again. The username @{{username}} may or may not still be available.',
    ],
    ctaPrimaryLabel: 'Sign up again',
    ctaPrimaryUrl: '{{signupUrl}}',
    variableSchema: {
      displayName: 'string',
      username: 'string',
      signupUrl: 'url',
    },
  },
  
  {
    key: 'payment-failed-reservation',
    name: 'Payment Failed - Username Reservation',
    description: 'Sent when payment fails during signup (username still reserved)',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Payment Issue - Complete Your Signup to Claim @{{username}}',
    heading: 'Payment issue with your signup',
    bodyParagraphs: [
      'We couldn\'t process your payment. Your username @{{username}} is reserved until {{reservationExpiresAt}}.',
      'Error: {{errorMessage}}',
      'Reserved username: @{{username}}',
      'Reserved until {{reservationExpiresAt}}',
    ],
    ctaPrimaryLabel: 'Retry payment',
    ctaPrimaryUrl: '{{retryUrl}}',
    variableSchema: {
      displayName: 'string',
      username: 'string',
      amount: 'string',
      currency: 'string',
      errorMessage: 'string',
      reservationExpiresAt: 'string',
      retryUrl: 'url',
    },
  },
  
  {
    key: 'support-request',
    name: 'Support Request (to Support Team)',
    description: 'Sent to support inbox when a user submits a support issue',
    layout: 'STANDARD',
    isMarketing: false,
    isSystem: true,
    subject: 'Support request: {{category}} — @{{username}}',
    heading: 'New support request',
    bodyParagraphs: [
      'A user has submitted a support request.',
      'From: {{displayName}} (@{{username}})',
      'Email: {{userEmail}}',
      'Category: {{category}}',
      'Submitted: {{submittedAt}}',
      '{{message}}',
    ],
    footerText: 'Reply directly to this email to respond to the user.',
    variableSchema: {
      displayName: 'string',
      username: 'string',
      userEmail: 'email',
      category: 'string',
      submittedAt: 'string',
      message: 'string',
    },
  },
  
  // ============================================
  // MARKETING / ANNOUNCEMENT EMAILS
  // ============================================
  {
    key: 'legacy-user-announcement',
    name: 'Legacy User Announcement',
    description: 'Re-engagement email for legacy users — 6 months free Premium from first login, profile already visible',
    layout: 'HERO',
    isMarketing: true,
    isSystem: false,
    heroImageUrl: 'https://voiceoverstudiofinder.com/images/its-back-voiceover-studio-finder-email-header.png',
    heroImageAlt: 'It\'s back... Voiceover Studio Finder - Professional Voiceover, Podcast & Broadcast Studios Worldwide',
    subject: 'Voiceover Studio Finder is back — and your Premium membership is waiting',
    preheader: 'Six months of free Premium membership starts the moment you sign in.',
    heading: 'Voiceover Studio Finder is back!',
    bodyParagraphs: [
      'Hi {{displayName}},',
      'Voiceover Studio Finder is back, and we\'re genuinely excited to share it with you!',
      'We\'ve rebuilt everything. The platform is faster. The search is smarter. The design is beautifully clean.',
      'Every feature has been meticulously rethought and redesigned. Every interaction has been refined. Every detail matters.',
      'We now offer two membership tiers: Basic (free) and Premium. You\'ve been part of our community from the beginning. That\'s why six months of Premium membership starts the moment you sign in and see your new profile.',
      'Thank you for being a member. We can\'t wait to show you what we\'ve built!',
    ],
    ctaPrimaryLabel: 'Set password and sign in',
    ctaPrimaryUrl: '{{resetPasswordUrl}}',
    footerText: 'Your account: {{userEmail}}.\nIf the button above doesn\'t work, copy and paste this link into your browser:\n{{resetPasswordUrl}}',
    variableSchema: {
      displayName: 'string',
      userEmail: 'email',
      resetPasswordUrl: 'url',
    },
  },
];

/**
 * Get template definition by key
 */
export function getTemplateDefinition(key: string): TemplateDefinition | undefined {
  return EMAIL_TEMPLATES.find(t => t.key === key);
}

/**
 * Get all template keys
 */
export function getAllTemplateKeys(): string[] {
  return EMAIL_TEMPLATES.map(t => t.key);
}

/**
 * Validate that a template key exists
 */
export function isValidTemplateKey(key: string): boolean {
  return EMAIL_TEMPLATES.some(t => t.key === key);
}

/**
 * Get all system templates (cannot be deleted)
 */
export function getSystemTemplates(): TemplateDefinition[] {
  return EMAIL_TEMPLATES.filter(t => t.isSystem);
}

/**
 * Get all marketing templates
 */
export function getMarketingTemplates(): TemplateDefinition[] {
  return EMAIL_TEMPLATES.filter(t => t.isMarketing);
}
