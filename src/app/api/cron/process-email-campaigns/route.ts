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

const BATCH_SIZE = 50;
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

export async function POST(request: NextRequest) {
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
    
    // Find campaigns that are currently sending
    const campaigns = await db.email_campaigns.findMany({
      where: {
        status: 'SENDING',
      },
      include: {
        template: {
          select: {
            key: true,
            is_marketing: true,
          },
        },
      },
      take: 5, // Process up to 5 campaigns per run
    });
    
    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;
    
    for (const campaign of campaigns) {
      // Get pending deliveries for this campaign
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
        // All deliveries processed, mark campaign as complete
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
            status: 'SENT',
            completed_at: new Date(),
            sent_count: sentCount,
            failed_count: failedCount,
          },
        });
        
        console.log(`✅ Campaign completed: ${campaign.name} (${sentCount} sent, ${failedCount} failed)`);
        continue;
      }
      
      // Process deliveries
      for (const delivery of deliveries) {
        try {
          const baseVariables: Record<string, any> = {
            displayName: delivery.user?.display_name || 'there',
            username: delivery.user?.username || '',
            userEmail: delivery.to_email,
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
