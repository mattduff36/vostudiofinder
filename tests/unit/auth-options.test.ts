/**
 * Regression tests for the NextAuth v4 options contract.
 * @jest-environment node
 *
 * Does not call OAuth providers, send mail, or use DATABASE_URL / TEST_DATABASE_URL.
 */

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    users: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { authOptions } from '@/lib/auth';

type ProviderLike = {
  id?: string;
  type?: string;
  name?: string;
  credentials?: Record<string, { label?: string; type?: string }>;
  authorize?: (credentials: Record<string, string> | undefined) => Promise<unknown>;
  options?: {
    authorize?: (credentials: Record<string, string> | undefined) => Promise<unknown>;
    credentials?: Record<string, { label?: string; type?: string }>;
  };
};

function providerIds(): string[] {
  return (authOptions.providers as ProviderLike[]).map((provider) => String(provider.id));
}

function credentialsProvider(): ProviderLike {
  const provider = (authOptions.providers as ProviderLike[]).find(
    (item) => item.id === 'credentials'
  );
  if (!provider) {
    throw new Error('credentials provider is not configured');
  }
  return provider;
}

describe('NextAuth v4 options contract', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset();
  });

  it('configures credentials and three OAuth providers without an email provider', () => {
    expect(providerIds().sort()).toEqual(['credentials', 'facebook', 'google', 'twitter']);
    expect(
      (authOptions.providers as ProviderLike[]).some(
        (provider) => provider.id === 'email' || provider.type === 'email'
      )
    ).toBe(false);
    expect(authOptions.adapter).toBeDefined();
    expect(typeof (authOptions.adapter as { createUser?: unknown }).createUser).toBe(
      'function'
    );
    expect(authOptions.session).toEqual({ strategy: 'jwt' });
    expect(authOptions.pages).toEqual({
      signIn: '/auth/signin',
      error: '/auth/error',
      verifyRequest: '/auth/verify-request',
      newUser: '/dashboard',
    });
    expect(typeof authOptions.events?.signIn).toBe('function');
    expect(typeof authOptions.events?.signOut).toBe('function');
    expect(typeof authOptions.events?.createUser).toBe('function');
  });

  it('redirects the site origin to dashboard and keeps same-origin callback URLs', async () => {
    const redirect = authOptions.callbacks?.redirect;
    expect(redirect).toBeDefined();
    const baseUrl = 'https://voiceoverstudiofinder.com';

    await expect(redirect!({ url: baseUrl, baseUrl })).resolves.toBe(
      `${baseUrl}/dashboard`
    );
    await expect(redirect!({ url: '/admin/payments', baseUrl })).resolves.toBe(
      `${baseUrl}/admin/payments`
    );
    await expect(
      redirect!({ url: `${baseUrl}/dashboard`, baseUrl })
    ).resolves.toBe(`${baseUrl}/dashboard`);
    await expect(
      redirect!({ url: 'https://evil.example/phish', baseUrl })
    ).resolves.toBe(baseUrl);
  });

  it('copies role and profile fields onto the JWT and session', async () => {
    const jwt = authOptions.callbacks?.jwt;
    const sessionCb = authOptions.callbacks?.session;
    expect(jwt).toBeDefined();
    expect(sessionCb).toBeDefined();

    const token = await jwt!({
      token: { email: 'alice@example.com' },
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        username: 'alice',
        display_name: 'Alice Example',
        role: 'ADMIN',
        avatar_url: '/avatar.png',
        email_verified: true,
      },
    } as never);

    expect(token).toMatchObject({
      email: 'alice@example.com',
      role: 'ADMIN',
      username: 'alice',
      display_name: 'Alice Example',
      avatar_url: '/avatar.png',
      email_verified: true,
    });

    const session = await sessionCb!({
      session: { user: {} },
      token: { ...token, sub: 'user-1' },
    } as never);

    expect(session.user).toMatchObject({
      id: 'user-1',
      email: 'alice@example.com',
      role: 'ADMIN',
      username: 'alice',
      display_name: 'Alice Example',
      avatar_url: '/avatar.png',
      email_verified: true,
    });
  });

  it('allows both credentials and OAuth sign-in callbacks', async () => {
    const signIn = authOptions.callbacks?.signIn;
    expect(signIn).toBeDefined();
    await expect(
      signIn!({
        user: { email: 'alice@example.com' },
        account: { provider: 'credentials' },
      } as never)
    ).resolves.toBe(true);
    await expect(
      signIn!({
        user: { email: 'alice@example.com' },
        account: { provider: 'google' },
      } as never)
    ).resolves.toBe(true);
  });

  it('wires credentials authorize without an email provider path', () => {
    const provider = credentialsProvider();
    expect(provider.id).toBe('credentials');
    expect(provider.type).toBe('credentials');
    expect(typeof provider.authorize).toBe('function');
  });

  it('normalizes OAuth createUser emails without sending mail', async () => {
    const adapter = authOptions.adapter as {
      createUser: (data: {
        email?: string;
        name?: string;
        image?: string;
        email_verified?: Date | null;
      }) => Promise<unknown>;
    };
    mockCreate.mockImplementation(async ({ data }: { data: unknown }) => data);

    const created = await adapter.createUser({
      email: '  Alex.OAuth@Example.COM ',
      name: 'Alex',
      image: 'https://example.com/a.png',
      email_verified: new Date('2026-01-01'),
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(created).toEqual(
      expect.objectContaining({
        email: 'alex.oauth@example.com',
        display_name: 'Alex',
        avatar_url: 'https://example.com/a.png',
        email_verified: true,
        role: 'USER',
        password: '',
      })
    );
  });

  it('syncs OAuth profile fields onto an existing user through the jwt callback', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-9',
      avatar_url: null,
      display_name: 'Old Name',
    });
    mockUpdate.mockResolvedValue({ id: 'user-9' });

    const token = await authOptions.callbacks!.jwt!({
      token: { email: 'linked@example.com', sub: 'user-9' },
      user: undefined,
      account: { provider: 'google', type: 'oauth', providerAccountId: 'g-9' },
      profile: { name: 'New Name', image: 'https://example.com/new.png' },
    } as never);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'linked@example.com' },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-9' },
      data: {
        avatar_url: 'https://example.com/new.png',
        display_name: 'New Name',
        email_verified: true,
      },
    });
    expect(token.email).toBe('linked@example.com');
  });
});
