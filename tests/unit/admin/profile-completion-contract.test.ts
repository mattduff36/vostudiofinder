import { calculateCompletionStats, completionInputFromLegacy, getProfileCompletion, COMPLETION_CONNECTION_FIELDS, COMPLETION_SOCIAL_FIELDS, type CompletionInput } from '@/lib/utils/profile-completion';
import { completionEditSection, completionSectionStatus } from '@/lib/profile/completion-sections';

const required: CompletionInput = { username: 'fixture', display_name: 'Fixture', email: 'fixture@example.invalid', studio_name: 'Fixture studio',
  short_about: 'Short', about: 'Full', studio_types_count: 1, location: 'London', connection1: '1', website_url: 'https://example.invalid', images_count: 1 };
describe('Dashboard, admin and editor completion contract', () => {
  it('keeps the 11 required/7 optional weights and exact rounded percentages', () => {
    expect(getProfileCompletion({})).toMatchObject({ required: { completed: 0, total: 11 }, optional: { completed: 0, total: 7 }, overall: { percentage: 0 } });
    const result = getProfileCompletion(required);
    expect(result.required.completed).toBe(11); expect(result.overall.percentage).toBe(65);
    const complete = getProfileCompletion({ ...required, avatar_url: '/avatar.png', about_me: 'About', phone: '123', rate_tier_1: 1,
      equipment_list: 'Mic', services_offered: 'Recording', vimeo_url: 'https://vimeo.com/fixture', bluesky_url: 'https://bsky.app/profile/fixture' });
    expect(complete.items).toHaveLength(18); expect(new Set(complete.items.map(item => item.id)).size).toBe(18);
    expect(complete.optional.completed).toBe(7); expect(complete.overall.percentage).toBe(100);
    expect(completionSectionStatus(complete).social).toBe('complete');
  });
  it('preserves username, trimming, first-rate and website-source edge cases', () => {
    expect(getProfileCompletion({ username: 'temp_example' }).overall.percentage).toBe(0);
    expect(getProfileCompletion({ username: ' ' }).overall.percentage).toBe(6);
    expect(getProfileCompletion({ display_name: ' ', about: '\n', rate_tier_1: '£100' }).overall.percentage).toBe(0);
    expect(getProfileCompletion({ rate_tier_1: '10 per hour' }).overall.percentage).toBe(5);
    const legacy = { user: { username: '', display_name: '', email: '' }, profile: { website_url: 'https://example.invalid' }, studio: {} };
    expect(completionInputFromLegacy(legacy).website_url).toBeUndefined();
    expect(calculateCompletionStats(legacy)).toEqual({ required: { completed: 0, total: 11 }, overall: { percentage: 0 } });
  });
  it.each(COMPLETION_CONNECTION_FIELDS)('recognises %s using the existing string flag only', field => {
    expect(getProfileCompletion({ [field]: '1' }).required.completed).toBe(1);
    expect(getProfileCompletion({ [field]: 'true' }).required.completed).toBe(0);
  });
  it.each(COMPLETION_SOCIAL_FIELDS)('counts %s towards the same two-link social rule in all section indicators', field => {
    const other = field === 'bluesky_url' ? 'vimeo_url' : 'bluesky_url';
    expect(completionSectionStatus(getProfileCompletion({ [field]: 'https://example.invalid' })).social).toBe('incomplete');
    expect(completionSectionStatus(getProfileCompletion({ [field]: 'https://example.invalid', [other]: 'https://example.invalid/2' })).social).toBe('complete');
  });
  it('routes administrator identity edits to Admin Settings and owner edits to Basic Info', () => {
    expect(completionEditSection('email', 'admin')).toBe('admin');
    expect(completionEditSection('username', 'admin')).toBe('admin');
    expect(completionEditSection('email', 'owner')).toBe('basic');
    expect(completionEditSection('website_url', 'admin')).toBe('basic');
    expect(completionEditSection('images', 'admin')).toBe('images');
  });
});

it('section badges use the same owner/admin routing as every completion Edit action', () => {
  const complete = getProfileCompletion({});
  for (const context of ['owner', 'admin'] as const) {
    for (const item of complete.items) {
      const oneMissing = { ...complete, items: complete.items.map(candidate => ({ ...candidate, completed: candidate.id !== item.id })) };
      const statuses = completionSectionStatus(oneMissing, context);
      expect(statuses[completionEditSection(item.id, context)]).toBe('incomplete');
      expect(Object.values(statuses).filter(status => status === 'incomplete')).toHaveLength(1);
    }
  }
});
