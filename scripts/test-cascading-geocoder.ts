import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { extractCity } from '../src/lib/utils/address';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();
const MAPBOX_TOKEN = process.env.MAPBOX_API_KEY || process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

async function geocodeWithMapbox(address: string): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;
    const feature = data.features[0];
    if (feature.place_type?.includes('place')) return feature.text || null;
    const cityContext = feature.context?.find((c: any) => c.id?.startsWith('place.'));
    return cityContext?.text || null;
  } catch {
    return null;
  }
}

async function geocodeWithNominatim(address: string): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VoiceoverStudioFinder/1.0' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length === 0 || !data[0].address) return null;
    const addr = data[0].address;
    return addr.city || addr.town || addr.village || addr.municipality || null;
  } catch {
    return null;
  }
}

async function test() {
  console.log('🧪 Testing Cascading Geocoder (10 UK studios)\n');
  console.log(MAPBOX_TOKEN ? '✅ Mapbox: Enabled\n' : '⚠️  Mapbox: Not configured\n');

  const studios = await prisma.studios.findMany({
    where: { full_address: { contains: 'UK' } },
    select: { name: true, full_address: true, city: true },
    take: 10,
  });

  const stats = { mapbox: 0, nominatim: 0, manual: 0, failed: 0 };

  for (const studio of studios) {
    if (!studio.full_address) continue;

    console.log(`${studio.name}`);
    console.log(`  Address: ${studio.full_address}`);
    console.log(`  Current: ${studio.city || '(none)'}`);

    let city = null;
    let method = '';

    if (MAPBOX_TOKEN) {
      city = await geocodeWithMapbox(studio.full_address);
      if (city) { method = 'Mapbox'; stats.mapbox++; }
    }

    if (!city) {
      city = await geocodeWithNominatim(studio.full_address);
      if (city) { method = 'Nominatim'; stats.nominatim++; }
    }

    if (!city) {
      city = extractCity(studio.full_address);
      if (city) { method = 'Manual'; stats.manual++; }
    }

    if (city) {
      console.log(`  ✅ Result: "${city}" (${method})`);
    } else {
      console.log(`  ❌ Failed to extract city`);
      stats.failed++;
    }
    console.log('');

    await new Promise(resolve => setTimeout(resolve, MAPBOX_TOKEN ? 100 : 1000));
  }

  console.log('📊 Results:');
  console.log(`  Mapbox: ${stats.mapbox}, Nominatim: ${stats.nominatim}, Manual: ${stats.manual}, Failed: ${stats.failed}\n`);

  await prisma.$disconnect();
}

test();

