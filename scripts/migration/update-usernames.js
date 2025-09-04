require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapping from current display names to correct usernames from old site
const usernameMap = {
  'VoiceoverGuy': 'VoiceoverGuy',
  'Mike Cooper': 'MikeCooper',
  'S2Blue': 'S2Blue',
  'GetCarter': 'GetCarter',
  'AudioTake': 'AudioTake',
  'BKP Media Group': 'Bkpmediagroup',
  'A1Vox': 'A1Vox',
  'RadioJingles': 'RadioJingles',
  'CanongateStudios': 'CanongateStudios',
  'VoiceoverKickstart': 'VoiceoverKickstart',
  'STLAudio': 'STLAudio',
  'LittleMonsterMedia': 'LittleMonsterMedia',
  'Stevie Cripps': 'StevieCripps',
  'SixtySixSound': 'SixtySixSound',
  'wrightcommunicators': 'wrightcommunicators',
  'Voiceoverben': 'Voiceoverben',
  'joewakeford': 'joewakeford',
  'Cromerty': 'Cromerty',
  'phantomcitystudio': 'phantomcitystudio',
  'millerthevoice': 'millerthevoice',
  'voicesuk': 'voicesuk',
  'voicesus': 'voicesus',
  'DarrenAltman': 'DarrenAltman',
  'mapleststudios': 'mapleststudios',
  'leeglasby': 'leeglasby',
  'CMRstudio': 'CMRstudio',
  'DiBritanniaVO': 'DiBritanniaVO',
  'The Surround Mix Group': 'Shake', // This is the key one mentioned by the user
};

async function updateUsernames() {
  console.log('Starting username update...');
  
  try {
    // Get all users with studios
    const users = await prisma.user.findMany({
      where: {
        studios: {
          some: {}
        }
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        studios: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users with studios`);

    for (const user of users) {
      const correctUsername = usernameMap[user.displayName];
      
      if (correctUsername && correctUsername !== user.username) {
        console.log(`Updating ${user.displayName}: "${user.username}" -> "${correctUsername}"`);
        
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { username: correctUsername }
          });
          console.log(`✓ Updated ${user.displayName}`);
        } catch (error) {
          console.error(`✗ Failed to update ${user.displayName}:`, error.message);
        }
      } else if (correctUsername) {
        console.log(`✓ ${user.displayName} already has correct username: ${user.username}`);
      } else {
        console.log(`? No mapping found for: ${user.displayName} (current: ${user.username})`);
      }
    }

    console.log('\nUsername update completed!');
    
    // Show final state
    const updatedUsers = await prisma.user.findMany({
      where: {
        studios: {
          some: {}
        }
      },
      select: {
        username: true,
        displayName: true,
        studios: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\nFinal username state:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.displayName} (${user.username}): ${user.studios.map(s => s.name).join(', ')}`);
    });

  } catch (error) {
    console.error('Error updating usernames:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUsernames();
