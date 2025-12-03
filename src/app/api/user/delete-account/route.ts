import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { confirmPassword, reason } = body;
    
    // For additional security, require password confirmation
    if (!confirmPassword) {
      return NextResponse.json(
        { error: 'Password confirmation required' },
        { status: 400 }
      );
    }
    
    // Verify the user exists and password is correct (if they have one)
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // If user has a password, verify it
    if (user.password) {
      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(confirmPassword, user.password);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    }
    
    // Log the deletion request
    logger.log(`Account deletion requested for user ${user.email}`, {
      user_id: user.id,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
    });
    
    // Use a transaction to ensure all related data is deleted
    await db.$transaction(async (tx) => {
      // Delete in order of dependencies
      
      // 1. Delete studio-related data
      await tx.studio_services.deleteMany({
        where: { studios: { owner_id: user.id } },
      });
      
      await tx.studio_images.deleteMany({
        where: { studios: { owner_id: user.id } },
      });
      
      await tx.reviews.deleteMany({
        where: { OR: [
          { reviewer_id: user.id },
          { owner_id: user.id },
        ]},
      });
      
      await tx.studios.deleteMany({
        where: { owner_id: user.id },
      });
      
      // 2. Delete messages
      await tx.messages.deleteMany({
        where: { OR: [
          { sender_id: user.id },
          { receiver_id: user.id },
        ]},
      });
      
      // 3. Delete connections
      await tx.user_connections.deleteMany({
        where: { OR: [
          { user_id: user.id },
          { connected_user_id: user.id },
        ]},
      });
      
      // 4. Delete subscriptions
      await tx.subscriptions.deleteMany({
        where: { user_id: user.id },
      });
      
      // 5. Delete auth-related data
      await tx.sessions.deleteMany({
        where: { user_id: user.id },
      });
      
      await tx.accounts.deleteMany({
        where: { user_id: user.id },
      });
      
      // 6. Finally, delete the user
      await tx.users.delete({
        where: { id: user.id },
      });
    });
    
    // TODO: Send account deletion confirmation email
    // await emailService.sendAccountDeletionConfirmation({
    //   email: user.email,
    //   display_name: session.user.display_name,
    // });
    
    return NextResponse.json(
      {
        message: 'Account successfully deleted',
        deletedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


