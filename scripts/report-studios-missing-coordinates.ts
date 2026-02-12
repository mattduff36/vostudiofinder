import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

interface StudioRow {
  id: string;
  name: string;
  status: string;
  is_profile_visible: boolean;
  full_address: string | null;
  abbreviated_address: string | null;
  city: string | null;
  location: string | null;
  latitude: unknown;
  longitude: unknown;
  users: {
    username: string | null;
    display_name: string | null;
  } | null;
}

function isMissingCoordinate(value: unknown): boolean {
  return value === null || value === undefined;
}

function hasNonEmptyText(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

function buildLocationLabel(studio: StudioRow): string {
  if (hasNonEmptyText(studio.city)) return `city=${JSON.stringify(studio.city)}`;
  if (hasNonEmptyText(studio.location)) return `location=${JSON.stringify(studio.location)}`;
  if (hasNonEmptyText(studio.abbreviated_address)) return `abbrev=${JSON.stringify(studio.abbreviated_address)}`;
  if (hasNonEmptyText(studio.full_address)) return `full=${JSON.stringify(studio.full_address)}`;
  return 'no-location-text';
}

function buildDisplayName(studio: StudioRow): string {
  const username = studio.users?.username ? `@${studio.users.username}` : null;
  const fallback = studio.users?.display_name?.trim() || null;
  const suffix = username || fallback ? ` (${username ?? fallback})` : '';
  return `${studio.name}${suffix}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];

if (!envArg || !['dev', 'production'].includes(envArg)) {
  console.error('❌ ERROR: Please specify environment with --env=dev or --env=production');
  console.error('\nUsage:');
  console.error('  npx tsx scripts/report-studios-missing-coordinates.ts --env=dev');
  console.error('  npx tsx scripts/report-studios-missing-coordinates.ts --env=production');
  process.exit(1);
}

const envFile = envArg === 'production' ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const studios = (await prisma.studio_profiles.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      is_profile_visible: true,
      full_address: true,
      abbreviated_address: true,
      city: true,
      location: true,
      latitude: true,
      longitude: true,
      users: {
        select: {
          username: true,
          display_name: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })) as unknown as StudioRow[];

  const missingCoords = studios.filter(
    (s) => isMissingCoordinate(s.latitude) || isMissingCoordinate(s.longitude),
  );

  const hasLocationText = missingCoords.filter(
    (s) =>
      hasNonEmptyText(s.full_address) ||
      hasNonEmptyText(s.abbreviated_address) ||
      hasNonEmptyText(s.city) ||
      hasNonEmptyText(s.location),
  );

  const noLocationText = missingCoords.filter(
    (s) =>
      !hasNonEmptyText(s.full_address) &&
      !hasNonEmptyText(s.abbreviated_address) &&
      !hasNonEmptyText(s.city) &&
      !hasNonEmptyText(s.location),
  );

  const activeVisibleMissingCoords = missingCoords.filter(
    (s) => s.status === 'ACTIVE' && s.is_profile_visible === true,
  );

  console.log(`# Studios missing coordinates (${envArg})`);
  console.log('');
  console.log(`- Total missing coords: ${missingCoords.length}`);
  console.log(`- ACTIVE + visible (subset): ${activeVisibleMissingCoords.length}`);
  console.log(`- Missing coords but HAS address/region text: ${hasLocationText.length}`);
  console.log(`- Missing coords and has NO address/region text: ${noLocationText.length}`);
  console.log('');

  console.log(`## Missing coords but HAS address/region text (${hasLocationText.length})`);
  if (hasLocationText.length === 0) console.log('- (none)');
  for (const s of hasLocationText) {
    console.log(
      `- ${buildDisplayName(s)} — status=${s.status}, visible=${s.is_profile_visible} — ${buildLocationLabel(s)}`,
    );
  }
  console.log('');

  console.log(`## Missing coords and has NO address/region text (${noLocationText.length})`);
  if (noLocationText.length === 0) console.log('- (none)');
  for (const s of noLocationText) {
    console.log(
      `- ${buildDisplayName(s)} — status=${s.status}, visible=${s.is_profile_visible} — ${buildLocationLabel(s)}`,
    );
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

