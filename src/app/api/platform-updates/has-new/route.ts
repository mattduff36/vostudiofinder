import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Check if there are new updates since user's last login (auth required)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { last_login: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has never logged in, show badge if any updates exist
    const lastLogin = user.last_login;

    const latestUpdate = await db.platform_updates.findFirst({
      orderBy: { release_date: 'desc' },
      select: { release_date: true },
    });

    if (!latestUpdate) {
      return NextResponse.json({ hasNew: false });
    }

    // hasNew = true if any update is newer than last_login
    const hasNew = lastLogin
      ? latestUpdate.release_date > lastLogin
      : true;

    return NextResponse.json({ hasNew });
  } catch (error) {
    console.error('Error checking for new platform updates:', error);
    return NextResponse.json(
      { error: 'Failed to check for new updates' },
      { status: 500 }
    );
  }
}
