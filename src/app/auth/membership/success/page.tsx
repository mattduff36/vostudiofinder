import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { PaymentSuccessOnboarding } from '@/components/auth/PaymentSuccessOnboarding';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';

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
    how: 'Displayed in search results and used as your unique identifier',
    why: 'Makes your profile easily shareable and memorable',
  },
  {
    name: 'Display Name',
    required: true,
    where: 'Profile header and throughout the site',
    how: 'How we address you in communications and on your profile',
    why: 'Personalizes your experience and builds recognition',
  },
  {
    name: 'Studio Name',
    required: true,
    where: 'Profile header, search results, and listings',
    how: 'Your studio\'s public name that appears in all listings',
    why: 'Helps improve SEO and makes your studio easily identifiable',
  },
  {
    name: 'Short About',
    required: true,
    where: 'Search result listings and profile preview',
    how: 'Brief description shown when users browse studios',
    why: 'Helps artists quickly understand what your studio offers',
  },
  {
    name: 'About',
    required: true,
    where: 'Full profile page',
    how: 'Detailed description of your studio, services, and expertise',
    why: 'Builds trust and helps artists learn about your capabilities',
  },
  {
    name: 'Studio Type(s)',
    required: true,
    where: 'Search filters and profile badges',
    how: 'Categories like Home Studio, Recording Studio, Podcast Studio',
    why: 'Helps artists find the right type of studio for their needs',
  },
  {
    name: 'Location',
    required: true,
    where: 'Search filters and map view',
    how: 'City/region for geographic search filtering',
    why: 'Helps local artists find you and improves local SEO',
  },
  {
    name: 'Connection Methods',
    required: true,
    where: 'Profile page and search filters',
    how: 'How clients can connect (ISDN, Source Connect, Zoom, etc.)',
    why: 'Essential for remote sessions - shows your technical capabilities',
  },
  {
    name: 'Website URL',
    required: true,
    where: 'Profile page as clickable link',
    how: 'Link to your studio website for more information',
    why: 'Builds credibility and provides additional information',
  },
  {
    name: 'Studio Images',
    required: true,
    where: 'Profile gallery and search results',
    how: 'Photos displayed in your gallery showcasing your space',
    why: 'Visual proof of your studio - significantly increases trust and inquiries',
  },
];

const OPTIONAL_FIELDS = [
  {
    name: 'Avatar',
    required: false,
    where: 'Profile header and messages',
    how: 'Your profile picture displayed throughout the site',
    why: 'Adds personality and makes your profile more memorable',
  },
  {
    name: 'Phone',
    required: false,
    where: 'Profile page (if you choose to show it)',
    how: 'Contact phone number for direct inquiries',
    why: 'Makes it easier for clients to reach you directly',
  },
  {
    name: 'Social Media',
    required: false,
    where: 'Profile page as clickable icons',
    how: 'Links to your social profiles (min 2 recommended)',
    why: 'Builds trust and showcases your work and presence',
  },
  {
    name: 'Rate Tiers',
    required: false,
    where: 'Profile page pricing section',
    how: 'Your session rates for different service levels',
    why: 'Helps clients understand pricing upfront and filters inquiries',
  },
  {
    name: 'Equipment List',
    required: false,
    where: 'Profile page equipment section',
    how: 'List of your studio equipment and technology',
    why: 'Shows technical capabilities and attracts quality clients',
  },
  {
    name: 'Services Offered',
    required: false,
    where: 'Profile page services section',
    how: 'Additional services you provide beyond studio access',
    why: 'Helps clients understand your full offering and expertise',
  },
];

// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function MembershipSuccessPage({ searchParams }: MembershipSuccessPageProps) {
  const params = await searchParams;

  // Verify payment exists
  if (!params.session_id) {
    console.error('❌ No session_id provided');
    redirect('/auth/signup?error=session_expired');
  }

  // CRITICAL: Handle race condition between Stripe redirect and webhook processing
  // Stripe redirects users immediately after payment, but webhook may take several seconds
  // Retry with exponential backoff: 1s, 2s, 4s, 8s, 10s = ~25 seconds total
  const maxRetries = 5;
  const retryDelays = [1000, 2000, 4000, 8000, 10000]; // milliseconds
  let payment = null;

  console.log(`🔍 Looking up payment for session: ${params.session_id}`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    payment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: params.session_id },
      select: {
        id: true,
        status: true,
        user_id: true,
      },
    });

    if (payment && payment.status === 'SUCCEEDED') {
      console.log(`✅ Payment found on attempt ${attempt + 1}: ${payment.id}`);
      break;
    }

    // If not found or not succeeded yet, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = retryDelays[attempt] || 2000; // fallback to 2s if undefined
      console.log(`⏳ Payment not ready, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }

  // After all retries, verify we have a successful payment
  if (!payment || payment.status !== 'SUCCEEDED') {
    console.error(`❌ Payment not found or not succeeded after ${maxRetries} attempts`);
    redirect('/auth/signup?error=payment_not_found');
  }

  // Fetch user and studio profile data (same as dashboard)
  const user = await db.users.findUnique({
    where: { id: payment.user_id },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar_url: true,
    },
  });

  if (!user) {
    console.error('❌ User not found');
    redirect('/auth/signup?error=user_not_found');
  }

  // Fetch studio profile if exists
  const studioProfile = await db.studio_profiles.findUnique({
    where: { user_id: user.id },
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
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
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
      name: studioProfile?.name || undefined,
      studio_types: studioProfile?.studio_studio_types?.map(st => st.studio_type) || [],
      images: studioProfile?.studio_images || [],
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
    { ...REQUIRED_FIELDS[0], completed: !!(user.username && !user.username.startsWith('temp_')) },
    { ...REQUIRED_FIELDS[1], completed: !!(user.display_name && user.display_name.trim()) },
    { ...REQUIRED_FIELDS[2], completed: !!(studioProfile?.name && studioProfile.name.trim()) },
    { ...REQUIRED_FIELDS[3], completed: !!(studioProfile?.short_about && studioProfile.short_about.trim()) },
    { ...REQUIRED_FIELDS[4], completed: !!(studioProfile?.about && studioProfile.about.trim()) },
    { ...REQUIRED_FIELDS[5], completed: !!(studioProfile?.studio_studio_types && studioProfile.studio_studio_types.length >= 1) },
    { ...REQUIRED_FIELDS[6], completed: !!(studioProfile?.location && studioProfile.location.trim()) },
    { ...REQUIRED_FIELDS[7], completed: hasConnectionMethod },
    { ...REQUIRED_FIELDS[8], completed: !!(studioProfile?.website_url && studioProfile.website_url.trim()) },
    { ...REQUIRED_FIELDS[9], completed: !!(studioProfile?.studio_images && studioProfile.studio_images.length >= 1) },
  ] as Array<{ name: string; required: boolean; completed: boolean; where: string; how: string; why: string }>;

  const optionalFieldsWithStatus = [
    { ...OPTIONAL_FIELDS[0], completed: !!(user.avatar_url && user.avatar_url.trim()) },
    { ...OPTIONAL_FIELDS[1], completed: !!(studioProfile?.phone && studioProfile.phone.trim()) },
    { ...OPTIONAL_FIELDS[2], completed: socialMediaCount >= 2 },
    { ...OPTIONAL_FIELDS[3], completed: !!(studioProfile?.rate_tier_1 && (typeof studioProfile.rate_tier_1 === 'number' ? studioProfile.rate_tier_1 > 0 : parseFloat(studioProfile.rate_tier_1) > 0)) },
    { ...OPTIONAL_FIELDS[4], completed: !!(studioProfile?.equipment_list && studioProfile.equipment_list.trim()) },
    { ...OPTIONAL_FIELDS[5], completed: !!(studioProfile?.services_offered && studioProfile.services_offered.trim()) },
  ] as Array<{ name: string; required: boolean; completed: boolean; where: string; how: string; why: string }>;

  return (
    <PaymentSuccessOnboarding
      userName={user.display_name}
      completionPercentage={completionPercentage}
      requiredFields={requiredFieldsWithStatus}
      optionalFields={optionalFieldsWithStatus}
    />
  );
}
