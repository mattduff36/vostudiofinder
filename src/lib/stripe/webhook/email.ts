import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import {
  calculateEarlyRenewalExpiry,
  calculateStandardRenewalExpiry,
  calculate5YearRenewalExpiry,
} from '@/lib/membership-renewal';

interface EmailConfirmationParams {
  userId: string;
  recipientEmail: string;
  customerName: string;
  paymentAmount: number;
  paymentCurrency: string;
  paymentId: string;
  isRenewal: boolean;
  renewalType?: string;
  currentExpiry?: string;
  membershipMonths?: number;
}

/**
 * Sends payment confirmation email with membership expiry date
 * Includes fallback date calculation if subscription is missing
 */
export async function sendMembershipConfirmationEmail(
  params: EmailConfirmationParams
): Promise<void> {
  
  // Fetch actual expiry date from database
  const updatedSubscription = await db.subscriptions.findFirst({
    where: { user_id: params.userId },
    orderBy: { created_at: 'desc' },
    select: { current_period_end: true },
  });

  let actualExpiryDate: Date;
  
  if (!updatedSubscription?.current_period_end) {
    // ERROR: Subscription not found after successful payment/renewal
    // Calculate fallback date to still send the email
    console.error(`[ERROR] No subscription found for user ${params.userId} after payment processing. Using fallback date calculation.`);
    
    actualExpiryDate = calculateFallbackExpiryDate(
      params.isRenewal,
      params.renewalType,
      params.currentExpiry,
      params.membershipMonths || 12
    );
  } else {
    actualExpiryDate = updatedSubscription.current_period_end;
  }
  
  // Determine plan name based on renewal type
  let planName = 'Annual Membership';
  if (params.isRenewal) {
    if (params.renewalType === 'early') {
      planName = 'Early Renewal (with 1-month bonus)';
    } else if (params.renewalType === 'standard') {
      planName = 'Standard Renewal';
    } else if (params.renewalType === '5year') {
      planName = '5-Year Membership';
    }
  }
  
  try {
    await sendTemplatedEmail({
      to: params.recipientEmail,
      templateKey: 'payment-success',
      variables: {
        customerName: params.customerName,
        amount: (params.paymentAmount / 100).toFixed(2),
        currency: params.paymentCurrency.toUpperCase(),
        paymentId: params.paymentId,
        planName,
        nextBillingDate: actualExpiryDate.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
      },
    });

    console.log(`[EMAIL] Confirmation email sent to ${params.recipientEmail} with expiry: ${actualExpiryDate.toISOString()}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send confirmation to ${params.recipientEmail} (payment already processed):`, error);
  }
}

/**
 * Calculates fallback expiry date when subscription record is missing
 */
function calculateFallbackExpiryDate(
  isRenewal: boolean,
  renewalType?: string,
  currentExpiry?: string,
  membershipMonths: number = 12
): Date {
  
  if (isRenewal && renewalType) {
    if ((renewalType === 'early' || renewalType === 'standard') && currentExpiry && currentExpiry !== 'none') {
      const currentExpiryDate = new Date(currentExpiry);
      if (renewalType === 'early') {
        return calculateEarlyRenewalExpiry(currentExpiryDate);
      } else {
        return calculateStandardRenewalExpiry(currentExpiryDate);
      }
    } else if (renewalType === '5year') {
      const currentExpiryDate = (currentExpiry && currentExpiry !== 'none') ? new Date(currentExpiry) : null;
      return calculate5YearRenewalExpiry(currentExpiryDate);
    }
  }
  
  // Default: calculate based on membership months
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + membershipMonths);
  return expiryDate;
}
