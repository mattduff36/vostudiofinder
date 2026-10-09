/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

describe('create-membership-checkout username gate', () => {
  const findUnique = jest.fn();
  const sessionCreate = jest.fn();
  let POST: (request: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit_not_real';
    process.env.STRIPE_MEMBERSHIP_PRICE_ID_30_ONE_TIME = 'price_unit';
    jest.resetModules();
    jest.doMock('@/lib/db', () => ({
      db: { users: { findUnique } },
    }));
    jest.doMock('stripe', () => jest.fn().mockImplementation(() => ({
      checkout: { sessions: { create: sessionCreate } },
    })));
    jest.doMock('@/lib/seo/site', () => ({ getBaseUrl: () => 'http://localhost:4000' }));
    jest.doMock('@/lib/error-logging', () => ({ handleApiError: jest.fn() }));
    const route = await import('@/app/api/stripe/create-membership-checkout/route');
    POST = route.POST;
  });

  beforeEach(() => {
    findUnique.mockReset();
    sessionCreate.mockReset();
    sessionCreate.mockResolvedValue({ id: 'cs_test', client_secret: 'secret_test' });
  });

  function checkoutRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/stripe/create-membership-checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('refuses a new checkout when the saved username is still temp_', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      display_name: 'PaulBerry-MirikaMedia',
      username: 'temp_abc123',
      email_verified: true,
    });

    const response = await POST(checkoutRequest({
      email: 'owner@example.com',
      name: 'PaulBerry-MirikaMedia',
      username: 'PaulBerry',
      userId: 'user-1',
    }));

    expect(response.status).toBe(400);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('uses the persisted canonical username and ignores the client value', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      display_name: 'PaulBerry-MirikaMedia',
      username: 'PaulBerry',
      email_verified: true,
    });

    const response = await POST(checkoutRequest({
      email: 'owner@example.com',
      name: 'Spoofed Name',
      username: 'temp_client',
      userId: 'user-1',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clientSecret).toBe('secret_test');
    expect(sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer_email: 'owner@example.com',
      metadata: expect.objectContaining({
        user_username: 'PaulBerry',
        user_name: 'PaulBerry-MirikaMedia',
        user_email: 'owner@example.com',
      }),
    }));
  });
});
