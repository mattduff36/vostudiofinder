/**
 * Transactional database operations for admin studio updates
 * Handles subscription, studio types, and metadata updates within transactions
 */

import { randomBytes } from 'crypto';

// tx parameter is a Prisma transaction client passed from the caller

type MembershipUpdateParams = {
  userId: string;
  studioId: string;
  newExpiryValue: string | null | undefined;
  currentSubscription: any;
  skipStatusUpdate: boolean; // true if status is being explicitly set in request
}

/**
 * Handles membership expiry updates (subscription CRUD + status sync)
 */
export async function handleMembershipExpiryUpdate(
  tx: any,
  params: MembershipUpdateParams
): Promise<void> {
  const { userId, studioId, newExpiryValue, currentSubscription, skipStatusUpdate } = params;
  
  const currentExpiryDate = currentSubscription?.current_period_end?.toISOString() || null;
  
  // Only process if value has actually changed
  const membershipExpiryChanged = newExpiryValue !== undefined && (newExpiryValue !== currentExpiryDate);
  
  if (!membershipExpiryChanged) {
    return;
  }
  
  const now = new Date();
  
  if (newExpiryValue) {
    const expiryDate = new Date(newExpiryValue);
    
    if (currentSubscription) {
      // Update existing subscription
      await tx.subscriptions.update({
        where: { id: currentSubscription.id },
        data: {
          current_period_end: expiryDate,
          status: 'ACTIVE',
          updated_at: now
        }
      });
    } else {
      // Create new subscription
      await tx.subscriptions.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: userId,
          status: 'ACTIVE',
          payment_method: 'STRIPE',
          current_period_start: now,
          current_period_end: expiryDate,
          created_at: now,
          updated_at: now
        }
      });
    }

    // Update studio status based on expiry date (only if not explicitly set)
    if (!skipStatusUpdate) {
      const isExpired = expiryDate < now;
      const newStatus = isExpired ? 'INACTIVE' : 'ACTIVE';
      
      await tx.studio_profiles.update({
        where: { id: studioId },
        data: { 
          status: newStatus,
          updated_at: now
        }
      });
    }
  } else {
    // Being explicitly cleared - delete subscription and set to INACTIVE
    await tx.subscriptions.deleteMany({
      where: { user_id: userId }
    });
    
    // Only change status if not explicitly set in request
    if (!skipStatusUpdate) {
      await tx.studio_profiles.update({
        where: { id: studioId },
        data: { 
          status: 'INACTIVE',
          updated_at: now
        }
      });
    }
  }
}

/**
 * Handles studio types update (delete + recreate)
 */
export async function handleStudioTypesUpdate(
  tx: any,
  studioId: string,
  studioTypes: Array<{ studio_type?: string; studioType?: string }> | undefined
): Promise<void> {
  if (studioTypes === undefined) {
    return;
  }
  
  // Delete existing studio types
  await tx.studio_studio_types.deleteMany({
    where: { studio_id: studioId }
  });

  // Create new studio types
  if (Array.isArray(studioTypes) && studioTypes.length > 0) {
    for (const st of studioTypes) {
      const id = randomBytes(12).toString('base64url');
      await tx.studio_studio_types.create({
        data: {
          id,
          studio_id: studioId,
          studio_type: st.studio_type || st.studioType // Accept both formats
        }
      });
    }
  }
}

/**
 * Handles custom meta title metadata (upsert or delete)
 */
export async function handleCustomMetaTitleUpdate(
  tx: any,
  userId: string,
  customMetaTitle: string | undefined
): Promise<void> {
  if (customMetaTitle === undefined) {
    return;
  }
  
  const trimmedTitle = customMetaTitle.trim();
  
  if (trimmedTitle) {
    // Upsert the custom_meta_title metadata
    await tx.user_metadata.upsert({
      where: {
        user_id_key: {
          user_id: userId,
          key: 'custom_meta_title',
        },
      },
      update: {
        value: trimmedTitle.substring(0, 60), // Enforce 60 char limit
        updated_at: new Date(),
      },
      create: {
        id: randomBytes(12).toString('base64url'),
        user_id: userId,
        key: 'custom_meta_title',
        value: trimmedTitle.substring(0, 60),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } else {
    // If empty string, delete the metadata entry
    await tx.user_metadata.deleteMany({
      where: {
        user_id: userId,
        key: 'custom_meta_title',
      },
    });
  }
}
