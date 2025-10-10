import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Collect all user data from various tables
    const userData = await db.users.findUnique({
      where: { id: session.user.id },
      include: {
        studios: {
          include: {
            services: true,
            images: true,
            reviews: true,
            studioTypes: {
              select: {
                studioType: true,
              },
            },
          },
        },
        reviews: true,
        reviewsReceived: true,
        sentMessages: true,
        receivedMessages: true,
        connections: true,
        connectedBy: true,
        subscriptions: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            type: true,
          },
        },
        sessions: {
          select: {
            expires: true,
          },
        },
      },
    });
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }
    
    // Format data for export
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
        emailVerified: userData.emailVerified,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      },
      studios: userData.studios.map(studio => ({
        id: studio.id,
        name: studio.name,
        description: studio.description,
        studioTypes: studio.studioTypes?.map(st => st.studioType) || [],
        address: studio.address,
        latitude: studio.latitude,
        longitude: studio.longitude,
        website_url: studio.website_url,
        phone: studio.phone,
        is_premium: studio.is_premium,
        is_verified: studio.is_verified,
        status: studio.status,
        created_at: studio.created_at,
        updated_at: studio.updated_at,
        services: studio.services,
        images: studio.images,
        reviews: studio.reviews.length,
      })),
      reviewsWritten: userData.reviews.map(review => ({
        id: review.id,
        studioId: review.studioId,
        rating: review.rating,
        content: review.content,
        isAnonymous: review.isAnonymous,
        status: review.status,
        created_at: review.created_at,
      })),
      reviewsReceived: userData.reviewsReceived.map(review => ({
        id: review.id,
        studioId: review.studioId,
        rating: review.rating,
        content: review.content,
        isAnonymous: review.isAnonymous,
        status: review.status,
        created_at: review.created_at,
      })),
      messagesSent: userData.sentMessages.map(message => ({
        id: message.id,
        receiverId: message.receiverId,
        subject: message.subject,
        content: message.content,
        isRead: message.isRead,
        created_at: message.created_at,
      })),
      messagesReceived: userData.receivedMessages.map(message => ({
        id: message.id,
        senderId: message.senderId,
        subject: message.subject,
        content: message.content,
        isRead: message.isRead,
        created_at: message.created_at,
      })),
      connections: userData.connections.map(conn => ({
        id: conn.id,
        connectedUserId: conn.connectedUserId,
        accepted: conn.accepted,
        created_at: conn.created_at,
      })),
      subscriptions: userData.subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        created_at: sub.created_at,
      })),
      oauthAccounts: userData.accounts.map(account => ({
        provider: account.provider,
        type: account.type,
      })),
      activeSessions: userData.sessions.length,
    };
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="voiceoverstudiofinder-data-export-${new Date().toISOString().split('T')[0]}.json"`);
    
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Data export error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

