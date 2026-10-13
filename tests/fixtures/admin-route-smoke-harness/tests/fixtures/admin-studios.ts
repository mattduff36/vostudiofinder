import type { Studio } from '../../src/components/admin/studios/types';
import { getProfileCompletion } from '../../src/lib/utils/profile-completion';

export function adminStudioFixture(index: number): Studio {
  const id = `fixture_studio_${index}`;
  const input = { studio_name: `Fixture Studio ${String(index).padStart(4, '0')}`, username: `fixture${index}`, display_name: `Fixture Owner ${index}`,
    email: `fixture${index}@example.invalid`, short_about: 'A recording studio used only in isolated UI verification.',
    about: 'A full studio description. '.repeat(40), location: 'London, United Kingdom', connection6: '1', website_url: 'https://example.invalid', images_count: 1, studio_types_count: 1 };
  const completion = getProfileCompletion(input);
  return { ...input, id, name: input.studio_name, description: input.about,
    studio_studio_types: [{ studio_type: 'RECORDING' }], studio_images: [{ id: `image_${index}` }],
    status: 'ACTIVE', is_verified: false, is_premium: true, is_featured: false, featured_until: null,
    is_spotlight: false, is_profile_visible: false, admin_review: false, profile_completion: completion.overall.percentage, completion,
    last_login: null, membership_expires_at: '2027-10-12T00:00:00.000Z', membership_tier: 'PREMIUM', latitude: 51.5, longitude: -0.1,
    users: { id: `fixture_user_${index}`, display_name: input.display_name, username: input.username, email: input.email, email_verified: false, avatar_url: null },
    created_at: '2026-01-15T12:00:00.000Z', updated_at: '2026-10-12T12:00:00.000Z' };
}
export function adminProfileFixture(studio: Studio) {
  return { profile: { id: studio.id, name: studio.name, username: studio.users.username, display_name: studio.users.display_name,
    email: studio.users.email, email_verified: studio.users.email_verified, status: studio.status, joined: studio.created_at,
    avatar_image: null, studioTypes: studio.studio_studio_types, images: [{ id: 'image_1', image_url: '/images/logos/voiceover-studio-finder-logo.svg', alt_text: 'Fixture', sort_order: 0 }],
    _meta: { studio_name: studio.name, short_about: studio.short_about, about: studio.about, location: studio.location, url: studio.website_url,
      phone: '', about_me: '', equipment_list: '', services_offered: '', connection6: '1', showemail: '0', showphone: '0', showaddress: '0', showdirections: '0',
      is_profile_visible: studio.is_profile_visible, membership_tier: studio.membership_tier, membership_expires_at: studio.membership_expires_at, auto_renew: false } },
    tierLimits: { aboutMaxChars: 4000, imagesMax: 10, studioTypesMax: null, studioTypesExcluded: [], connectionsMax: 12, customConnectionsMax: 2,
      socialLinksMax: null, phoneVisibility: true, directionsVisibility: true, advancedSettings: true, aiAutoGenerate: true, verificationEligible: true,
      featuredEligible: true, avatarAllowed: true } };
}
