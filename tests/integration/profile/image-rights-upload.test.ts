/**
 * Integration Tests for Image Rights Confirmation on Upload
 *
 * Tests POST /api/user/profile/images:
 * - Rejects uploads when image_rights_confirmed is missing
 * - Accepts uploads when image_rights_confirmed is present
 * - Persists confirmation audit fields on studio_profiles
 *
 * @jest-environment node
 */

// Polyfill Request/Response before mocking Next.js modules
if (typeof globalThis.Request === 'undefined') {
  const { Request, Response, Headers } = require('undici');
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
}

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the route handler
// ---------------------------------------------------------------------------

const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {
    adapter: {},
    providers: [],
  },
}));

// Mock Cloudinary to avoid real uploads
jest.mock('@/lib/cloudinary', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/image/upload/v1/studios/test/image.jpg',
    public_id: 'studios/test/image',
    width: 2000,
    height: 960,
  }),
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));

// Mock membership — allow uploads by returning generous limits
jest.mock('@/lib/membership', () => ({
  getUserTierLimits: jest.fn().mockResolvedValue({
    imagesMax: 10,
    aboutMaxChars: 2000,
    socialLinksMax: null,
    connectionsMax: 12,
    customConnectionsMax: 5,
    studioTypesMax: null,
    studioTypesExcluded: [],
    phoneVisibility: true,
    directionsVisibility: true,
    advancedSettings: true,
  }),
  getUserTier: jest.fn().mockResolvedValue('PREMIUM'),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/user/profile/images/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { IMAGE_RIGHTS_CONFIRMATION_TEXT } from '@/lib/legal/image-rights';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid multipart request for the upload route */
function buildUploadRequest(options: {
  includeRightsConfirmation?: boolean;
  ip?: string;
}): NextRequest {
  const { includeRightsConfirmation = false, ip } = options;

  // Create a tiny 1x1 red PNG (68 bytes)
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const file = new File([pngBuffer], 'test.png', { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', file);
  if (includeRightsConfirmation) {
    formData.append('image_rights_confirmed', 'true');
  }

  const headers: Record<string, string> = {};
  if (ip) {
    headers['x-forwarded-for'] = ip;
  }

  return new NextRequest('http://localhost:4000/api/user/profile/images', {
    method: 'POST',
    body: formData,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /api/user/profile/images — image rights confirmation', () => {
  const testPrefix = `img_rights_test_${Date.now()}`;
  let testUserId: string;
  let testStudioId: string;

  beforeAll(async () => {
    // Create test user
    testUserId = randomBytes(12).toString('base64url');
    const email = `${testPrefix}@example.com`;

    await db.users.create({
      data: {
        id: testUserId,
        email,
        username: `imgtest_${Date.now()}`,
        display_name: 'Image Rights Test User',
        password: 'test-password',
        status: 'ACTIVE',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create test studio profile
    testStudioId = randomBytes(12).toString('base64url');
    await db.studio_profiles.create({
      data: {
        id: testStudioId,
        user_id: testUserId,
        name: 'Test Studio',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.studio_images.deleteMany({ where: { studio_id: testStudioId } });
    await db.studio_profiles.deleteMany({ where: { id: testStudioId } });
    await db.users.deleteMany({ where: { id: testUserId } });
    await db.$disconnect();
  });

  beforeEach(() => {
    // Reset session mock to return a valid user
    mockGetServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: `${testPrefix}@example.com`,
        role: 'USER',
      },
    });
  });

  it('should return 400 when image_rights_confirmed is missing', async () => {
    const request = buildUploadRequest({ includeRightsConfirmation: false });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/confirm.*rights/i);
  });

  it('should return 201 and persist confirmation when image_rights_confirmed is present', async () => {
    const testIp = '203.0.113.42';
    const request = buildUploadRequest({ includeRightsConfirmation: true, ip: testIp });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('image_url');

    // Verify the image was actually created in the DB
    const imageRow = await db.studio_images.findFirst({
      where: { studio_id: testStudioId },
      orderBy: { sort_order: 'desc' },
    });
    expect(imageRow).toBeTruthy();

    // Verify the confirmation audit fields were written to studio_profiles
    const studioRow = await db.studio_profiles.findUnique({
      where: { id: testStudioId },
      select: {
        image_rights_confirmed_at: true,
        image_rights_confirmed_text: true,
        image_rights_confirmed_ip: true,
      },
    });

    expect(studioRow).toBeTruthy();
    expect(studioRow!.image_rights_confirmed_at).toBeInstanceOf(Date);
    expect(studioRow!.image_rights_confirmed_text).toBe(IMAGE_RIGHTS_CONFIRMATION_TEXT);
    expect(studioRow!.image_rights_confirmed_ip).toBe(testIp);
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = buildUploadRequest({ includeRightsConfirmation: true });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
