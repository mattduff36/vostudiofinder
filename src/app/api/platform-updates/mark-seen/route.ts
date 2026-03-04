import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Mark platform updates as seen by setting last_seen_updates_at to now
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.users.update({
      where: { id: session.user.id },
      data: { last_seen_updates_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking platform updates as seen:', error);
    return NextResponse.json(
      { error: 'Failed to mark updates as seen' },
      { status: 500 }
    );
  }
}
