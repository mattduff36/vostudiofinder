const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const images = ['Image1.png', 'Image2.png', 'Image3.png', 'Image4.png'];

async function compressImage(filename) {
  const inputPath = path.join('public', filename);
  const outputPath = path.join('public', `${filename}.tmp`);
  
  console.log(`Compressing ${filename}...`);
  
  await sharp(inputPath)
    .resize(1200, 800, { // Resize to reasonable web dimensions
      fit: 'cover',
      position: 'center'
    })
    .png({
      quality: 80,
      compressionLevel: 9
    })
    .toFile(outputPath);
  
  // Replace original with compressed version
  fs.renameSync(outputPath, inputPath);
  
  const stats = fs.statSync(inputPath);
  console.log(`✓ ${filename} compressed to ${(stats.size / 1024).toFixed(0)}KB`);
}

async function main() {
  for (const image of images) {
    await compressImage(image);
  }
  console.log('\nAll images compressed successfully!');
}

main().catch(console.error);









