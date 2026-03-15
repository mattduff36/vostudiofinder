/**
 * Resend Webhook Handler
 * 
 * Receives email events from Resend and updates delivery tracking:
 * - email.opened: Records when a recipient opens an email
 * - email.clicked: Records when a recipient clicks a link
 * - email.bounced: Marks delivery as bounced
 * - email.delivered: Confirms delivery
 * 
 * Setup:
 * 1. Go to https://resend.com/webhooks → Add Webhook
 * 2. URL: https://voiceoverstudiofinder.com/api/webhooks/resend
 * 3. Select events: email.opened, email.clicked, email.bounced, email.delivered
 * 4. Copy the signing secret → set as RESEND_WEBHOOK_SECRET in env
 * 
 * Security: Validates the webhook using the svix-id header and shared secret.
 * Falls back to accepting unsigned requests in dev when secret is not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
    bounce?: {
      message: string;
      type: string;
    };
  };
}

function verifyWebhookSignature(body: string, svixId: string | null, svixTimestamp: string | null, svixSignature: string | null): boolean {
  if (!WEBHOOK_SECRET || !svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const toSign = `${svixId}.${svixTimestamp}.${body}`;
  const secretBytes = Buffer.from(WEBHOOK_SECRET.replace(/^whsec_/, ''), 'base64');
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64');

  const signatures = svixSignature.split(' ');
  return signatures.some(sig => {
    const sigValue = sig.replace(/^v1,/, '');
    return sigValue === expectedSignature;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(body, svixId, svixTimestamp, svixSignature);
      if (!isValid) {
        console.error('❌ [RESEND_WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('❌ [RESEND_WEBHOOK] RESEND_WEBHOOK_SECRET not configured in production');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    } else {
      console.warn('⚠️  [RESEND_WEBHOOK] No RESEND_WEBHOOK_SECRET - accepting unsigned (dev only)');
    }

    const event: ResendWebhookEvent = JSON.parse(body);
    const emailId = event.data.email_id;

    console.log(`📨 [RESEND_WEBHOOK] ${event.type} for email ${emailId}`);

    if (!emailId) {
      return NextResponse.json({ success: true, message: 'No email_id' });
    }

    switch (event.type) {
      case 'email.delivered':
        await handleDelivered(emailId);
        break;
      case 'email.opened':
        await handleOpened(emailId);
        break;
      case 'email.clicked':
        await handleClicked(emailId, event.data.click);
        break;
      case 'email.bounced':
        await handleBounced(emailId, event.data.bounce?.message);
        break;
      default:
        console.log(`[RESEND_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [RESEND_WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function findDeliveryByResendId(resendId: string) {
  return db.email_deliveries.findFirst({
    where: { resend_id: resendId },
  });
}

async function handleDelivered(resendId: string) {
  const delivery = await findDeliveryByResendId(resendId);
  if (!delivery) return;

  if (delivery.status === 'SENDING' || delivery.status === 'PENDING') {
    await db.email_deliveries.update({
      where: { id: delivery.id },
      data: { status: 'SENT', sent_at: delivery.sent_at ?? new Date() },
    });
    console.log(`✅ [RESEND_WEBHOOK] Delivery confirmed: ${delivery.id}`);
  }
}

async function handleOpened(resendId: string) {
  const delivery = await findDeliveryByResendId(resendId);
  if (!delivery) return;

  if (!delivery.opened_at) {
    await db.email_deliveries.update({
      where: { id: delivery.id },
      data: { opened_at: new Date() },
    });
    console.log(`👁️ [RESEND_WEBHOOK] Email opened: ${delivery.id}`);
  }
}

async function handleClicked(resendId: string, click?: { link: string; timestamp: string }) {
  const delivery = await findDeliveryByResendId(resendId);
  if (!delivery) return;

  if (!delivery.clicked_at) {
    await db.email_deliveries.update({
      where: { id: delivery.id },
      data: {
        clicked_at: click?.timestamp ? new Date(click.timestamp) : new Date(),
        clicked_link: click?.link ?? null,
        opened_at: delivery.opened_at ?? new Date(),
      },
    });
    console.log(`🔗 [RESEND_WEBHOOK] Link clicked: ${delivery.id} → ${click?.link}`);
  }
}

async function handleBounced(resendId: string, message?: string) {
  const delivery = await findDeliveryByResendId(resendId);
  if (!delivery) return;

  await db.email_deliveries.update({
    where: { id: delivery.id },
    data: {
      status: 'BOUNCED',
      error_message: message?.substring(0, 500) ?? 'Bounced',
    },
  });
  console.log(`⚠️ [RESEND_WEBHOOK] Email bounced: ${delivery.id}`);
}
