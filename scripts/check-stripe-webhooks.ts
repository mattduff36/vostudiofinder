/**
 * Diagnostic script to check Stripe webhook and payment status
 * Run with: npx ts-node scripts/check-stripe-webhooks.ts
 */

import { db } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function checkStripeStatus() {
  console.log('\n🔍 Checking Stripe Webhook & Payment Status...\n');
  
  try {
    // Check webhook events
    console.log('📋 Webhook Events:');
    const webhookEvents = await db.stripe_webhook_events.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    
    if (webhookEvents.length === 0) {
      console.log('   ❌ NO webhook events found');
      console.log('   ⚠️  This means webhooks are NOT being received');
      console.log('   💡 Solution: Run Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook\n');
    } else {
      console.log(`   ✅ Found ${webhookEvents.length} webhook events (showing last 20)\n`);
      
      const eventTypes = new Map<string, number>();
      const processed = webhookEvents.filter(e => e.processed).length;
      const failed = webhookEvents.filter(e => e.error).length;
      
      webhookEvents.forEach(event => {
        const count = eventTypes.get(event.type) || 0;
        eventTypes.set(event.type, count + 1);
        
        console.log(`   ${event.processed ? '✅' : '⏳'} ${event.type} - ${event.created_at.toISOString()}`);
        if (event.error) {
          console.log(`      ❌ Error: ${event.error}`);
        }
      });
      
      console.log(`\n   Summary:`);
      console.log(`   - Processed: ${processed}/${webhookEvents.length}`);
      console.log(`   - Failed: ${failed}/${webhookEvents.length}`);
      console.log(`   - Event types:`);
      eventTypes.forEach((count, type) => {
        console.log(`     - ${type}: ${count}`);
      });
    }
    
    // Check payments
    console.log('\n💳 Payments:');
    const payments = await db.payments.findMany({
      include: {
        users: {
          select: {
            email: true,
            username: true,
            display_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    
    if (payments.length === 0) {
      console.log('   ❌ NO payments found in database');
      console.log('   ⚠️  Possible causes:');
      console.log('      1. Webhooks not being received (check above)');
      console.log('      2. User accounts not created before payment');
      console.log('      3. Payment webhook events are being deferred\n');
    } else {
      console.log(`   ✅ Found ${payments.length} payments (showing last 20)\n`);
      
      const statusCounts = new Map<string, number>();
      
      payments.forEach(payment => {
        const count = statusCounts.get(payment.status) || 0;
        statusCounts.set(payment.status, count + 1);
        
        const statusEmoji = {
          SUCCEEDED: '✅',
          FAILED: '❌',
          PENDING: '⏳',
          REFUNDED: '↩️',
          PARTIALLY_REFUNDED: '↩️',
          CANCELLED: '🚫',
        }[payment.status] || '❓';
        
        console.log(`   ${statusEmoji} ${payment.status} - ${payment.users.email} - ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
        console.log(`      Created: ${payment.created_at.toISOString()}`);
        console.log(`      Payment Intent: ${payment.stripe_payment_intent_id || 'N/A'}`);
        console.log(`      Session: ${payment.stripe_checkout_session_id || 'N/A'}`);
        if (payment.status === 'FAILED' && payment.metadata) {
          const meta = payment.metadata as any;
          console.log(`      Error: ${meta.error || 'Unknown'}`);
        }
        console.log('');
      });
      
      console.log(`   Status breakdown:`);
      statusCounts.forEach((count, status) => {
        console.log(`   - ${status}: ${count}`);
      });
    }
    
    // Check users with recent signups
    console.log('\n👥 Recent Users (last 10):');
    const recentUsers = await db.users.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        email: true,
        username: true,
        display_name: true,
        created_at: true,
        role: true,
      },
    });
    
    recentUsers.forEach(user => {
      console.log(`   - ${user.email} (@${user.username}) - ${user.role} - ${user.created_at.toISOString()}`);
    });
    
    // Check for deferred payments
    console.log('\n⏳ Deferred Webhook Events:');
    const deferredEvents = await db.stripe_webhook_events.findMany({
      where: {
        processed: false,
        error: {
          contains: 'deferred',
        },
      },
      orderBy: { created_at: 'desc' },
    });
    
    if (deferredEvents.length === 0) {
      console.log('   ✅ No deferred events');
    } else {
      console.log(`   ⚠️  Found ${deferredEvents.length} deferred events:`);
      deferredEvents.forEach(event => {
        console.log(`   - ${event.type} - ${event.error}`);
        console.log(`     Event ID: ${event.stripe_event_id}`);
        console.log(`     Created: ${event.created_at.toISOString()}\n`);
      });
    }
    
    // Recommendations
    console.log('\n💡 Troubleshooting Steps:\n');
    
    if (webhookEvents.length === 0) {
      console.log('1. ❌ WEBHOOKS NOT WORKING');
      console.log('   Start Stripe CLI:');
      console.log('   $ stripe listen --forward-to localhost:3000/api/stripe/webhook\n');
      console.log('   Copy the webhook secret (whsec_...) to .env.local:');
      console.log('   STRIPE_WEBHOOK_SECRET="whsec_..."\n');
      console.log('   Restart your dev server after updating .env.local\n');
    } else if (payments.length === 0 && webhookEvents.length > 0) {
      console.log('1. ⚠️  WEBHOOKS RECEIVED BUT NO PAYMENTS RECORDED');
      console.log('   Possible causes:');
      console.log('   - User accounts not created before payment attempt');
      console.log('   - Payment events are being deferred');
      console.log('   - Check webhook event errors above\n');
    } else {
      console.log('1. ✅ WEBHOOKS AND PAYMENTS WORKING');
      console.log('   Payments should appear in /admin/payments\n');
    }
    
    console.log('2. Test Payment Flow:');
    console.log('   - Go to http://localhost:3000/auth/signup');
    console.log('   - Use test card: 4242 4242 4242 4242');
    console.log('   - Check terminal for webhook logs');
    console.log('   - Check /admin/payments for payment record\n');
    
    console.log('3. Check Terminal Logs:');
    console.log('   Look for these in your dev server terminal:');
    console.log('   - 🎣 Webhook received');
    console.log('   - ✅ Webhook verified');
    console.log('   - 💳 Processing membership payment');
    console.log('   - ✅ Payment recorded\n');
    
  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the check
checkStripeStatus();
