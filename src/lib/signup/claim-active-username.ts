import { db } from '@/lib/db';
import { isSystemUsername, validateUsername } from '@/lib/utils/username';

export type ActiveClaimResult =
  | { ok: true }
  | { ok: false; status: number; error: string; available?: boolean };

/** All signup/repair claims serialize the case-insensitive name and recheck account state. */
export async function claimUsername(userId: string, proposed: string, mode: 'ACTIVE' | 'PENDING'): Promise<ActiveClaimResult> {
  const validation = validateUsername(proposed);
  if (!validation.ok) return { ok: false, status: 400, error: validation.message };
  const username = validation.username;
  try {
    return await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`username:${username.toLowerCase()}`}))`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.users.findUnique({ where: { id: userId } });
      if (!user) return { ok: false, status: 404, error: 'User not found' };
      if (user.status !== mode || (mode === 'ACTIVE' && !isSystemUsername(user.username))) {
        return { ok: false, status: 409, error: 'Username is already set or this signup is no longer pending' };
      }
      if (mode === 'PENDING' && user.reservation_expires_at && user.reservation_expires_at <= new Date()) {
        return { ok: false, status: 410, error: 'Username reservation has expired. Please sign up again.' };
      }
      const found = await tx.users.findFirst({ where: {
        username: { equals: username, mode: 'insensitive' }, NOT: { id: userId },
      } });
      if (found) {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${found.id} FOR UPDATE`;
        const taken = await tx.users.findUnique({ where: { id: found.id } });
        // Recheck after locking: completed or extended reservations must never be expired.
        if (taken && taken.username.toLowerCase() === username.toLowerCase()) {
          const expired = taken.status === 'EXPIRED' || (taken.status === 'PENDING'
            && taken.reservation_expires_at && taken.reservation_expires_at <= new Date());
          if (!expired) return { ok: false, status: 409, error: 'Username is already taken', available: false };
          await tx.users.update({ where: { id: taken.id }, data: {
            status: 'EXPIRED', username: `expired_${taken.id}_${Date.now()}`, updated_at: new Date(),
          } });
        }
      }
      await tx.users.update({ where: { id: userId }, data: { username, updated_at: new Date() } });
      return { ok: true };
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return {
      ok: false, status: 409, error: 'Username was just claimed. Please select another.', available: false,
    };
    throw error;
  }
}

export function claimActiveUsername(userId: string, username: string): Promise<ActiveClaimResult> {
  return claimUsername(userId, username, 'ACTIVE');
}
