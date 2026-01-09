import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking verification status for:', email);

    // Find user
    const user = await db.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        email_verified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { verified: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      console.log('✅ User verified:', email);
      return NextResponse.json({
        verified: true,
        userId: user.id,
        username: user.username && !user.username.startsWith('temp_') ? user.username : null,
        displayName: user.display_name,
      });
    }

    console.log('⏳ User not yet verified:', email);
    return NextResponse.json({
      verified: false,
      message: 'Email not yet verified',
    });
  } catch (error) {
    console.error('❌ Check verification status error:', error);
    handleApiError(error, 'Check verification status failed');
    
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}
