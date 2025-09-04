require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function cleanDescription(description) {
  if (!description) return description;
  
  return description
    // Remove escaped newlines and carriage returns
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    // Decode HTML entities
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

async function cleanAllDescriptions() {
  try {
    console.log('🧹 Starting description cleanup...');
    
    // Get all studios with descriptions
    const studios = await prisma.studio.findMany({
      where: {
        description: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    console.log(`📋 Found ${studios.length} studios with descriptions`);

    let cleanedCount = 0;

    for (const studio of studios) {
      const originalDescription = studio.description;
      const cleanedDescription = cleanDescription(originalDescription);
      
      // Only update if the description actually changed
      if (originalDescription !== cleanedDescription) {
        await prisma.studio.update({
          where: { id: studio.id },
          data: { description: cleanedDescription }
        });
        
        cleanedCount++;
        console.log(`✅ Cleaned: ${studio.name}`);
        console.log(`   Before: ${originalDescription.substring(0, 100)}...`);
        console.log(`   After:  ${cleanedDescription.substring(0, 100)}...`);
        console.log('');
      }
    }

    console.log(`🎉 Cleanup complete! Updated ${cleanedCount} out of ${studios.length} studio descriptions.`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error cleaning descriptions:', error);
    process.exit(1);
  }
}

cleanAllDescriptions();
