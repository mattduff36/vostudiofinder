import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { getBaseUrl } from '@/lib/seo/site';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Profile creation request received:', {
      hasSessionId: !!body.sessionId,
      hasUsername: !!body.username,
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      studioTypes: body.studio_types,
      imageCount: body.images?.length,
      connections: body.connections
    });

    const {
      sessionId,
      username,
      display_name,
      email,
      password,
      studio_name,
      short_about,
      about,
      studio_types,
      full_address,
      abbreviated_address,
      city,
      location,
      website_url,
      connections,
      images,
    } = body;

    // Validation with detailed logging
    if (!sessionId || !username || !display_name || !email || !password) {
      console.log('❌ Missing account fields:', { sessionId: !!sessionId, username: !!username, display_name: !!display_name, email: !!email, password: !!password });
      return NextResponse.json(
        { 
          error: 'Missing required account information. Please ensure all fields are filled out.',
          errorCode: 'MISSING_ACCOUNT_FIELDS',
          canRetry: true,
        },
        { status: 400 }
      );
    }

    if (!studio_name || !short_about || !about || !location || !website_url) {
      console.log('❌ Missing studio fields:', { studio_name: !!studio_name, short_about: !!short_about, about: !!about, location: !!location, website_url: !!website_url });
      return NextResponse.json(
        { 
          error: 'Missing required studio information. Please complete all studio fields.',
          errorCode: 'MISSING_STUDIO_FIELDS',
          canRetry: true,
        },
        { status: 400 }
      );
    }

    if (!studio_types || studio_types.length === 0) {
      console.log('❌ No studio types:', studio_types);
      return NextResponse.json(
        { 
          error: 'At least one studio type is required. Please select your studio type.',
          errorCode: 'MISSING_STUDIO_TYPE',
          canRetry: true,
        },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      console.log('❌ No images:', images);
      return NextResponse.json(
        { 
          error: 'At least one image is required. Please upload at least one photo of your studio.',
          errorCode: 'MISSING_IMAGES',
          canRetry: true,
        },
        { status: 400 }
      );
    }

    const hasConnection = connections && typeof connections === 'object' && Object.values(connections).some(v => v);
    if (!hasConnection) {
      console.log('❌ No connections selected:', connections);
      return NextResponse.json(
        { 
          error: 'At least one connection method is required. Please select how you want to be contacted.',
          errorCode: 'MISSING_CONNECTION',
          canRetry: true,
        },
        { status: 400 }
      );
    }

    // Verify payment session (skip in dev mode)
    const isDevMode = process.env.NODE_ENV === 'development' || sessionId.startsWith('cs_dev_');
    
    if (!isDevMode) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { 
            error: 'Payment system configuration error. Please contact support.',
            errorCode: 'STRIPE_CONFIG_ERROR',
            canRetry: false,
          },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { 
            error: 'Payment not verified. Please ensure your payment was successful or contact support.',
            errorCode: 'PAYMENT_NOT_VERIFIED',
            canRetry: false,
          },
          { status: 400 }
        );
      }
    } else {
      console.log('🔧 DEV MODE: Skipping Stripe payment verification for profile creation');
    }

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'An account with this email already exists. Please sign in instead.',
          errorCode: 'EMAIL_EXISTS',
          canRetry: false,
        },
        { status: 409 }
      );
    }

    // Check if username is already taken (case-insensitive)
    const existingUsername = await db.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });
    
    if (existingUsername) {
      return NextResponse.json(
        { 
          error: 'This username is already taken. Please contact support if you believe this is an error.',
          errorCode: 'USERNAME_TAKEN',
          canRetry: false,
        },
        { status: 409 }
      );
    }

    let user: any;
    let verificationToken: string;
    let studioProfileId: string;

    try {
      // Create user, profile, and all related data in a transaction
      // This ensures atomic operation - either everything succeeds or nothing persists
      const result = await db.$transaction(async (tx) => {
        // Create user with membership info (passing tx for atomicity)
        const user = await createUser({
          email,
          password, // Password from signup form
          display_name,
          username,
        }, tx);

        console.log('✅ User created:', user.id);

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with verification token (all users are USER role by default)
        await tx.users.update({
          where: { id: user.id },
          data: {
            role: 'USER',
            verification_token: token,
            verification_token_expiry: verificationTokenExpiry,
          },
        });

        console.log('✅ Verification token generated and saved');

        // Create studio profile
        const profileId = nanoid();
        
        // Process connections - convert boolean object to connection strings
        const connectionData: any = {};
        Object.entries(connections).forEach(([key, value]) => {
          if (value) {
            connectionData[key] = '1';
          }
        });

        await tx.studio_profiles.create({
          data: {
            id: profileId,
            user_id: user.id,
            name: studio_name,
            short_about,
            about,
            full_address: full_address || null,
            abbreviated_address: abbreviated_address || null,
            city: city || '',
            location,
            website_url,
            is_profile_visible: false, // Hidden by default, will be set to true upon email verification
            created_at: new Date(),
            updated_at: new Date(),
            ...connectionData, // Spread connection methods
          },
        });

        console.log('✅ Studio profile created:', profileId);

        // Create studio types
        for (const studioType of studio_types) {
          await tx.studio_studio_types.create({
            data: {
              id: nanoid(),
              studio_id: profileId,
              studio_type: studioType as any,
            },
          });
        }

        console.log('✅ Studio types created:', studio_types.length);

        // Create studio images
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          await tx.studio_images.create({
            data: {
              id: nanoid(),
              studio_id: profileId,
              image_url: image.url,
              alt_text: image.alt_text || `Studio image ${i + 1}`,
              sort_order: i,
            },
          });
        }

        console.log('✅ Studio images created:', images.length);

        return { user, verificationToken: token, studioProfileId: profileId };
      });

      // Extract results from transaction
      user = result.user;
      verificationToken = result.verificationToken;
      studioProfileId = result.studioProfileId;

      console.log('✅ Transaction completed successfully');
    } catch (txError: any) {
      // If transaction failed, nothing was created or everything was rolled back
      console.error('❌ Transaction failed during profile creation:', txError);
      
      // Check if error is due to unique constraint violation (P2002)
      if (txError.code === 'P2002') {
        const target = txError.meta?.target;
        
        if (target?.includes('email')) {
          return NextResponse.json(
            { 
              error: 'An account with this email already exists. Please sign in instead.',
              errorCode: 'EMAIL_EXISTS',
              canRetry: false,
            },
            { status: 409 }
          );
        }
        
        if (target?.includes('username')) {
          return NextResponse.json(
            { 
              error: 'This username is already taken. Please contact support if you believe this is an error.',
              errorCode: 'USERNAME_TAKEN',
              canRetry: false,
            },
            { status: 409 }
          );
        }
      }
      
      // For any other transaction error, user can retry
      throw txError;
    }

    // 🔄 PROCESS DEFERRED PAYMENTS
    // Check for any webhook events that were deferred because user didn't exist yet
    console.log(`🔍 Checking for deferred payments for ${email}...`);
    const pendingWebhooks = await db.stripe_webhook_events.findMany({
      where: {
        processed: false,
        error: {
          contains: 'User account not yet created',
        },
      },
    });

    console.log(`📦 Found ${pendingWebhooks.length} pending webhook events to check`);

    for (const webhookEvent of pendingWebhooks) {
      try {
        const eventPayload = webhookEvent.payload as any;
        const eventType = webhookEvent.type;
        
        console.log(`🔎 Checking webhook event: ${eventType} (ID: ${webhookEvent.stripe_event_id})`);
        
        // Extract email from different event types
        let eventEmail: string | null = null;
        
        if (eventType === 'checkout.session.completed') {
          const sessionData = eventPayload.data?.object || eventPayload;
          eventEmail = sessionData.metadata?.user_email || sessionData.customer_email || null;
        } else if (eventType === 'payment_intent.succeeded' || eventType === 'payment_intent.payment_failed') {
          const paymentIntentData = eventPayload.data?.object || eventPayload;
          eventEmail = paymentIntentData.metadata?.user_email || null;
        }
        
        console.log(`📧 Event email: ${eventEmail}, Target email: ${email}`);
        
        // Check if this event is for this user
        if (eventEmail === email) {
          console.log(`💳 Processing deferred ${eventType} for ${email}`);
          
          if (eventType === 'checkout.session.completed') {
            const sessionData = eventPayload.data?.object || eventPayload;
            const sessionMetadata = sessionData.metadata || {};
            
            // Retrieve full session with payment_intent
            const session = await stripe.checkout.sessions.retrieve(sessionData.id, {
              expand: ['payment_intent'],
            });
            
            const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
            
            if (paymentIntent && session.payment_status === 'paid') {
              // Create payment record
              const paymentId = crypto.randomBytes(12).toString('base64url');
              await db.payments.create({
                data: {
                  id: paymentId,
                  user_id: user.id,
                  stripe_checkout_session_id: session.id,
                  stripe_payment_intent_id: paymentIntent.id,
                  stripe_charge_id: (paymentIntent as any).latest_charge as string || null,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  status: 'SUCCEEDED',
                  refunded_amount: 0,
                  metadata: sessionMetadata || {},
                  created_at: new Date(session.created * 1000), // Use original session timestamp
                  updated_at: new Date(),
                },
              });
              
              // Grant 12-month membership
              const now = new Date();
              const oneYearFromNow = new Date(now);
              oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
              
              await db.subscriptions.create({
                data: {
                  id: crypto.randomBytes(12).toString('base64url'),
                  user_id: user.id,
                  status: 'ACTIVE',
                  payment_method: 'STRIPE',
                  current_period_start: now,
                  current_period_end: oneYearFromNow,
                  created_at: now,
                  updated_at: now,
                },
              });
              
              console.log(`✅ Deferred payment processed: ${paymentId}`);
              console.log(`✅ Membership granted to ${email} until ${oneYearFromNow.toISOString()}`);
            }
          } else if (eventType === 'payment_intent.payment_failed') {
            const paymentIntentData = eventPayload.data?.object || eventPayload;
            
            // Retrieve full payment intent
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentData.id);
            
            // Create FAILED payment record
            const paymentId = crypto.randomBytes(12).toString('base64url');
            await db.payments.create({
              data: {
                id: paymentId,
                user_id: user.id,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_charge_id: (paymentIntent as any).latest_charge as string || null,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: 'FAILED',
                refunded_amount: 0,
                metadata: {
                  ...paymentIntent.metadata,
                  error: paymentIntent.last_payment_error?.message || 'Payment failed',
                  error_code: paymentIntent.last_payment_error?.code,
                  error_type: paymentIntent.last_payment_error?.type,
                },
                created_at: new Date(paymentIntent.created * 1000), // Use original payment intent timestamp
                updated_at: new Date(),
              },
            });
            
            console.log(`✅ Deferred FAILED payment processed: ${paymentId}`);
            console.log(`   Error: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
          }
          
          // Mark webhook as processed
          await db.stripe_webhook_events.update({
            where: { id: webhookEvent.id },
            data: {
              processed: true,
              processed_at: new Date(),
              error: null,
            },
          });
          
          console.log(`✅ Deferred webhook ${webhookEvent.stripe_event_id} marked as processed`);
        } else {
          console.log(`⏭️ Skipping webhook (different user): ${eventEmail} !== ${email}`);
        }
      } catch (deferredError) {
        console.error(`❌ Error processing deferred payment:`, deferredError);
        // Don't fail the entire request, just log the error
        // The webhook can be manually retried later
      }
    }


    // Mark the session as used (only in production)
    // Do this AFTER successful user/profile creation
    if (!isDevMode && process.env.STRIPE_SECRET_KEY) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        await stripe.checkout.sessions.update(sessionId, {
          metadata: {
            ...session.metadata,
            account_created: 'true',
            user_id: user.id,
            studio_id: studioProfileId,
          },
        });
        console.log('✅ Stripe session marked as used');
      } catch (stripeError) {
        console.error('⚠️ Failed to update Stripe session metadata:', stripeError);
        // Don't fail the request, this is non-critical
      }
    }

    // Send verification email
    const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;
    
    try {
      const emailSent = await sendVerificationEmail(
        user.email,
        user.display_name,
        verificationUrl
      );
      
      if (emailSent) {
        console.log('✅ Verification email sent successfully to:', user.email);
      } else {
        console.warn('⚠️ Failed to send verification email to:', user.email);
        // Don't fail the request, just log the warning
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Don't fail the request, email sending is non-critical for profile creation
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Profile created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Studio profile creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    handleApiError(error, 'Studio profile creation failed');
    
    // Validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { 
          error: 'The information provided is invalid. Please check your details and try again.',
          errorCode: 'VALIDATION_ERROR',
          canRetry: true,
        },
        { status: 400 }
      );
    }
    
    // Payment verification errors
    if (error instanceof Error && error.message.includes('Payment not')) {
      return NextResponse.json(
        { 
          error: 'Payment could not be verified. Please contact support with your order details.',
          errorCode: 'PAYMENT_VERIFICATION_FAILED',
          canRetry: false,
        },
        { status: 400 }
      );
    }
    
    // Image processing errors
    if (error instanceof Error && (error.message.includes('image') || error.message.includes('Image'))) {
      return NextResponse.json(
        { 
          error: 'There was an issue processing your images. Please try again or use different images.',
          errorCode: 'IMAGE_PROCESSING_ERROR',
          canRetry: true,
        },
        { status: 400 }
      );
    }
    
    // Database/server errors (user can retry)
    return NextResponse.json(
      { 
        error: 'We encountered a technical issue while creating your profile. Please try again or contact support if the problem persists.',
        errorCode: 'SERVER_ERROR',
        canRetry: true,
      },
      { status: 500 }
    );
  }
}
