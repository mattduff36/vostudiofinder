import { isCanonicalUsername, isSystemUsername } from '@/lib/utils/username';

interface UsernameAccount {
  email: string;
  display_name: string;
  username: string | null;
  status?: string | null;
}

/**
 * Where to send an account that does not yet have a public username.
 * Active accounts finish in the signed-in dashboard repair.
 * Pending accounts resume username selection from the verified email.
 */
export function incompleteUsernameDestination(user: UsernameAccount): string | null {
  if (isCanonicalUsername(user.username)) {
    return null;
  }

  if (user.status === 'ACTIVE') {
    return '/auth/signin?callbackUrl=%2Fdashboard';
  }

  if (user.status === 'EXPIRED') {
    return '/auth/signup?error=reservation_expired';
  }

  const params = new URLSearchParams();
  params.set('email', user.email);
  if (user.display_name) {
    params.set('display_name', user.display_name);
  }
  return `/auth/username-selection?${params.toString()}`;
}

export function usernameSelectionPath(email: string, displayName?: string | null): string {
  const params = new URLSearchParams();
  params.set('email', email);
  if (displayName) {
    params.set('display_name', displayName);
  }
  return `/auth/username-selection?${params.toString()}`;
}

interface VerifiedAccount extends UsernameAccount {
  id: string;
}

/**
 * Post-verification destination. An incomplete username always wins over
 * membership or a caller-supplied redirect so verification cannot skip it.
 */
export function postVerificationPath(
  user: VerifiedAccount,
  options?: { redirect?: string | null; alreadyVerified?: boolean; verified?: boolean }
): string {
  const incomplete = incompleteUsernameDestination(user);
  if (incomplete) {
    return incomplete;
  }

  if (options?.redirect) {
    return options.redirect;
  }

  const params = new URLSearchParams();
  params.set('userId', user.id);
  params.set('email', user.email);
  params.set('name', user.display_name);
  if (user.username) {
    params.set('username', user.username);
  }
  if (options?.alreadyVerified) {
    params.set('already_verified', 'true');
  }
  if (options?.verified) {
    params.set('verified', 'true');
  }
  return `/auth/membership?${params.toString()}`;
}

export function membershipPath(user: {
  id: string;
  email: string;
  display_name: string;
  username: string;
}): string {
  const params = new URLSearchParams();
  params.set('userId', user.id);
  params.set('email', user.email);
  params.set('name', user.display_name);
  params.set('username', user.username);
  return `/auth/membership?${params.toString()}`;
}

/** Pending reserve may include the signup email. A mismatch is not the owner. */
export function pendingSignupEmailMatches(accountEmail: string, suppliedEmail: unknown): boolean {
  if (suppliedEmail == null || suppliedEmail === '') {
    return true;
  }
  if (typeof suppliedEmail !== 'string') {
    return false;
  }
  return accountEmail.toLowerCase() === suppliedEmail.trim().toLowerCase();
}

export function shouldSendVerificationAfterUsername(
  previousUsername: string | null | undefined,
  emailVerified: boolean
): boolean {
  return !emailVerified && isSystemUsername(previousUsername);
}
