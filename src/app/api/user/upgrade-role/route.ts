import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For testing purposes, allow users to upgrade to STUDIO_OWNER
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { role: Role.STUDIO_OWNER },
    });

    return NextResponse.json({
      success: true,
      message: 'Role upgraded to STUDIO_OWNER',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Role upgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade role' },
      { status: 500 }
    );
  }
}
