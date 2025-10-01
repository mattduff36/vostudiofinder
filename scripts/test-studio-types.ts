#!/usr/bin/env tsx

/**
 * Test script to verify the studio types migration works correctly
 */

import { PrismaClient, StudioType } from '@prisma/client';

const prisma = new PrismaClient();

async function testStudioTypes() {
  console.log('Testing studio types functionality...');

  try {
    // Test 1: Get a real user ID first
    console.log('\n1. Getting a real user ID...');
    const existingUser = await prisma.user.findFirst({
      select: { id: true, username: true }
    });

    if (!existingUser) {
      throw new Error('No users found in database. Cannot run test.');
    }

    console.log(`Using user: ${existingUser.username} (${existingUser.id})`);

    // Test 2: Create a studio with multiple types
    console.log('\n2. Creating a studio with multiple types...');
    const testStudio = await prisma.studio.create({
      data: {
        ownerId: existingUser.id,
        name: 'Test Multi-Type Studio',
        description: 'A test studio with multiple types',
        address: '123 Test Street',
        status: 'ACTIVE',
        studioTypes: {
          create: [
            { studioType: StudioType.VOICEOVER },
            { studioType: StudioType.RECORDING },
            { studioType: StudioType.PODCAST }
          ]
        }
      },
      include: {
        studioTypes: true
      }
    });

    console.log('✅ Studio created with types:', testStudio.studioTypes.map(t => t.studioType));

    // Test 3: Query studios by multiple types
    console.log('\n3. Querying studios by multiple types...');
    const studiosWithTypes = await prisma.studio.findMany({
      where: {
        studioTypes: {
          some: {
            studioType: {
              in: [StudioType.VOICEOVER, StudioType.RECORDING]
            }
          }
        }
      },
      include: {
        studioTypes: true
      }
    });

    console.log(`✅ Found ${studiosWithTypes.length} studios with VOICEOVER or RECORDING types`);

    // Test 4: Update studio types
    console.log('\n4. Updating studio types...');
    const updatedStudio = await prisma.studio.update({
      where: { id: testStudio.id },
      data: {
        studioTypes: {
          deleteMany: {},
          create: [
            { studioType: StudioType.PODCAST },
            { studioType: StudioType.RECORDING }
          ]
        }
      },
      include: {
        studioTypes: true
      }
    });

    console.log('✅ Studio updated with new types:', updatedStudio.studioTypes.map(t => t.studioType));

    // Clean up
    console.log('\n5. Cleaning up test data...');
    await prisma.studio.delete({
      where: { id: testStudio.id }
    });

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Studio types functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testStudioTypes()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });

