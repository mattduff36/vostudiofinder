import { NextRequest, NextResponse } from 'next/server';
import { isResetTokenValid } from '@/lib/auth-utils';
import { db } from '@/lib/db';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }

  const visible = Math.min(2, Math.floor(local.length / 3));
  const masked = local.slice(0, visible) + '*'.repeat(Math.min(local.length - visible, 6));
  return `${masked}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Missing token' },
        { status: 400 }
      );
    }

    const user = await db.users.findFirst({
      where: { reset_token: token },
      select: {
        id: true,
        email: true,
        display_name: true,
        reset_token_expiry: true,
        studio_profiles: {
          select: { name: true },
        },
      },
    });

    if (!user || !isResetTokenValid(user.reset_token_expiry)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      studioName: user.studio_profiles?.name ?? null,
      maskedEmail: maskEmail(user.email),
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
