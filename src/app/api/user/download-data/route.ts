import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all user data
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: {
        studio_profiles: {
          include: {
            studio_images: true,
            studio_services: true,
            studio_studio_types: true,
          },
        },
        reviews_reviews_reviewer_idTousers: true,
        reviews_reviews_owner_idTousers: true,
        messages_messages_sender_idTousers: true,
        messages_messages_receiver_idTousers: true,
        saved_searches: true,
        notifications: true,
        subscriptions: true,
        user_metadata: true,
        support_tickets: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { password, reset_token, reset_token_expiry, verification_token, verification_token_expiry, ...safeUserData } = user;

    // Create JSON data files
    const userData = {
      user: safeUserData,
      export_date: new Date().toISOString(),
      format_version: '1.0',
    };

    // Split into separate files for organization
    const accountData = {
      id: safeUserData.id,
      email: safeUserData.email,
      username: safeUserData.username,
      display_name: safeUserData.display_name,
      avatar_url: safeUserData.avatar_url,
      role: safeUserData.role,
      email_verified: safeUserData.email_verified,
      created_at: safeUserData.created_at,
      updated_at: safeUserData.updated_at,
    };

    const profileData = safeUserData.studio_profiles;
    const reviewsGiven = safeUserData.reviews_reviews_reviewer_idTousers;
    const reviewsReceived = safeUserData.reviews_reviews_owner_idTousers;
    const messages = {
      sent: safeUserData.messages_messages_sender_idTousers,
      received: safeUserData.messages_messages_receiver_idTousers,
    };
    const savedSearches = safeUserData.saved_searches;
    const notifications = safeUserData.notifications;
    const subscriptions = safeUserData.subscriptions;
    const metadata = safeUserData.user_metadata;
    const supportTickets = safeUserData.support_tickets;

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Create a readable stream from the archive
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);

      // Add files to archive
      archive.append(JSON.stringify(userData, null, 2), { name: 'complete_data.json' });
      archive.append(JSON.stringify(accountData, null, 2), { name: 'account.json' });
      
      if (profileData) {
        archive.append(JSON.stringify(profileData, null, 2), { name: 'studio_profile.json' });
      }
      
      if (reviewsGiven.length > 0) {
        archive.append(JSON.stringify(reviewsGiven, null, 2), { name: 'reviews_given.json' });
      }
      
      if (reviewsReceived.length > 0) {
        archive.append(JSON.stringify(reviewsReceived, null, 2), { name: 'reviews_received.json' });
      }
      
      if (messages.sent.length > 0 || messages.received.length > 0) {
        archive.append(JSON.stringify(messages, null, 2), { name: 'messages.json' });
      }
      
      if (savedSearches.length > 0) {
        archive.append(JSON.stringify(savedSearches, null, 2), { name: 'saved_searches.json' });
      }
      
      if (notifications.length > 0) {
        archive.append(JSON.stringify(notifications, null, 2), { name: 'notifications.json' });
      }
      
      if (subscriptions.length > 0) {
        archive.append(JSON.stringify(subscriptions, null, 2), { name: 'subscriptions.json' });
      }
      
      if (metadata.length > 0) {
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
      }
      
      if (supportTickets.length > 0) {
        archive.append(JSON.stringify(supportTickets, null, 2), { name: 'support_tickets.json' });
      }

      // Add README
      const readme = `# Your VoiceoverStudioFinder Data Export
      
Export Date: ${new Date().toISOString()}
Account: ${safeUserData.username} (${safeUserData.email})

## Contents

This archive contains all the data we hold about your account:

- account.json: Your basic account information
- studio_profile.json: Your studio profile data (if applicable)
- reviews_given.json: Reviews you've written
- reviews_received.json: Reviews you've received
- messages.json: Your message history
- saved_searches.json: Your saved searches
- notifications.json: Your notification history
- subscriptions.json: Your subscription information
- metadata.json: Additional account metadata
- support_tickets.json: Your support ticket history
- complete_data.json: All data in one file

All data is in JSON format and can be opened with any text editor.

This export was generated in compliance with GDPR data portability requirements.

For questions, contact: support@voiceoverstudiofinder.com
`;

      archive.append(readme, { name: 'README.txt' });

      // Finalize the archive
      archive.finalize();
    });

    const buffer = Buffer.concat(chunks);

    logger.log(`✅ Data export generated for user: ${session.user.id}`);

    // Return the ZIP file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="voiceoverstudiofinder-data-export-${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Error generating data export:', error);
    return NextResponse.json(
      { error: 'Failed to generate data export' },
      { status: 500 }
    );
  }
}

