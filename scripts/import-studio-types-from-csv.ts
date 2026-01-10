import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Mapping from CSV service names to database enum values
const serviceMapping: { [key: string]: string } = {
  'Home Studio': 'HOME',
  'Recording Studio': 'RECORDING',
  'Voiceover Coach': 'VO_COACH',
  'Editing Services': 'EDITING',
  'Podcast Studio': 'PODCAST',
  'Voiceover Artist': 'VOICEOVER',
};

async function importStudioTypes() {
  console.log('Starting studio types import from CSV...');

  // Read the CSV file
  const csvPath = path.join(process.cwd(), 'docs', 'profile_services.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const profileId = parts[0]?.trim();
    const username = parts[1]?.trim();
    const servicesStr = parts.slice(2).join(',').trim(); // In case there are commas in the services
    
    if (!profileId || !username) continue;

    // Parse services (separated by semicolons)
    const services = servicesStr
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Map services to studio types
    const studioTypes = services
      .map(service => serviceMapping[service])
      .filter(type => type !== undefined);

    if (studioTypes.length === 0) {
      console.log(`⚠️  Profile ${username} (ID: ${profileId}): No valid studio types found in services: ${servicesStr}`);
      continue;
    }

    try {
      // Find the user by username
      const user = await prisma.user.findUnique({
        where: { username: username },
        select: { id: true },
      });

      if (!user) {
        console.log(`❌ User not found: ${username} (CSV ID: ${profileId})`);
        notFoundCount++;
        continue;
      }

      // Find the studio owned by this user
      const studio = await prisma.studio.findFirst({
        where: { ownerId: user.id },
        select: { id: true },
      });

      if (!studio) {
        console.log(`⚠️  No studio found for user: ${username}`);
        notFoundCount++;
        continue;
      }

      // Delete existing studio types for this studio
      await prisma.studioStudioType.deleteMany({
        where: { studioId: studio.id },
      });

      // Create new studio types
      await prisma.studioStudioType.createMany({
        data: studioTypes.map(type => ({
          studioId: studio.id,
          studioType: type as any,
        })),
      });

      console.log(`✅ Updated ${username}: ${studioTypes.join(', ')}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error processing ${username}:`, error);
      errorCount++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⚠️  Not found: ${notFoundCount}`);
  console.log(`📊 Total processed: ${dataLines.length}`);
}

importStudioTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

