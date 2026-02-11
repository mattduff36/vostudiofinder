/**
 * Random test data generator for admin test account creation.
 * Uses hardcoded pools of realistic data — no external faker dependency.
 */

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery',
  'Quinn', 'Sage', 'River', 'Phoenix', 'Blake', 'Cameron', 'Dakota', 'Emery',
  'Finley', 'Harper', 'Hayden', 'Indigo', 'Jasper', 'Kai', 'Logan', 'Marley',
  'Noah', 'Oakley', 'Parker', 'Reese', 'Rowan', 'Skyler', 'Tatum', 'Willow',
  'Zephyr', 'Aria', 'Briar', 'Cedar', 'Eliot', 'Fern', 'Gale', 'Haven',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres',
  'Hill', 'Green', 'Adams', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
];

const UK_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Leeds',
  'Glasgow', 'Liverpool', 'Sheffield', 'Newcastle', 'Nottingham', 'Cardiff',
  'Belfast', 'Brighton', 'Oxford', 'Cambridge', 'Bath', 'York', 'Southampton',
  'Reading', 'Coventry', 'Leicester', 'Aberdeen', 'Dundee', 'Swansea',
];

const SHORT_DESCRIPTIONS = [
  'Professional voiceover and recording services in a purpose-built studio.',
  'Home studio specialising in audiobook narration and commercial VO.',
  'Broadcast-quality recording space with Source Connect and ISDN.',
  'Full-service audio production studio for voice, podcast, and music.',
  'Dedicated voiceover booth with premium acoustics and fast turnaround.',
  'Experienced voice talent with a fully equipped home studio.',
  'Award-winning recording studio offering remote and in-person sessions.',
  'Podcast production and voice recording in a soundproofed environment.',
  'Creative audio studio with coaching and production services.',
  'High-end voice recording facility with multiple connection options.',
];

const FULL_DESCRIPTIONS = [
  'Welcome to our professional recording studio, purpose-built for voiceover, narration, and audio production. Our acoustically treated space features industry-standard equipment including a Neumann U87 microphone, Universal Audio Apollo interface, and comprehensive monitoring. We offer remote recording via Source Connect, Cleanfeed, and ipDTL, as well as in-person sessions. Whether you need commercial spots, audiobook chapters, or corporate narration, we deliver broadcast-ready audio with fast turnaround times.',
  'Our home studio has been professionally designed and acoustically treated to deliver broadcast-quality recordings. Equipped with a Sennheiser MKH 416, Focusrite Clarett interface, and Pro Tools, we specialise in commercial voiceover, e-learning narration, and podcast production. Remote sessions available via Source Connect, Cleanfeed, and Zoom. Based in the heart of the city with easy transport links.',
  'A dedicated recording space built for voice talent and audio producers. Our studio features a custom-built vocal booth, premium signal chain, and multiple remote connection options. We pride ourselves on delivering clean, professional audio every time. Services include voice recording, audio editing, mixing, and mastering. Available for both short-form commercials and long-form narration projects.',
];

const EQUIPMENT_ITEMS = [
  'Neumann U87', 'Neumann TLM 103', 'Sennheiser MKH 416', 'Rode NT1-A',
  'AKG C414', 'Audio-Technica AT4053b', 'Shure SM7B', 'Electro-Voice RE20',
  'Universal Audio Apollo Twin', 'Focusrite Scarlett 2i2', 'Focusrite Clarett+',
  'RME Babyface Pro', 'SSL 2+', 'Audient iD14',
  'Pro Tools', 'Adobe Audition', 'Reaper', 'Logic Pro X', 'Audacity',
  'Whisper Room', 'Custom vocal booth', 'Acoustically treated room',
  'dbx 286s', 'Cloudlifter CL-1', 'FetHead', 'Grace Design m101',
];

const STUDIO_NAME_PATTERNS = [
  (first: string, last: string) => `${first} ${last} Studios`,
  (first: string, _last: string) => `${first}'s Voice Lab`,
  (first: string, _last: string) => `${first} Voice Productions`,
  (_first: string, last: string) => `${last} Audio`,
  (first: string, last: string) => `${first} ${last} Recording`,
  (_first: string, last: string) => `${last} Sound Studio`,
  (first: string, _last: string) => `${first} VO Studio`,
  (_first: string, last: string) => `The ${last} Studio`,
];

const WEBSITE_DOMAINS = [
  'example.com', 'test-studio.co.uk', 'demo-vo.com', 'teststudio.example.com',
];

type ProfileCompleteness = 'empty' | 'partial' | 'full';

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateShortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export interface TestProfileData {
  username: string;
  display_name: string;
  email: string;
  password: string;
  membership_tier: 'BASIC' | 'PREMIUM';
  profile_data: {
    name: string;
    city: string;
    short_about?: string;
    about?: string;
    website_url?: string;
    phone?: string;
    equipment_list?: string;
    rate_tier_1?: string;
    rate_tier_2?: string;
    rate_tier_3?: string;
    show_rates?: boolean;
    studio_types?: string[];
    connections?: Record<string, string>;
    social_links?: Record<string, string>;
  };
}

export function generateTestProfile(
  tier: 'BASIC' | 'PREMIUM',
  completeness: ProfileCompleteness,
  emailOverride?: string,
  passwordOverride?: string,
): TestProfileData {
  const shortId = generateShortId(8);
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);

  const username = `test_${shortId}`;
  const displayName = `${firstName} ${lastName}`;
  const email = emailOverride || `test-${generateShortId(6)}@vostudiofinder-test.com`;
  const password = passwordOverride || 'Test1234!';

  if (completeness === 'empty') {
    return {
      username,
      display_name: displayName,
      email,
      password,
      membership_tier: tier,
      profile_data: {
        name: '',
        city: '',
      },
    };
  }

  const studioName = randomElement(STUDIO_NAME_PATTERNS)(firstName, lastName);
  const city = randomElement(UK_CITIES);

  if (completeness === 'partial') {
    // 1-2 studio types (respecting tier limits)
    const availableTypes = tier === 'PREMIUM'
      ? ['HOME', 'RECORDING', 'PODCAST', 'VO_COACH', 'AUDIO_PRODUCER']
      : ['HOME', 'RECORDING', 'PODCAST'];
    const studioTypes = randomElements(availableTypes, randomInt(1, 2));

    // 2-3 connections
    const connectionIds = ['connection1', 'connection2', 'connection3', 'connection4', 'connection5', 'connection6'];
    const selectedConnections = randomElements(connectionIds, randomInt(2, 3));
    const connections: Record<string, string> = {};
    for (const conn of selectedConnections) {
      connections[conn] = '1';
    }

    return {
      username,
      display_name: displayName,
      email,
      password,
      membership_tier: tier,
      profile_data: {
        name: studioName,
        city,
        short_about: randomElement(SHORT_DESCRIPTIONS),
        studio_types: studioTypes,
        connections,
      },
    };
  }

  // Full completeness
  const availableTypes = tier === 'PREMIUM'
    ? ['HOME', 'RECORDING', 'PODCAST', 'VO_COACH', 'AUDIO_PRODUCER']
    : ['HOME', 'RECORDING', 'PODCAST'];
  const studioTypes = randomElements(availableTypes, tier === 'PREMIUM' ? randomInt(2, 4) : 1);

  // All standard connections
  const allConnectionIds = [
    'connection1', 'connection2', 'connection3', 'connection4',
    'connection5', 'connection6', 'connection7', 'connection8',
    'connection9', 'connection10', 'connection11', 'connection12',
  ];
  const connectionCount = tier === 'PREMIUM' ? randomInt(5, 8) : 3;
  const selectedConnections = randomElements(allConnectionIds, connectionCount);
  const connections: Record<string, string> = {};
  for (const conn of selectedConnections) {
    connections[conn] = '1';
  }

  // Equipment
  const equipmentCount = randomInt(4, 8);
  const equipment = randomElements(EQUIPMENT_ITEMS, equipmentCount).join(', ');

  // Social links
  const websiteUrl = `https://www.${randomElement(WEBSITE_DOMAINS)}/${username}`;
  const socialLinks: Record<string, string> = {
    website_url: websiteUrl,
    facebook_url: `https://facebook.com/${username}`,
    x_url: `https://x.com/${username}`,
    instagram_url: `https://instagram.com/${username}`,
  };

  if (tier === 'PREMIUM') {
    socialLinks.linkedin_url = `https://linkedin.com/in/${username}`;
    socialLinks.youtube_url = `https://youtube.com/@${username}`;
  }

  return {
    username,
    display_name: displayName,
    email,
    password,
    membership_tier: tier,
    profile_data: {
      name: studioName,
      city,
      short_about: randomElement(SHORT_DESCRIPTIONS),
      about: randomElement(FULL_DESCRIPTIONS),
      website_url: websiteUrl,
      phone: `+44 ${randomInt(7000, 7999)} ${randomInt(100000, 999999)}`,
      equipment_list: equipment,
      rate_tier_1: '£150-250/hour',
      rate_tier_2: '£500-800/day',
      rate_tier_3: '£200-400/half-day',
      show_rates: true,
      studio_types: studioTypes,
      connections,
      social_links: socialLinks,
    },
  };
}

/** Email domain used to identify test accounts */
export const TEST_EMAIL_DOMAIN = 'vostudiofinder-test.com';

/** Check if an email belongs to a test account */
export function isTestAccountEmail(email: string): boolean {
  return email.endsWith(`@${TEST_EMAIL_DOMAIN}`);
}
