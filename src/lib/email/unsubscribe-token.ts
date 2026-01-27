/**
 * Unsubscribe Token Generation and Verification
 * 
 * Generates secure tokens for unsubscribe links in marketing emails.
 */

import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate a secure unsubscribe token for a user
 * Stores the token in email_preferences table
 */
export async function generateUnsubscribeToken(userId: string): Promise<string> {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store or update token in email_preferences
  await db.email_preferences.upsert({
    where: { user_id: userId },
    create: {
      id: crypto.randomBytes(16).toString('hex'),
      user_id: userId,
      unsubscribe_token: token,
      marketing_opt_in: true, // Default ON as per your selection
    },
    update: {
      unsubscribe_token: token,
      updated_at: new Date(),
    },
  });
  
  return token;
}

/**
 * Verify and process an unsubscribe token
 * Returns user email if successful, null if invalid
 */
export async function processUnsubscribeToken(token: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    // Find email preference by token
    const pref = await db.email_preferences.findUnique({
      where: { unsubscribe_token: token },
      include: {
        user: {
          select: {
            email: true,
            display_name: true,
          },
        },
      },
    });
    
    if (!pref) {
      return { success: false, error: 'Invalid or expired unsubscribe link' };
    }
    
    // Already unsubscribed?
    if (pref.unsubscribed_at) {
      return {
        success: true,
        email: pref.user.email,
      };
    }
    
    // Mark as unsubscribed
    await db.email_preferences.update({
      where: { id: pref.id },
      data: {
        marketing_opt_in: false,
        unsubscribed_at: new Date(),
        updated_at: new Date(),
      },
    });
    
    console.log(`✅ User unsubscribed: ${pref.user.email}`);
    
    return {
      success: true,
      email: pref.user.email,
    };
  } catch (error) {
    console.error('Error processing unsubscribe token:', error);
    return {
      success: false,
      error: 'Failed to process unsubscribe request',
    };
  }
}

/**
 * Re-subscribe a user (opt back in to marketing emails)
 */
export async function resubscribeUser(userId: string): Promise<boolean> {
  try {
    await db.email_preferences.upsert({
      where: { user_id: userId },
      create: {
        id: crypto.randomBytes(16).toString('hex'),
        user_id: userId,
        marketing_opt_in: true,
      },
      update: {
        marketing_opt_in: true,
        unsubscribed_at: null,
        updated_at: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error re-subscribing user:', error);
    return false;
  }
}
