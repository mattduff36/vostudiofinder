import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns coarse user location from Vercel IP geolocation headers.
 * These headers are automatically set by Vercel on deployed environments.
 * Returns null values in local dev where headers are unavailable.
 */
export async function GET(request: NextRequest) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  const longitude = request.headers.get('x-vercel-ip-longitude');
  const city = request.headers.get('x-vercel-ip-city');
  const region = request.headers.get('x-vercel-ip-country-region');
  const country = request.headers.get('x-vercel-ip-country');

  const hasCoordinates = latitude && longitude;

  return NextResponse.json({
    lat: hasCoordinates ? parseFloat(latitude) : null,
    lng: hasCoordinates ? parseFloat(longitude) : null,
    city: city ? decodeURIComponent(city) : null,
    region: region ?? null,
    country: country ?? null,
    source: hasCoordinates ? 'ip' : null,
  });
}
