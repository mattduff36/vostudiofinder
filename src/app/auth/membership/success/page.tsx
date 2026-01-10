import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { PaymentSuccessOnboarding } from '@/components/auth/PaymentSuccessOnboarding';
import { AutoLoginAfterPayment } from '@/components/auth/AutoLoginAfterPayment';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { stripe } from '@/lib/stripe';
import { randomBytes } from 'crypto';

export const metadata: Metadata = {
  title: 'Payment Successful - Voiceover Studio Finder',
  description: 'Your payment was successful. Complete your profile to get started.',
};

interface MembershipSuccessPageProps {
  searchParams: Promise<{ session_id?: string; email?: string; name?: string; username?: string }>;
}

// Field guidance data
const REQUIRED_FIELDS = [
  {
    name: 'Username',
    required: true,
    where: 'Your profile URL (voiceoverstudiofinder.com/username)',
    how: 'Creates your unique profile URL and is displayed in search results',
    why: 'Makes your profile easily shareable and memorable for clients',
  },
  {
    name: 'Display Name',
    required: true,
    where: 'Profile header and throughout the site',
    how: 'Shown on your profile, in messages, and all communications',
    why: 'Personalises your experience and builds recognition with clients',
  },
  {
    name: 'Email',
    required: true,
    where: 'Account verification and communications',
    how: 'Used for account security, notifications, and client enquiries',
    why: 'Essential for account verification and receiving booking enquiries',
  },
  {
    name: 'Studio Name',
    required: true,
    where: 'Profile header, search results, and listings',
    how: 'Displayed as your main heading in all search results and listings',
    why: 'Primary identifier for your business and crucial for SEO',
  },
  {
    name: 'Short About',
    required: true,
    where: 'Search result listings and profile previews',
    how: 'Brief description shown in search results before users visit your profile',
    why: 'First impression that encourages artists to click through to your full profile',
  },
  {
    name: 'About',
    required: true,
    where: 'Full profile page',
    how: 'Detailed description displayed prominently on your profile page',
    why: 'Builds trust and showcases your studio\'s unique capabilities and services',
  },
  {
    name: 'Studio Type(s)',
    required: true,
    where: 'Search filters and profile badges',
    how: 'Select from: Home Studio, Recording Studio, or Podcast Studio',
    why: 'Enables artists to filter search results to find the right type of facility',
  },
  {
    name: 'Location',
    required: true,
    where: 'Search filters and interactive map view',
    how: 'Displayed as city/region and used for geographic search filtering',
    why: 'Helps local artists discover you and improves local search rankings',
  },
  {
    name: 'Connection Methods',
    required: true,
    where: 'Profile page under technical capabilities',
    how: 'Select from options like Source Connect, Zoom, Cleanfeed, Riverside, etc.',
    why: 'Essential for remote sessions—shows clients how they can connect to your studio',
  },
  {
    name: 'Website URL',
    required: true,
    where: 'Profile page as "Visit Website" link',
    how: 'Clickable link that opens your external website in a new tab',
    why: 'Builds credibility and allows clients to learn more about your services',
  },
  {
    name: 'Studio Images',
    required: true,
    where: 'Profile gallery and search result thumbnails',
    how: 'Uploaded photos displayed in an interactive gallery on your profile',
    why: 'Visual proof of your facilities—significantly increases enquiries and bookings',
  },
];

const OPTIONAL_FIELDS = [
  {
    name: 'Avatar',
    required: false,
    where: 'Profile header and messages',
    how: 'Profile picture displayed next to your name throughout the site',
    why: 'Adds personality and makes your profile more memorable and trustworthy',
  },
  {
    name: 'Phone',
    required: false,
    where: 'Profile page contact section (if enabled)',
    how: 'Displayed as a clickable phone number on your profile',
    why: 'Makes it easier for clients to reach you directly for urgent enquiries',
  },
  {
    name: 'Social Media',
    required: false,
    where: 'Profile page as clickable social icons',
    how: 'Links to social profiles like Facebook, Instagram, LinkedIn (minimum 2 recommended)',
    why: 'Builds trust, showcases your work, and demonstrates your online presence',
  },
  {
    name: 'Rate Tiers',
    required: false,
    where: 'Profile page pricing section',
    how: 'Your session rates displayed for different service levels',
    why: 'Helps clients understand pricing upfront and attracts serious enquiries',
  },
  {
    name: 'Equipment List',
    required: false,
    where: 'Profile page equipment section',
    how: 'Detailed list of your microphones, software, and recording technology',
    why: 'Demonstrates technical capabilities and attracts professional clients',
  },
  {
    name: 'Services Offered',
    required: false,
    where: 'Profile page services section',
    how: 'Description of additional services like editing, directing, or coaching',
    why: 'Showcases your full offering beyond basic studio access',
  },
];

// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function MembershipSuccessPage({ searchParams }: MembershipSuccessPageProps) {
  const pageTimestamp = new Date().toISOString();
  console.log(`[DEBUG ${pageTimestamp}] ========== SUCCESS PAGE LOAD START ==========`);
  
  const params = await searchParams;
  console.log(`[DEBUG ${pageTimestamp}] Search params received:`, {
    session_id: params.session_id || 'MISSING',
    email: params.email || 'MISSING',
    name: params.name || 'MISSING',
    username: params.username || 'MISSING',
  });

  // Verify payment exists
  if (!params.session_id) {
    console.error(`[DEBUG ${pageTimestamp}] ❌ ERROR: No session_id provided in URL params`);
    console.error(`[DEBUG ${pageTimestamp}] Full params:`, JSON.stringify(params, null, 2));
    redirect('/auth/signup?error=session_expired');
  }

  // CRITICAL: Handle race condition between Stripe redirect and webhook processing
  // Stripe redirects users immediately after payment, but webhook may take several seconds
  // Retry with exponential backoff: 1s, 2s, 4s, 8s, 10s = ~25 seconds total
  const maxRetries = 5;
  const retryDelays = [1000, 2000, 4000, 8000, 10000]; // milliseconds
  let payment = null;

  console.log(`[DEBUG ${pageTimestamp}] Looking up payment for session: ${params.session_id}`);
  console.log(`[DEBUG ${pageTimestamp}] Will retry up to ${maxRetries} times with delays: ${retryDelays.join(', ')}ms`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const attemptTimestamp = new Date().toISOString();
    console.log(`[DEBUG ${attemptTimestamp}] ========== PAYMENT LOOKUP ATTEMPT ${attempt + 1}/${maxRetries} ==========`);
    
    payment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: params.session_id },
      select: {
        id: true,
        status: true,
        user_id: true,
        stripe_payment_intent_id: true,
        amount: true,
        currency: true,
        created_at: true,
        updated_at: true,
      },
    });

    console.log(`[DEBUG ${attemptTimestamp}] Database query result:`, payment ? {
      id: payment.id,
      status: payment.status,
      user_id: payment.user_id,
      payment_intent_id: payment.stripe_payment_intent_id,
      amount: payment.amount,
      currency: payment.currency,
      created_at: payment.created_at?.toISOString(),
      updated_at: payment.updated_at?.toISOString(),
    } : 'NULL (not found)');

    if (payment && payment.status === 'SUCCEEDED') {
      console.log(`[DEBUG ${attemptTimestamp}] ✅ SUCCESS: Payment found on attempt ${attempt + 1}: ${payment.id}`);
      console.log(`[DEBUG ${attemptTimestamp}] Payment details:`, {
        id: payment.id,
        status: payment.status,
        user_id: payment.user_id,
        amount: payment.amount,
        currency: payment.currency,
      });
      break;
    }

    // If not found or not succeeded yet, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = retryDelays[attempt] || 2000; // fallback to 2s if undefined
      console.log(`[DEBUG ${attemptTimestamp}] ⏳ Payment not ready (status: ${payment?.status || 'NOT_FOUND'}), retrying in ${delay}ms`);
      await sleep(delay);
    } else {
      console.log(`[DEBUG ${attemptTimestamp}] ⚠️ Final attempt completed, payment status: ${payment?.status || 'NOT_FOUND'}`);
    }
  }

  // After all retries, verify we have a successful payment
  if (!payment || payment.status !== 'SUCCEEDED') {
    const errorTimestamp = new Date().toISOString();
    console.error(`[DEBUG ${errorTimestamp}] ❌ ERROR: Payment not found or not succeeded after ${maxRetries} attempts`);
    console.error(`[DEBUG ${errorTimestamp}] Final payment state:`, payment ? {
      id: payment.id,
      status: payment.status,
      user_id: payment.user_id,
    } : 'NULL');
    console.error(`[DEBUG ${errorTimestamp}] Session ID searched: ${params.session_id}`);
    
    // Additional diagnostic: Check if ANY payment exists with this session ID
    const anyPayment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: params.session_id },
    });
    console.error(`[DEBUG ${errorTimestamp}] Diagnostic - Any payment with this session_id:`, anyPayment ? {
      id: anyPayment.id,
      status: anyPayment.status,
    } : 'NONE');
    
    // FALLBACK: If webhook hasn't processed (common in preview builds), verify directly with Stripe
    console.log(`[DEBUG ${errorTimestamp}] 🔄 FALLBACK: Checking Stripe directly for session ${params.session_id}...`);
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(params.session_id, {
        expand: ['payment_intent'],
      });
      
      console.log(`[DEBUG ${errorTimestamp}] Stripe session retrieved:`, {
        id: stripeSession.id,
        payment_status: stripeSession.payment_status,
        mode: stripeSession.mode,
        customer: stripeSession.customer || 'NONE',
        customer_email: stripeSession.customer_email || 'NONE',
      });
      
      if (stripeSession.payment_status === 'paid' && stripeSession.mode === 'payment') {
        console.log(`[DEBUG ${errorTimestamp}] ✅ Stripe confirms payment is PAID - webhook likely not configured for preview`);
        
        const paymentIntent = stripeSession.payment_intent as any;
        const userId = stripeSession.metadata?.user_id;
        
        if (!userId) {
          console.error(`[DEBUG ${errorTimestamp}] ❌ ERROR: No user_id in Stripe session metadata`);
          redirect('/auth/signup?error=payment_not_found');
        }
        
        // Create payment record manually (webhook fallback)
        console.log(`[DEBUG ${errorTimestamp}] Creating payment record manually...`);
        const newPayment = await db.payments.create({
          data: {
            id: randomBytes(12).toString('base64url'),
            user_id: userId,
            stripe_checkout_session_id: stripeSession.id,
            stripe_payment_intent_id: paymentIntent?.id || null,
            stripe_charge_id: paymentIntent?.latest_charge || null,
            amount: paymentIntent?.amount || stripeSession.amount_total || 0,
            currency: paymentIntent?.currency || stripeSession.currency || 'gbp',
            status: 'SUCCEEDED',
            refunded_amount: 0,
            metadata: stripeSession.metadata || {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        
        console.log(`[DEBUG ${errorTimestamp}] ✅ Payment record created: ${newPayment.id}`);
        
        // Grant membership if user exists and is verified
        const user = await db.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email_verified: true,
            status: true,
          },
        });
        
        if (user && user.email_verified && user.status !== 'ACTIVE') {
          console.log(`[DEBUG ${errorTimestamp}] Granting membership to user ${userId}...`);
          await db.users.update({
            where: { id: userId },
            data: {
              status: 'ACTIVE',
              updated_at: new Date(),
            },
          });
          
          // Create subscription record
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          
          await db.subscriptions.create({
            data: {
              id: randomBytes(12).toString('base64url'),
              user_id: userId,
              status: 'ACTIVE',
              payment_method: 'STRIPE',
              current_period_start: new Date(),
              current_period_end: oneYearFromNow,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
          
          console.log(`[DEBUG ${errorTimestamp}] ✅ Membership granted`);
        }
        
        // Use the newly created payment
        payment = {
          id: newPayment.id,
          status: 'SUCCEEDED' as const,
          user_id: userId,
          stripe_payment_intent_id: newPayment.stripe_payment_intent_id,
          amount: newPayment.amount,
          currency: newPayment.currency,
          created_at: newPayment.created_at,
          updated_at: newPayment.updated_at,
        };
      } else {
        console.error(`[DEBUG ${errorTimestamp}] ❌ Stripe session not paid or wrong mode:`, {
          payment_status: stripeSession.payment_status,
          mode: stripeSession.mode,
        });
        redirect('/auth/signup?error=payment_not_found');
      }
    } catch (stripeError) {
      console.error(`[DEBUG ${errorTimestamp}] ❌ ERROR: Failed to verify with Stripe:`, stripeError);
      redirect('/auth/signup?error=payment_not_found');
    }
  }
  
  // Final check - ensure we have a payment
  if (!payment || payment.status !== 'SUCCEEDED') {
    console.error(`[DEBUG ${pageTimestamp}] ❌ ERROR: Still no valid payment after fallback`);
    redirect('/auth/signup?error=payment_not_found');
  }

  console.log(`[DEBUG ${pageTimestamp}] ✅ Payment verified successfully, proceeding to load user data...`);

  // Fetch user and studio profile data (same as dashboard)
  console.log(`[DEBUG ${pageTimestamp}] Fetching user data for user_id: ${payment.user_id}`);
  const user = await db.users.findUnique({
    where: { id: payment.user_id },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
      status: true,
      email_verified: true,
    },
  });

  if (!user) {
    console.error(`[DEBUG ${pageTimestamp}] ❌ ERROR: User not found for user_id: ${payment.user_id}`);
    redirect('/auth/signup?error=user_not_found');
  }

  console.log(`[DEBUG ${pageTimestamp}] ✅ User found:`, {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    status: user.status,
    email_verified: user.email_verified,
  });

  // CRITICAL: Idempotently ensure user is ACTIVE and all membership records exist
  // This is the authoritative backstop - if payment succeeded and user reached here,
  // they MUST be ACTIVE regardless of webhook timing
  const activationTimestamp = new Date().toISOString();
  console.log(`[DEBUG ${activationTimestamp}] ========== ACTIVATION CHECK START ==========`);
  console.log(`[DEBUG ${activationTimestamp}] Current user status: ${user.status}`);
  console.log(`[DEBUG ${activationTimestamp}] Email verified: ${user.email_verified}`);

  // Only activate if user is verified (safety check)
  if (user.email_verified) {
    if (user.status !== 'ACTIVE') {
      console.log(`[DEBUG ${activationTimestamp}] User is not ACTIVE, updating status...`);
      await db.users.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
      console.log(`[DEBUG ${activationTimestamp}] ✅ User status updated to ACTIVE`);
    } else {
      console.log(`[DEBUG ${activationTimestamp}] ✅ User already ACTIVE, no update needed`);
    }

    // Ensure subscription record exists (idempotent)
    console.log(`[DEBUG ${activationTimestamp}] Checking for existing subscription...`);
    const existingSubscription = await db.subscriptions.findFirst({
      where: { 
        user_id: user.id,
        status: 'ACTIVE',
      },
    });

    if (!existingSubscription) {
      console.log(`[DEBUG ${activationTimestamp}] No active subscription found, creating one...`);
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const subscription = await db.subscriptions.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          status: 'ACTIVE',
          payment_method: 'STRIPE',
          current_period_start: now,
          current_period_end: oneYearFromNow,
          created_at: now,
          updated_at: now,
        },
      });
      console.log(`[DEBUG ${activationTimestamp}] ✅ Subscription created: ${subscription.id}, valid until ${oneYearFromNow.toISOString()}`);
    } else {
      console.log(`[DEBUG ${activationTimestamp}] ✅ Active subscription already exists: ${existingSubscription.id}`);
    }

    // Ensure studio profile is ACTIVE if exists (idempotent)
    console.log(`[DEBUG ${activationTimestamp}] Checking studio profile...`);
    const studioProfile = await db.studio_profiles.findUnique({
      where: { user_id: user.id },
      select: { id: true, status: true },
    });

    if (studioProfile && studioProfile.status !== 'ACTIVE') {
      console.log(`[DEBUG ${activationTimestamp}] Studio profile exists but not ACTIVE, updating...`);
      await db.studio_profiles.update({
        where: { user_id: user.id },
        data: {
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
      console.log(`[DEBUG ${activationTimestamp}] ✅ Studio profile status updated to ACTIVE`);
    } else if (studioProfile) {
      console.log(`[DEBUG ${activationTimestamp}] ✅ Studio profile already ACTIVE`);
    } else {
      console.log(`[DEBUG ${activationTimestamp}] No studio profile exists yet (will be created on form submission)`);
    }

    console.log(`[DEBUG ${activationTimestamp}] ========== ACTIVATION CHECK COMPLETE ==========`);
  } else {
    console.warn(`[DEBUG ${activationTimestamp}] ⚠️ WARNING: User email not verified, skipping activation`);
    console.warn(`[DEBUG ${activationTimestamp}] This should not happen - payment guards should prevent this`);
  }

  // Refresh user data to get updated status
  const updatedUser = await db.users.findUnique({
    where: { id: payment.user_id },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
      status: true,
    },
  });

  const finalUser = updatedUser || user;
  console.log(`[DEBUG ${pageTimestamp}] Final user status for UI: ${finalUser.status}`);

  // Fetch studio profile if exists
  const studioProfile = await db.studio_profiles.findUnique({
    where: { user_id: finalUser.id },
    select: {
      id: true,
      name: true,
      short_about: true,
      about: true,
      phone: true,
      location: true,
      website_url: true,
      equipment_list: true,
      services_offered: true,
      facebook_url: true,
      twitter_url: true,
      linkedin_url: true,
      instagram_url: true,
      youtube_url: true,
      vimeo_url: true,
      soundcloud_url: true,
      connection1: true,
      connection2: true,
      connection3: true,
      connection4: true,
      connection5: true,
      connection6: true,
      connection7: true,
      connection8: true,
      rate_tier_1: true,
      studio_studio_types: {
        select: {
          studio_type: true,
        },
      },
      studio_images: {
        select: {
          id: true,
        },
      },
    },
  });

  // Calculate profile completion using single source of truth
  const completionStats = calculateCompletionStats({
    user: {
      username: finalUser.username,
      display_name: finalUser.display_name,
      email: finalUser.email,
      avatar_url: finalUser.avatar_url,
    },
    profile: studioProfile ? {
      short_about: studioProfile.short_about,
      about: studioProfile.about,
      phone: studioProfile.phone,
      location: studioProfile.location,
      website_url: studioProfile.website_url,
      equipment_list: studioProfile.equipment_list,
      services_offered: studioProfile.services_offered,
      facebook_url: studioProfile.facebook_url,
      twitter_url: studioProfile.twitter_url,
      linkedin_url: studioProfile.linkedin_url,
      instagram_url: studioProfile.instagram_url,
      youtube_url: studioProfile.youtube_url,
      vimeo_url: studioProfile.vimeo_url,
      soundcloud_url: studioProfile.soundcloud_url,
      connection1: studioProfile.connection1,
      connection2: studioProfile.connection2,
      connection3: studioProfile.connection3,
      connection4: studioProfile.connection4,
      connection5: studioProfile.connection5,
      connection6: studioProfile.connection6,
      connection7: studioProfile.connection7,
      connection8: studioProfile.connection8,
      rate_tier_1: studioProfile.rate_tier_1,
    } : undefined,
    studio: {
      name: studioProfile?.name || null,
      studio_types: studioProfile?.studio_studio_types?.map(st => st.studio_type) || [],
      images: studioProfile?.studio_images || [],
      website_url: studioProfile?.website_url || null,
    },
  });

  const completionPercentage = completionStats.overall.percentage;

  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    studioProfile?.connection1 === '1' || 
    studioProfile?.connection2 === '1' || 
    studioProfile?.connection3 === '1' || 
    studioProfile?.connection4 === '1' || 
    studioProfile?.connection5 === '1' || 
    studioProfile?.connection6 === '1' || 
    studioProfile?.connection7 === '1' || 
    studioProfile?.connection8 === '1'
  );

  // Count social media links
  const socialMediaCount = [
    studioProfile?.facebook_url,
    studioProfile?.twitter_url,
    studioProfile?.linkedin_url,
    studioProfile?.instagram_url,
    studioProfile?.youtube_url,
    studioProfile?.vimeo_url,
    studioProfile?.soundcloud_url,
  ].filter(url => url && url.trim() !== '').length;

  // Map fields to completion status
  const requiredFieldsWithStatus = [
    { name: REQUIRED_FIELDS[0]!.name, required: true, completed: !!(finalUser.username && !finalUser.username.startsWith('temp_')), where: REQUIRED_FIELDS[0]!.where, how: REQUIRED_FIELDS[0]!.how, why: REQUIRED_FIELDS[0]!.why },
    { name: REQUIRED_FIELDS[1]!.name, required: true, completed: !!(finalUser.display_name && finalUser.display_name.trim()), where: REQUIRED_FIELDS[1]!.where, how: REQUIRED_FIELDS[1]!.how, why: REQUIRED_FIELDS[1]!.why },
    { name: REQUIRED_FIELDS[2]!.name, required: true, completed: !!(finalUser.email && finalUser.email.trim()), where: REQUIRED_FIELDS[2]!.where, how: REQUIRED_FIELDS[2]!.how, why: REQUIRED_FIELDS[2]!.why },
    { name: REQUIRED_FIELDS[3]!.name, required: true, completed: !!(studioProfile?.name && studioProfile.name.trim()), where: REQUIRED_FIELDS[3]!.where, how: REQUIRED_FIELDS[3]!.how, why: REQUIRED_FIELDS[3]!.why },
    { name: REQUIRED_FIELDS[4]!.name, required: true, completed: !!(studioProfile?.short_about && studioProfile.short_about.trim()), where: REQUIRED_FIELDS[4]!.where, how: REQUIRED_FIELDS[4]!.how, why: REQUIRED_FIELDS[4]!.why },
    { name: REQUIRED_FIELDS[5]!.name, required: true, completed: !!(studioProfile?.about && studioProfile.about.trim()), where: REQUIRED_FIELDS[5]!.where, how: REQUIRED_FIELDS[5]!.how, why: REQUIRED_FIELDS[5]!.why },
    { name: REQUIRED_FIELDS[6]!.name, required: true, completed: !!(studioProfile?.studio_studio_types && studioProfile.studio_studio_types.length >= 1), where: REQUIRED_FIELDS[6]!.where, how: REQUIRED_FIELDS[6]!.how, why: REQUIRED_FIELDS[6]!.why },
    { name: REQUIRED_FIELDS[7]!.name, required: true, completed: !!(studioProfile?.location && studioProfile.location.trim()), where: REQUIRED_FIELDS[7]!.where, how: REQUIRED_FIELDS[7]!.how, why: REQUIRED_FIELDS[7]!.why },
    { name: REQUIRED_FIELDS[8]!.name, required: true, completed: hasConnectionMethod, where: REQUIRED_FIELDS[8]!.where, how: REQUIRED_FIELDS[8]!.how, why: REQUIRED_FIELDS[8]!.why },
    { name: REQUIRED_FIELDS[9]!.name, required: true, completed: !!(studioProfile?.website_url && studioProfile.website_url.trim()), where: REQUIRED_FIELDS[9]!.where, how: REQUIRED_FIELDS[9]!.how, why: REQUIRED_FIELDS[9]!.why },
    { name: REQUIRED_FIELDS[10]!.name, required: true, completed: !!(studioProfile?.studio_images && studioProfile.studio_images.length >= 1), where: REQUIRED_FIELDS[10]!.where, how: REQUIRED_FIELDS[10]!.how, why: REQUIRED_FIELDS[10]!.why },
  ];

  const optionalFieldsWithStatus = [
    { name: OPTIONAL_FIELDS[0]!.name, required: false, completed: !!(finalUser.avatar_url && finalUser.avatar_url.trim()), where: OPTIONAL_FIELDS[0]!.where, how: OPTIONAL_FIELDS[0]!.how, why: OPTIONAL_FIELDS[0]!.why },
    { name: OPTIONAL_FIELDS[1]!.name, required: false, completed: !!(studioProfile?.phone && studioProfile.phone.trim()), where: OPTIONAL_FIELDS[1]!.where, how: OPTIONAL_FIELDS[1]!.how, why: OPTIONAL_FIELDS[1]!.why },
    { name: OPTIONAL_FIELDS[2]!.name, required: false, completed: socialMediaCount >= 2, where: OPTIONAL_FIELDS[2]!.where, how: OPTIONAL_FIELDS[2]!.how, why: OPTIONAL_FIELDS[2]!.why },
    { name: OPTIONAL_FIELDS[3]!.name, required: false, completed: !!(studioProfile?.rate_tier_1 && (typeof studioProfile.rate_tier_1 === 'number' ? studioProfile.rate_tier_1 > 0 : parseFloat(studioProfile.rate_tier_1) > 0)), where: OPTIONAL_FIELDS[3]!.where, how: OPTIONAL_FIELDS[3]!.how, why: OPTIONAL_FIELDS[3]!.why },
    { name: OPTIONAL_FIELDS[4]!.name, required: false, completed: !!(studioProfile?.equipment_list && studioProfile.equipment_list.trim()), where: OPTIONAL_FIELDS[4]!.where, how: OPTIONAL_FIELDS[4]!.how, why: OPTIONAL_FIELDS[4]!.why },
    { name: OPTIONAL_FIELDS[5]!.name, required: false, completed: !!(studioProfile?.services_offered && studioProfile.services_offered.trim()), where: OPTIONAL_FIELDS[5]!.where, how: OPTIONAL_FIELDS[5]!.how, why: OPTIONAL_FIELDS[5]!.why },
  ];

  return (
    <AutoLoginAfterPayment>
      <PaymentSuccessOnboarding
        userName={finalUser.display_name}
        completionPercentage={completionPercentage}
        requiredFields={requiredFieldsWithStatus}
        optionalFields={optionalFieldsWithStatus}
      />
    </AutoLoginAfterPayment>
  );
}
