import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

/**
 * Parses coupon metadata from Stripe session to extract custom membership duration
 */
export async function parseCouponMembershipMonths(
  session: Stripe.Checkout.Session
): Promise<{ membershipMonths: number; couponCode: string | null }> {
  let membershipMonths = 12; // Default 12 months
  let couponCode: string | null = null;
  
  if (session.total_details?.breakdown?.discounts && session.total_details.breakdown.discounts.length > 0) {
    const discount = session.total_details.breakdown.discounts[0];
    couponCode = (discount as any)?.discount?.source?.coupon?.id || null;
    
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        
        if (coupon.metadata?.membership_months) {
          const parsedMonths = parseInt(coupon.metadata.membership_months, 10);
          
          // Validate parsed value is reasonable (1-60 months)
          if (!isNaN(parsedMonths) && parsedMonths > 0 && parsedMonths <= 60) {
            membershipMonths = parsedMonths;
          }
        }
      } catch (err) {
        console.warn(`[Coupon] Could not retrieve coupon metadata:`, err);
      }
    }
  }
  
  return { membershipMonths, couponCode };
}

/**
 * Validates required metadata fields for membership payment
 */
export function validateMembershipMetadata(
  metadata: Stripe.Metadata | null | undefined,
  purpose: string
): { 
  valid: true; 
  data: { user_id: string; user_email: string; user_name?: string; renewal_type?: string; current_expiry?: string } 
} | { valid: false; error: string } {
  
  if (!metadata) {
    return { valid: false, error: 'Missing metadata' };
  }
  
  const { user_id, user_email, user_name, renewal_type, current_expiry } = metadata;
  
  if (!user_id) {
    return { valid: false, error: 'Missing user_id in metadata' };
  }
  
  if (!user_email) {
    return { valid: false, error: 'Missing user_email in metadata' };
  }
  
  // If renewal, renewal_type MUST be present
  if (purpose === 'membership_renewal' && !renewal_type) {
    return { valid: false, error: 'Renewal payment missing renewal_type in metadata' };
  }
  
  return {
    valid: true,
    data: { 
      user_id, 
      user_email, 
      ...(user_name !== undefined && { user_name }),
      ...(renewal_type !== undefined && { renewal_type }),
      ...(current_expiry !== undefined && { current_expiry }),
    }
  };
}
