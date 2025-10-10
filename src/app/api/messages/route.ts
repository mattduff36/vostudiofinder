import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const sendMessageSchema = z.object({
  receiver_id: z.string().cuid(),
  studio_id: z.string().cuid().optional(),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);
    
    // Verify receiver exists
    const receiver = await db.users.findUnique({
      where: { id: validatedData.receiver_id },
      select: { id: true, display_name: true, email: true },
    });
    
    if (!receiver) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }
    
    // Prevent users from messaging themselves
    if (validatedData.receiver_id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot send messages to yourself' },
        { status: 400 }
      );
    }
    
    // Verify studio exists if provided
    if (validatedData.studio_id) {
      const studio = await db.studios.findUnique({
        where: { id: validatedData.studio_id },
        select: { id: true, name: true },
      });
      
      if (!studio) {
        return NextResponse.json(
          { error: 'Studio not found' },
          { status: 404 }
        );
      }
    }
    
    // Create the message
    const message = await db.messages.create({
      data: {
        sender_id: session.user.id,
        receiver_id: validatedData.receiver_id,
        subject: validatedData.subject,
        content: validatedData.message,
      },
      include: {
        sender: {
          select: {
            display_name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            display_name: true,
            email: true,
          },
        },
      },
    });
    
    // TODO: Send email notification to receiver
    // await emailService.sendMessageNotification({
    //   recipientEmail: receiver.email,
    //   recipientName: receiver.display_name,
    //   senderName: session.user.display_name,
    //   subject: validatedData.subject,
    //   messagePreview: validatedData.message.substring(0, 100),
    // });
    
    return NextResponse.json(
      {
        message: 'Message sent successfully',
        messageId: message.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Message sending error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid message data', details: error.issues },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'sent' or 'received'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const skip = (page - 1) * limit;
    
    const where = type === 'sent' 
      ? { sender_id: session.user.id }
      : { receiver_id: session.user.id };
    
    const [messages, totalCount] = await Promise.all([
      db.messages.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
            },
          },
          receiver: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.messages.count({ where }),
    ]);
    
    // Mark received messages as read
    if (type === 'received') {
      await db.messages.updateMany({
        where: {
          receiver_id: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });
    }
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}



