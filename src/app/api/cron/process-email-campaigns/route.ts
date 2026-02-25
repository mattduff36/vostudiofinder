/**
 * POST /api/cron/process-email-campaigns
 * Background job to process pending email campaigns
 * 
 * This cron job:
 * 1. Finds campaigns with status SENDING
 * 2. Processes deliveries in batches
 * 3. Updates delivery status and campaign progress
 * 4. Marks campaign as SENT when complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { generateLegacyUserResetUrl } from '@/lib/email/templates/legacy-user-announcement';

const BATCH_SIZE = 10;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Resolve template-specific variables that require per-user generation
 * (e.g. password reset URLs unique to each recipient).
 */
async function resolveTemplateVariables(
  templateKey: string,
  baseVariables: Record<string, any>,
  userEmail: string,
): Promise<Record<string, any>> {
  const variables = { ...baseVariables };

  if (templateKey === 'legacy-user-announcement') {
    variables.resetPasswordUrl = await generateLegacyUserResetUrl(userEmail);
  }

  return variables;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret is configured
    if (!CRON_SECRET) {
      console.error('❌ CRON_SECRET is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn('❌ Unauthorized cron request:', authHeader);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find campaigns that are currently sending and not waiting for a scheduled retry
    const campaigns = await db.email_campaigns.findMany({
      where: {
        status: 'SENDING',
        OR: [
          { retry_after: null },
          { retry_after: { lte: new Date() } },
        ],
      },
      include: {
        template: {
          select: {
            key: true,
            is_marketing: true,
          },
        },
      },
      take: 5,
    });
    
    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;
    
    for (const campaign of campaigns) {
      // Clear retry_after when we start processing (the wait period has elapsed)
      if (campaign.retry_after) {
        await db.email_campaigns.update({
          where: { id: campaign.id },
          data: { retry_after: null },
        });
      }

      const deliveries = await db.email_deliveries.findMany({
        where: {
          campaign_id: campaign.id,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              display_name: true,
              username: true,
            },
          },
        },
        take: BATCH_SIZE,
      });
      
      if (deliveries.length === 0) {
        // All PENDING deliveries processed — check for auto-retry or mark complete
        const stats = await db.email_deliveries.groupBy({
          by: ['status'],
          where: { campaign_id: campaign.id },
          _count: true,
        });

        const sentCount = stats.find(s => s.status === 'SENT')?._count || 0;
        const failedCount = stats.find(s => s.status === 'FAILED')?._count || 0;

        const nextRetryCount = campaign.retry_count + 1;
        const withinRetryLimit = campaign.max_retries > 0 && nextRetryCount <= campaign.max_retries;

        if (campaign.auto_retry && failedCount > 0 && withinRetryLimit) {
          const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await db.email_deliveries.updateMany({
            where: { campaign_id: campaign.id, status: 'FAILED' },
            data: { status: 'PENDING', failed_at: null, error_message: null },
          });

          await db.email_campaigns.update({
            where: { id: campaign.id },
            data: {
              retry_after: retryAt,
              retry_count: nextRetryCount,
              sent_count: sentCount,
              failed_count: failedCount,
            },
          });

          console.log(`🔄 Auto-retry ${nextRetryCount}/${campaign.max_retries} scheduled for campaign: ${campaign.name} — ${failedCount} failed deliveries will retry at ${retryAt.toISOString()}`);
          continue;
        }

        await db.email_campaigns.update({
          where: { id: campaign.id },
          data: {
            status: 'SENT',
            completed_at: new Date(),
            sent_count: sentCount,
            failed_count: failedCount,
            auto_retry: false,
            retry_after: null,
          },
        });

        console.log(`✅ Campaign completed: ${campaign.name} (${sentCount} sent, ${failedCount} failed)`);
        continue;
      }
      
      // Process deliveries
      for (const delivery of deliveries) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';
          const baseVariables: Record<string, any> = {
            displayName: delivery.user?.display_name || 'there',
            username: delivery.user?.username || '',
            userEmail: delivery.to_email,
            profileUrl: delivery.user?.username ? `${baseUrl}/${delivery.user.username}` : baseUrl,
            studioName: delivery.user?.display_name || 'Your Studio',
            email: delivery.to_email,
            verificationUrl: '',
            resetUrl: '',
            signupUrl: '',
            studioUrl: '',
            adminDashboardUrl: '',
            resetPasswordUrl: '',
            amount: '0.00',
            currency: 'USD',
            paymentId: '',
            planName: '',
            nextBillingDate: '',
            profileCompletion: 0,
            daysRemaining: 0,
            reservationExpiresAt: '',
            refundAmount: '0.00',
            paymentAmount: '0.00',
            refundType: '',
            refundDate: '',
            isFullRefund: 'no',
            comment: '',
            errorMessage: '',
            retryUrl: '',
          };

          const variables = await resolveTemplateVariables(
            campaign.template_key,
            baseVariables,
            delivery.to_email,
          );

          const success = await sendTemplatedEmail({
            to: delivery.to_email,
            templateKey: campaign.template_key,
            variables,
            skipMarketingCheck: true,
          });
          
          if (success) {
            await db.email_deliveries.update({
              where: { id: delivery.id },
              data: {
                status: 'SENT',
                sent_at: new Date(),
              },
            });
            totalSent++;
          } else {
            await db.email_deliveries.update({
              where: { id: delivery.id },
              data: {
                status: 'FAILED',
                failed_at: new Date(),
                error_message: 'Send returned false',
              },
            });
            totalFailed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          await db.email_deliveries.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              failed_at: new Date(),
              error_message: errorMessage.substring(0, 500),
            },
          });
          
          console.error(`Failed to send email to ${delivery.to_email}:`, error);
          totalFailed++;
        }
        
        totalProcessed++;
      }
      
      // Update campaign progress
      const stats = await db.email_deliveries.groupBy({
        by: ['status'],
        where: {
          campaign_id: campaign.id,
        },
        _count: true,
      });
      
      const sentCount = stats.find(s => s.status === 'SENT')?._count || 0;
      const failedCount = stats.find(s => s.status === 'FAILED')?._count || 0;
      
      await db.email_campaigns.update({
        where: { id: campaign.id },
        data: {
          sent_count: sentCount,
          failed_count: failedCount,
        },
      });
    }
    
    console.log(`📧 Processed ${totalProcessed} emails (${totalSent} sent, ${totalFailed} failed)`);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
      campaigns: campaigns.length,
    });
  } catch (error) {
    console.error('Error processing campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to process campaigns' },
      { status: 500 }
    );
  }
}
