/**
 * @jest-environment node
 */

import {
  generateUsernameSuggestions,
  isCanonicalUsername,
  isSystemUsername,
  validateUsername,
} from '@/lib/utils/username';
import {
  incompleteUsernameDestination,
  postVerificationPath,
} from '@/lib/signup/username-routing';
import { evaluateActiveUsernameRepair } from '@/lib/signup/active-username-repair';

describe('username policy', () => {
  it('rejects malformed, reserved, and system usernames', () => {
    expect(validateUsername('PaulBerry-MirikaMedia').ok).toBe(false);
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('admin')).toMatchObject({ ok: false, issue: 'reserved' });
    expect(validateUsername('temp_abc123')).toMatchObject({ ok: false, issue: 'system' });
    expect(validateUsername('expired_old_name')).toMatchObject({ ok: false, issue: 'system' });
    expect(isSystemUsername('Temp_Account')).toBe(true);
    expect(isCanonicalUsername('temp_abc123')).toBe(false);
  });

  it('accepts a canonical username and keeps hyphens out of suggestions', () => {
    expect(validateUsername('PaulBerry')).toEqual({ ok: true, username: 'PaulBerry' });
    expect(isCanonicalUsername('Studio_One')).toBe(true);

    const suggestions = generateUsernameSuggestions('PaulBerry-MirikaMedia');
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(suggestion.includes('-')).toBe(false);
      expect(isCanonicalUsername(suggestion)).toBe(true);
    }
  });

  it('does not send an incomplete username to membership after verification', () => {
    const destination = postVerificationPath(
      {
        id: 'user-1',
        email: 'owner@example.com',
        display_name: 'PaulBerry-MirikaMedia',
        username: 'temp_user123',
        status: 'PENDING',
      },
      { redirect: '/dashboard', verified: true }
    );

    expect(destination.startsWith('/auth/username-selection?')).toBe(true);
    expect(destination).toContain('email=owner%40example.com');
    expect(destination).not.toContain('/auth/membership');
  });

  it('sends a verified canonical username to membership', () => {
    const destination = postVerificationPath({
      id: 'user-1',
      email: 'owner@example.com',
      display_name: 'Paul Berry',
      username: 'PaulBerry',
      status: 'PENDING',
    }, { verified: true });

    expect(destination.startsWith('/auth/membership?')).toBe(true);
    expect(destination).toContain('username=PaulBerry');
  });

  it('routes an active placeholder to sign-in so the dashboard repair can run', () => {
    expect(incompleteUsernameDestination({
      email: 'owner@example.com',
      display_name: 'Paul',
      username: 'temp_user123',
      status: 'ACTIVE',
    })).toBe('/auth/signin?callbackUrl=%2Fdashboard');
  });

  it('blocks active repair when unauthorized, mismatched, or already named', () => {
    expect(evaluateActiveUsernameRepair({
      sessionUserId: null,
      account: null,
      proposedUsername: 'PaulBerry',
    })).toMatchObject({ ok: false, status: 401 });

    expect(evaluateActiveUsernameRepair({
      sessionUserId: 'user-1',
      requestedUserId: 'user-2',
      account: { id: 'user-1', status: 'ACTIVE', username: 'temp_user123' },
      proposedUsername: 'PaulBerry',
    })).toMatchObject({ ok: false, status: 403 });

    expect(evaluateActiveUsernameRepair({
      sessionUserId: 'user-1',
      account: { id: 'user-1', status: 'ACTIVE', username: 'PaulBerry' },
      proposedUsername: 'OtherName',
    })).toMatchObject({ ok: false, status: 409 });

    expect(evaluateActiveUsernameRepair({
      sessionUserId: 'user-1',
      account: { id: 'user-1', status: 'ACTIVE', username: 'temp_user123' },
      proposedUsername: 'temp_other',
    })).toMatchObject({ ok: false, status: 400 });

    expect(evaluateActiveUsernameRepair({
      sessionUserId: 'user-1',
      account: { id: 'user-1', status: 'ACTIVE', username: 'temp_user123' },
      proposedUsername: 'PaulBerry',
    })).toEqual({ ok: true, username: 'PaulBerry' });
  });
});
