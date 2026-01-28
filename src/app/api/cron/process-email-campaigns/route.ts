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

const BATCH_SIZE = 50; // Process 50 emails per run
const CRON_SECRET = process.env.CRON_SECRET;

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
          // Build variables from user data
          // NOTE: Campaigns are designed for marketing emails with basic user data.
          // Using transactional templates (payment-success, refund-processed, etc.)
          // in campaigns will fail because they require additional context that
          // campaigns don't store (payment amounts, dates, etc.)
          const variables: Record<string, any> = {
            // Core user variables (available for all templates)
            displayName: delivery.user?.display_name || 'there',
            username: delivery.user?.username || '',
            userEmail: delivery.to_email,
            
            // Provide reasonable defaults for common template variables
            // to prevent hard failures if someone accidentally uses wrong template
            studioName: delivery.user?.display_name || 'Your Studio',
            email: delivery.to_email,
            
            // URL defaults (templates should not use these in campaigns)
            verificationUrl: '',
            resetUrl: '',
            signupUrl: '',
            studioUrl: '',
            adminDashboardUrl: '',
            resetPasswordUrl: '',
            
            // Numeric/date defaults (templates should not use these in campaigns)
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
          
          // Send email
          const success = await sendTemplatedEmail({
            to: delivery.to_email,
            templateKey: campaign.template_key,
            variables,
            skipMarketingCheck: true, // Skip check - recipients already filtered at campaign start
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
