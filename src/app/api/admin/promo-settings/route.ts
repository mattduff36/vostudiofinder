import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

const PROMO_SETTING_KEY = 'promo_free_signup_active';

/**
 * GET: Retrieve the current promo setting
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the promo setting from admin_sticky_notes
    const setting = await db.admin_sticky_notes.findUnique({
      where: { key: PROMO_SETTING_KEY },
    });

    // If no database setting exists, fall back to env variable
    const envValue = process.env.NEXT_PUBLIC_PROMO_FREE_SIGNUP === 'true';
    const isActive = setting ? setting.content === 'true' : envValue;

    return NextResponse.json({
      isActive,
      source: setting ? 'database' : 'env',
      envValue,
    });
  } catch (error) {
    console.error('Error fetching promo settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo settings' },
      { status: 500 }
    );
  }
}

/**
 * POST: Toggle the promo setting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { isActive } = await request.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Upsert the promo setting
    const setting = await db.admin_sticky_notes.upsert({
      where: { key: PROMO_SETTING_KEY },
      update: {
        content: isActive.toString(),
        updated_at: new Date(),
      },
      create: {
        id: randomBytes(12).toString('base64url'),
        key: PROMO_SETTING_KEY,
        content: isActive.toString(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`[ADMIN] Promo setting updated: ${isActive} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      isActive: setting.content === 'true',
    });
  } catch (error) {
    console.error('Error updating promo settings:', error);
    return NextResponse.json(
      { error: 'Failed to update promo settings' },
      { status: 500 }
    );
  }
}
