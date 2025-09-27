import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // Return the list of tables in our Prisma schema
    const tables = [
      'User',
      'UserProfile', 
      'Studio',
      'StudioImage',
      'StudioEquipment',
      'StudioService',
      'StudioAvailability',
      'StudioReview',
      'Messages',
      'Reviews',
      'Faq',
      'Contact',
      'Poi'
    ];

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch tables' }), { status: 500 });
  }
}
