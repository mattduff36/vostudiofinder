import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import type { AdminStudioUpdateInput, EmailVerificationData } from './types';

/**
 * Checks if email is changing and prepares verification data
 */
export async function prepareEmailChange(
  body: AdminStudioUpdateInput,
  existingEmail: string | undefined,
  existingUserId: string,
  displayName: string,
  baseUrl: string
): Promise<{
  userUpdates: Record<string, unknown>;
  verificationData: EmailVerificationData | null;
}> {
  const normalizedNewEmail =
    body.email !== undefined && body.email !== null 
      ? String(body.email).toLowerCase().trim() 
      : undefined;
  const normalizedCurrentEmail = existingEmail ? existingEmail.toLowerCase().trim() : undefined;

  const isEmailChanging =
    normalizedNewEmail !== undefined &&
    normalizedNewEmail.length > 0 &&
    normalizedNewEmail !== normalizedCurrentEmail;

  if (!isEmailChanging) {
    return { userUpdates: {}, verificationData: null };
  }

  // Check if email is already taken
  const existingEmailUser = await prisma.users.findUnique({
    where: { email: normalizedNewEmail }
  });
  
  if (existingEmailUser && existingEmailUser.id !== existingUserId) {
    throw new Error('EMAIL_IN_USE');
  }
  
  const verificationToken = randomBytes(32).toString('hex');
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const postVerifyRedirect = `/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}`;
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&redirect=${encodeURIComponent(postVerifyRedirect)}`;

  return {
    userUpdates: {
      email: normalizedNewEmail,
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expiry: verificationTokenExpiry,
    },
    verificationData: {
      email: normalizedNewEmail,
      displayName: displayName || 'User',
      verificationUrl,
    },
  };
}
