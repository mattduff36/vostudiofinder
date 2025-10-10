import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get('table');

  if (!tableName) {
    return new NextResponse(JSON.stringify({ error: 'Table name is required' }), { status: 400 });
  }

  try {
    // Mock schema data based on our Prisma models
    const schemas: Record<string, any> = {
      'User': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'username', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'displayName', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'email', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'password', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'avatarUrl', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'role', type: 'Role', nullable: false, default: 'USER', primary_key: false },
          { name: 'status', type: 'Int', nullable: false, default: '1', primary_key: false },
          { name: 'emailVerified', type: 'Boolean', nullable: false, default: 'false', primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'UserProfile': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'userId', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'studioName', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'lastName', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'location', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'about', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'shortAbout', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'phone', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'instagramUrl', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'youtubeUrl', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'rateTier1', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'rateTier2', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'rateTier3', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'isFeatured', type: 'Boolean', nullable: false, default: 'false', primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Studio': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'owner_id', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'name', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'description', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'studioType', type: 'StudioType', nullable: false, default: null, primary_key: false },
          { name: 'address', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'latitude', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'longitude', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'website_url', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'phone', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'status', type: 'StudioStatus', nullable: false, default: 'ACTIVE', primary_key: false },
          { name: 'is_verified', type: 'Boolean', nullable: false, default: 'false', primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Faq': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'question', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'answer', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'sortOrder', type: 'Int', nullable: true, default: null, primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Contact': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'user1', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'user2', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'accepted', type: 'Int', nullable: false, default: '0', primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Poi': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'name', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'description', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'latitude', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'longitude', type: 'Decimal', nullable: true, default: null, primary_key: false },
          { name: 'address', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'category', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Messages': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'senderId', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'receiverId', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'subject', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'content', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'isRead', type: 'Boolean', nullable: false, default: 'false', primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      },
      'Reviews': {
        columns: [
          { name: 'id', type: 'String', nullable: false, default: 'cuid()', primary_key: true },
          { name: 'studioId', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'reviewerId', type: 'String', nullable: false, default: null, primary_key: false },
          { name: 'rating', type: 'Int', nullable: false, default: null, primary_key: false },
          { name: 'comment', type: 'String', nullable: true, default: null, primary_key: false },
          { name: 'created_at', type: 'DateTime', nullable: false, default: 'now()', primary_key: false },
          { name: 'updated_at', type: 'DateTime', nullable: false, default: 'updated_at', primary_key: false }
        ]
      }
    };

    const schema = schemas[tableName];
    if (!schema) {
      return new NextResponse(JSON.stringify({ error: 'Table not found' }), { status: 404 });
    }

    return NextResponse.json(schema);
  } catch (error) {
    console.error('Schema API error:', error);
    return new NextResponse(JSON.stringify({ 
      success: false, 
      error: 'Failed to retrieve table schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}
