import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWakefield() {
  console.log('🔍 Searching for studios near Wakefield, UK...\n');
  
  // Wakefield coordinates (approximate)
  const wakefieldLat = 53.6833;
  const wakefieldLng = -1.4989;
  const radiusMiles = 10;
  
  // Convert miles to degrees (rough approximation: 1 degree ≈ 69 miles)
  const radiusDegrees = radiusMiles / 69;
  
  const studios = await prisma.studios.findMany({
    where: {
      OR: [
        {
          address: {
            contains: 'Wakefield',
            mode: 'insensitive'
          }
        },
        {
          AND: [
            {
              latitude: {
                gte: wakefieldLat - radiusDegrees,
                lte: wakefieldLat + radiusDegrees
              }
            },
            {
              longitude: {
                gte: wakefieldLng - radiusDegrees,
                lte: wakefieldLng + radiusDegrees
              }
            }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      users: {
        select: {
          username: true
        }
      }
    },
    take: 20
  });
  
  console.log(`Found ${studios.length} studios:\n`);
  
  const withCoords = studios.filter(s => s.latitude && s.longitude);
  const withoutCoords = studios.filter(s => !s.latitude || !s.longitude);
  
  studios.forEach((studio, i) => {
    const hasCoords = studio.latitude && studio.longitude;
    const icon = hasCoords ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${studio.name}`);
    console.log(`   Username: /${studio.users?.username}`);
    console.log(`   Address: ${studio.address || 'N/A'}`);
    console.log(`   Coordinates: ${studio.latitude ? studio.latitude.toString() : 'NULL'}, ${studio.longitude ? studio.longitude.toString() : 'NULL'}`);
    console.log('');
  });
  
  console.log(`📊 Summary: ${withCoords.length} with coordinates, ${withoutCoords.length} without coordinates`);
  
  await prisma.$disconnect();
}

checkWakefield().catch(console.error);

