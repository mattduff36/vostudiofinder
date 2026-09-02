/**
 * Regression tests for the NextAuth v4 options contract.
 * @jest-environment node
 *
 * Does not call OAuth providers, send mail, or use DATABASE_URL / TEST_DATABASE_URL.
 */

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
  it('configures credentials and three OAuth providers without an email provider', () => {
    expect(providerIds().sort()).toEqual(['credentials', 'facebook', 'google', 'twitter']);
    expect(
      (authOptions.providers as ProviderLike[]).some(
        (provider) => provider.id === 'email' || provider.type === 'email'
      )
    ).toBe(false);
    expect(authOptions.adapter).toBeDefined();
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
});
