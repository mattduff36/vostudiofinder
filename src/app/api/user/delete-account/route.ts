import { NextRequest, NextResponse } from 'next/server';
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
    console.log(`Account deletion requested for user ${user.email}`, {
      userId: user.id,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
    });
    
    // Use a transaction to ensure all related data is deleted
    await db.$transaction(async (tx) => {
      // Delete in order of dependencies
      
      // 1. Delete studio-related data
      await tx.studioService.deleteMany({
        where: { studio: { owner_id: user.id } },
      });
      
      await tx.studioImage.deleteMany({
        where: { studio: { owner_id: user.id } },
      });
      
      await tx.review.deleteMany({
        where: { OR: [
          { reviewerId: user.id },
          { owner_id: user.id },
        ]},
      });
      
      await tx.studio.deleteMany({
        where: { owner_id: user.id },
      });
      
      // 2. Delete messages
      await tx.message.deleteMany({
        where: { OR: [
          { senderId: user.id },
          { receiverId: user.id },
        ]},
      });
      
      // 3. Delete connections
      await tx.userConnection.deleteMany({
        where: { OR: [
          { userId: user.id },
          { connectedUserId: user.id },
        ]},
      });
      
      // 4. Delete subscriptions
      await tx.subscription.deleteMany({
        where: { userId: user.id },
      });
      
      // 5. Delete auth-related data
      await tx.session.deleteMany({
        where: { userId: user.id },
      });
      
      await tx.account.deleteMany({
        where: { userId: user.id },
      });
      
      // 6. Finally, delete the user
      await tx.user.delete({
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

