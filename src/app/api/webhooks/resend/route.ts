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
 * Requires signed requests in every environment, including timestamp freshness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import { z } from 'zod';

// Verification is entirely local; this instance never submits an API request.
const verifier = new Resend('webhook-verification-only');
const eventSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string().min(1).optional(),
    click: z.object({ link: z.string().max(10_000), timestamp: z.iso.datetime({ offset: true }) }).optional(),
    bounce: z.object({ message: z.string().optional() }).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook signing is not configured' }, { status: 503 });
    let verified: unknown;
    try {
      verified = verifier.webhooks.verify({ payload: body, webhookSecret: secret, headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      } });
    } catch {
      return NextResponse.json({ error: 'Invalid webhook signature or timestamp' }, { status: 401 });
    }
    const parsed = eventSchema.safeParse(verified);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid webhook event' }, { status: 400 });
    const event = parsed.data;
    const emailId = event.data.email_id;
    if (!emailId) return NextResponse.json({ success: true, message: 'No email_id' });

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
  } catch {
    console.error('[RESEND_WEBHOOK] Processing failed');
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
    console.log(`🔗 [RESEND_WEBHOOK] Link clicked: ${delivery.id}`);
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
