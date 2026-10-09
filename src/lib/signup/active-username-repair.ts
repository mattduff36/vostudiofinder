import { isCanonicalUsername, isSystemUsername, validateUsername } from '@/lib/utils/username';

export interface ActiveRepairAccount {
  id: string;
  status: string;
  username: string | null;
}

export type ActiveRepairDecision =
  | { ok: true; username: string }
  | { ok: false; status: number; error: string };

/**
 * Authenticated one-time repair. The session id is the owner.
 * A requested user id that differs from the session is rejected.
 * An account that already has a public username cannot be renamed.
 */
export function evaluateActiveUsernameRepair(input: {
  sessionUserId: string | null | undefined;
  requestedUserId?: string | null;
  account: ActiveRepairAccount | null;
  proposedUsername: unknown;
}): ActiveRepairDecision {
  if (!input.sessionUserId) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  if (input.requestedUserId && input.requestedUserId !== input.sessionUserId) {
    return {
      ok: false,
      status: 403,
      error: 'You can only set a username for your own account',
    };
  }

  if (!input.account || input.account.id !== input.sessionUserId) {
    return { ok: false, status: 404, error: 'User not found' };
  }

  if (input.account.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 400,
      error: 'Username repair is only available for active accounts',
    };
  }

  if (isCanonicalUsername(input.account.username)) {
    return {
      ok: false,
      status: 409,
      error: 'Username is already set and cannot be changed',
    };
  }

  if (!isSystemUsername(input.account.username)) {
    return { ok: false, status: 409, error: 'Username cannot be changed' };
  }

  const validation = validateUsername(input.proposedUsername);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.message };
  }

  return { ok: true, username: validation.username };
}
